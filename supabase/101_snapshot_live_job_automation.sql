-- ============================================================
-- 101_snapshot_live_job_automation.sql
--
-- EXACT COPY of four functions as they exist in the live Supabase
-- project on 2026-10-03, exported with pg_get_functiondef. They were
-- created/edited directly in the Supabase dashboard (the GHL ->
-- Zapier -> Ops Hub job automation, Oct 2), so until now the repo had
-- no copy of them -- or, for set_job_stage_by_contact, an older one
-- (94_job_pipeline_stage_always_sync.sql) that no longer matches.
--
-- Running this file changes nothing: it re-creates the same functions
-- with the same bodies. It exists so the automation can be rebuilt and
-- so later fixes have a reviewed baseline. Known problems in these
-- live versions are documented, NOT fixed, here -- see the notes at
-- each function and 102_* for the fixes once approved.
--
-- Not included because they weren't exported yet:
--   * public._norm_phone(text) -- phone-normalising helper used by
--     both job functions; must exist before this file runs.
--   * the trigger that calls notify_job_created() (which table/event).
--   * the ghl_* columns on jobs / leads.
-- ============================================================


-- ------------------------------------------------------------
-- create_or_update_job_from_accepted_estimate
-- Called by the Zap on GHL "Pipeline Stage Changed" -> accepted.
-- Created SLX-170 (Stephanie Madriz) and SLX-171 (Walter Chapman).
--
-- KNOWN ISSUES (live behaviour, unchanged here):
--  1. SECURITY DEFINER and EXECUTE is granted to PUBLIC by default, so
--     anyone with the publishable key (visible in index.html) can call
--     it without logging in. Verified 2026-10-03: an anonymous call
--     with no name returned 'error: name is required'.
--  2. Lead link bug: when p_ghl_contact_id is blank, `IF NOT FOUND`
--     reads the FOUND flag left by the jobs INSERT/UPDATE above (true),
--     so the email/phone/name fallback never runs -- yet the function
--     still returns '... lead linked to SLX-…'. This is why Stephanie
--     Madriz's lead (Won, 2026-09-30) has no job_id.
--  3. Name-only matching: a client is matched on name alone when phone
--     and email don't match, and that client's phone/email/name are
--     then OVERWRITTEN; leads are also matched on name alone. Both go
--     against CLAUDE.md Phase 2A rule 1.
--  4. An existing job is reused only if it is in 'Designs Sold'. A
--     second call for the same estimate (Zap retry, stage moved away
--     and back) finds no 'Designs Sold' job and creates a DUPLICATE
--     job. ghl_opportunity_id would prevent this but isn't checked
--     (and the Zap currently doesn't send it: SLX-170/171 have none).
--  5. p_stage is accepted but ignored (always Ready For Scheduling).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_job_from_accepted_estimate(p_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_job_type text DEFAULT NULL::text, p_amount numeric DEFAULT NULL::numeric, p_stage text DEFAULT 'Ready for Scheduling'::text, p_sold_date date DEFAULT CURRENT_DATE, p_ghl_opportunity_id text DEFAULT NULL::text, p_ghl_contact_id text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_job_id text;
  v_existing_job_id text;
  v_name text := NULLIF(BTRIM(p_name), '');
  v_email text := NULLIF(LOWER(BTRIM(p_email)), '');
  v_phone text := NULLIF(BTRIM(p_phone), '');
BEGIN
  IF v_name IS NULL THEN
    RETURN 'error: name is required';
  END IF;

  IF public._norm_phone(v_phone) IS NOT NULL THEN
    SELECT c.client_id INTO v_client_id
    FROM public.clients c
    WHERE public._norm_phone(c.phone) = public._norm_phone(v_phone)
      AND COALESCE(c.active, true) = true
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL AND v_email IS NOT NULL THEN
    SELECT c.client_id INTO v_client_id
    FROM public.clients c
    WHERE LOWER(BTRIM(c.email)) = v_email
      AND COALESCE(c.active, true) = true
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    SELECT c.client_id INTO v_client_id
    FROM public.clients c
    WHERE LOWER(REGEXP_REPLACE(BTRIM(c.name), '\s+', ' ', 'g'))
        = LOWER(REGEXP_REPLACE(v_name, '\s+', ' ', 'g'))
      AND COALESCE(c.active, true) = true
    ORDER BY c.created_at DESC
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (name, phone, email, address, first_job_date)
    VALUES (v_name, v_phone, v_email, NULLIF(BTRIM(p_address), ''), p_sold_date)
    RETURNING client_id INTO v_client_id;
  ELSE
    UPDATE public.clients
    SET name = COALESCE(v_name, name),
        phone = COALESCE(v_phone, phone),
        email = COALESCE(v_email, email),
        address = COALESCE(NULLIF(BTRIM(p_address), ''), address),
        updated_at = now()
    WHERE client_id = v_client_id;
  END IF;

  SELECT j.job_id INTO v_existing_job_id
  FROM public.jobs j
  WHERE j.client_id = v_client_id
    AND j.stage = 'Designs Sold'::public.job_stage
    AND COALESCE(j.retired, false) = false
  ORDER BY j.created_at DESC
  LIMIT 1;

  IF v_existing_job_id IS NOT NULL THEN
    UPDATE public.jobs
    SET client_name = v_name,
        address_city = COALESCE(NULLIF(BTRIM(p_address), ''), address_city),
        job_type = COALESCE(NULLIF(BTRIM(p_job_type), ''), job_type),
        contract_price = COALESCE(p_amount, contract_price),
        sold_date = COALESCE(p_sold_date, sold_date),
        stage = 'Ready For Scheduling'::public.job_stage,
        ghl_opportunity_id = COALESCE(NULLIF(BTRIM(p_ghl_opportunity_id), ''), ghl_opportunity_id),
        updated_at = now()
    WHERE job_id = v_existing_job_id;

    v_job_id := v_existing_job_id;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('salexx_jobs_job_id'));

    SELECT 'SLX-' || (
      COALESCE(MAX((substring(job_id FROM '[0-9]+$'))::int), 0) + 1
    )::text
    INTO v_job_id
    FROM public.jobs
    WHERE job_id ~ '^SLX-[0-9]+$';

    INSERT INTO public.jobs (
      job_id, client_name, address_city, job_type, sold_date,
      contract_price, stage, client_id, ghl_opportunity_id
    )
    VALUES (
      v_job_id, v_name, NULLIF(BTRIM(p_address), ''),
      NULLIF(BTRIM(p_job_type), ''), p_sold_date, p_amount,
      'Ready For Scheduling'::public.job_stage, v_client_id,
      NULLIF(BTRIM(p_ghl_opportunity_id), '')
    );
  END IF;

  -- Automatically link the originating Lead Tracker row to the job.
  -- GHL Contact ID is the preferred stable match; name/email/phone are fallbacks.
  IF NULLIF(BTRIM(p_ghl_contact_id), '') IS NOT NULL THEN
    UPDATE public.leads
    SET job_id = v_job_id
    WHERE ghl_contact_id = NULLIF(BTRIM(p_ghl_contact_id), '');
  END IF;

  IF NOT FOUND THEN
    UPDATE public.leads
    SET job_id = v_job_id
    WHERE lead_id = (
      SELECT l.lead_id
      FROM public.leads l
      WHERE (v_email IS NOT NULL AND LOWER(BTRIM(l.email)) = v_email)
         OR (v_phone IS NOT NULL AND public._norm_phone(l.phone) = public._norm_phone(v_phone))
         OR LOWER(REGEXP_REPLACE(BTRIM(l.name), '\s+', ' ', 'g'))
            = LOWER(REGEXP_REPLACE(v_name, '\s+', ' ', 'g'))
      ORDER BY l.created_at DESC
      LIMIT 1
    );
  END IF;

  IF v_existing_job_id IS NOT NULL THEN
    RETURN 'updated job ' || v_job_id || ' for ' || v_name || ' -> Ready For Scheduling; lead linked to ' || v_job_id;
  END IF;

  RETURN 'created job ' || v_job_id || ' for ' || v_name || ' -> Ready For Scheduling; lead linked to ' || v_job_id;
END;
$function$
;

-- ------------------------------------------------------------
-- notify_job_created  (trigger function)
-- Posts every new job row to a Zapier catch hook via pg_net/http.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_job_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'net', 'extensions', 'public'
AS $function$
begin
  perform http_post(
    url     := 'https://hooks.zapier.com/hooks/catch/25320945/4m9awng/',
    body    := jsonb_build_object(
                 'type',       TG_OP,
                 'table',      TG_TABLE_NAME,
                 'record',     to_jsonb(NEW),
                 'old_record', null
               ),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  return NEW;
end;
$function$
;

-- ------------------------------------------------------------
-- set_job_stage_by_contact  (live version; differs from 94_*)
--
-- KNOWN ISSUES: references jobs.pipeline_stage /
-- jobs.pipeline_stage_updated_at, which do NOT exist on the live jobs
-- table (checked 2026-10-03), and ghl_stage_map, which also doesn't
-- exist ("relation public.ghl_stage_map does not exist"). So any call
-- that matches a client errors out. Phone/email-only matching with an
-- "ambiguous - left alone" guard is correct per CLAUDE.md.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_job_stage_by_contact(p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_stage text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_client_id  uuid;
  v_n          int;
  v_job_count  int;
  v_real_stage text;
  v_matched_on text;
begin
  if coalesce(btrim(p_stage),'') = '' then
    return 'no stage supplied';
  end if;

  ---------------------------------------------------------------
  -- 1. phone, on normalised digits
  ---------------------------------------------------------------
  if public._norm_phone(p_phone) is not null then
    select count(*) into v_n
    from clients c
    where public._norm_phone(c.phone) = public._norm_phone(p_phone);

    if v_n > 1 then
      return 'ambiguous: ' || v_n || ' clients share that phone - left alone';
    elsif v_n = 1 then
      select c.client_id into v_client_id
      from clients c
      where public._norm_phone(c.phone) = public._norm_phone(p_phone);
      v_matched_on := 'phone';
    end if;
  end if;

  ---------------------------------------------------------------
  -- 2. email fallback
  ---------------------------------------------------------------
  if v_client_id is null and coalesce(btrim(p_email),'') <> '' then
    select count(*) into v_n
    from clients c
    where lower(btrim(c.email)) = lower(btrim(p_email));

    if v_n > 1 then
      return 'ambiguous: ' || v_n || ' clients share that email - left alone';
    elsif v_n = 1 then
      select c.client_id into v_client_id
      from clients c
      where lower(btrim(c.email)) = lower(btrim(p_email));
      v_matched_on := 'email';
    end if;
  end if;

  if v_client_id is null then
    return 'no client matched that phone or email';
  end if;

  ---------------------------------------------------------------
  -- 3. always mirror the raw GHL stage onto every active job
  ---------------------------------------------------------------
  update jobs
  set pipeline_stage = p_stage,
      pipeline_stage_updated_at = now()
  where client_id = v_client_id and not retired;

  select count(*) into v_job_count
  from jobs j
  where j.client_id = v_client_id and not j.retired;

  if v_job_count = 0 then
    return 'matched client on ' || v_matched_on || ' but they have no active jobs';
  end if;

  ---------------------------------------------------------------
  -- 4. resolve to a real job_stage, if we have a confident mapping
  ---------------------------------------------------------------
  select app_stage into v_real_stage
  from ghl_stage_map
  where lower(ghl_stage) = lower(p_stage)
  limit 1;

  if v_real_stage is null then
    select stage into v_real_stage
    from job_stage_list
    where lower(stage) = lower(p_stage)
    limit 1;
  end if;

  if v_real_stage is null then
    return 'matched on ' || v_matched_on || '; mirrored "' || p_stage
         || '" on ' || v_job_count || ' job(s); NO MAPPING - add it to ghl_stage_map';
  end if;

  ---------------------------------------------------------------
  -- 5. only touch the structured stage when there is exactly one job
  ---------------------------------------------------------------
  if v_job_count = 1 then
    update jobs
    set stage = v_real_stage::job_stage
    where client_id = v_client_id and not retired;
    return 'matched on ' || v_matched_on || '; stage set to ' || v_real_stage;
  end if;

  return 'matched on ' || v_matched_on || '; ' || v_job_count
       || ' active jobs - mirrored only, structured stage left alone for human review';
end;
$function$
;

-- ------------------------------------------------------------
-- set_lead_pipeline_stage  (live version)
-- Exact (un-normalised) email/phone match; updates every lead that
-- matches either.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_lead_pipeline_stage(p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_stage text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update leads
  set pipeline_stage = p_stage, pipeline_stage_updated_at = now()
  where (p_email is not null and email = p_email)
     or (p_phone is not null and phone = p_phone);
end;
$function$
;

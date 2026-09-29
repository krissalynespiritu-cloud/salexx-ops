-- ============================================================
-- 91_set_lead_pipeline_stage.sql
--
-- Zapier's webhook action doesn't offer a PATCH method on this plan, only
-- GET/POST/PUT -- and PostgREST's normal REST endpoints need PATCH for a
-- filtered partial update. Sidestepping that entirely: a callable function
-- always answers to POST /rest/v1/rpc/<name>, regardless of what HTTP
-- methods a Zapier plan exposes.
--
-- Matches a lead by email first, falling back to phone if no email match
-- is found -- GHL sends whichever it has. Does nothing (no error) if
-- neither matches anything, so a mistyped/missing contact field doesn't
-- break the Zap; it just silently has nothing to update.
--
-- Safe to re-run.
-- ============================================================

create or replace function set_lead_pipeline_stage(p_email text default null, p_phone text default null, p_stage text default null)
returns void
language plpgsql as $$
begin
  update leads
  set pipeline_stage = p_stage, pipeline_stage_updated_at = now()
  where (p_email is not null and email = p_email)
     or (p_phone is not null and phone = p_phone);
end;
$$;

-- verify (call it against a fake email; expect 0 rows affected, no error)
select set_lead_pipeline_stage(p_email := 'no-such-lead@example.com', p_stage := 'Test');

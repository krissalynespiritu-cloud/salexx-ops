-- ============================================================
--  Salexx Ops Hub — avatar photo storage
--
--  A public storage bucket for profile photos, same trust model as
--  every table in this app (any signed-in admin can manage it — no
--  per-user restriction, matching team_all everywhere else).
--
--  Run any time. Safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  to public using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for all
  to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');

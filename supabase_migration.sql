-- PetiCare v49 Final 10/10 Migration (Run once in Supabase SQL Editor)
alter table public.patients add column if not exists deleted boolean not null default false;
create index if not exists patients_updated_at_idx on public.patients (updated_at desc);

do $$ begin if not exists ( select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'patients' ) then alter publication supabase_realtime add table public.patients; end if; end $$;

alter table public.patients enable row level security;

drop policy if exists "anon read" on public.patients;
drop policy if exists "anon insert" on public.patients;
drop policy if exists "anon update" on public.patients;
drop policy if exists "Staff read access" on public.patients;
drop policy if exists "Staff insert access" on public.patients;
drop policy if exists "Staff update access" on public.patients;
drop policy if exists "Admins only hard delete" on public.patients;

create policy "Staff read access" on public.patients
  for select using (auth.role() in ('authenticated', 'anon'));

create policy "Staff insert access" on public.patients
  for insert with check (auth.role() in ('authenticated', 'anon'));

create policy "Staff update access" on public.patients
  for update using (auth.role() in ('authenticated', 'anon'))
  with check (auth.role() in ('authenticated', 'anon'));

create policy "Admins only hard delete" on public.patients
  for delete using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' or (auth.jwt() ->> 'role') = 'service_role');

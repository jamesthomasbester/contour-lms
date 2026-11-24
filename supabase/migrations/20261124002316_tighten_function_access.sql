-- Fixes from the Supabase security and performance advisors.
--
-- 1. handle_new_user() is only meant to run as a trigger, but functions in
--    the public schema can also be called over the Data API (/rest/v1/rpc).
-- 2. is_admin() moves to a private schema that the Data API does not expose.
--    RLS policies can still call it.
-- 3. The two SELECT policies on consultations are merged into one, since
--    Postgres has to evaluate every permissive policy on each row.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy "Students can read their own consultations" on public.consultations;
drop policy "Admins can read all consultations" on public.consultations;

create policy "Students read their own consultations, admins read all"
  on public.consultations for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

drop function public.is_admin();

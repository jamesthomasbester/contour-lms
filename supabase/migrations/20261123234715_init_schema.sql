-- =====================================================================
-- Initial schema: roles, profiles, consultations
-- =====================================================================

-- =====================================================================
-- Types
-- =====================================================================
create type public.app_role as enum ('student', 'admin');
create type public.consultation_status as enum ('scheduled', 'cancelled');

-- =====================================================================
-- Profiles: one row per auth user; holds the user's role
-- =====================================================================
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
-- No insert/update/delete policies: users can never change their own role.
-- Admins are promoted out-of-band (SQL editor / seed), see README.

-- Create a profile automatically whenever a user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Role check for use inside RLS policies.
-- security definer: runs as the owner, so it can read profiles without
-- triggering profiles' own RLS (avoids recursion and keeps policies simple).
create function public.is_admin()
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

-- =====================================================================
-- Consultations
-- =====================================================================
create table public.consultations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  first_name   text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name    text not null check (char_length(trim(last_name))  between 1 and 100),
  reason       text not null check (char_length(trim(reason))     between 1 and 1000),
  scheduled_at timestamptz not null,
  status       public.consultation_status not null default 'scheduled',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Dashboard query: "my consultations ordered by time"
create index consultations_user_id_scheduled_at_idx
  on public.consultations (user_id, scheduled_at);

alter table public.consultations enable row level security;

create policy "Students can read their own consultations"
  on public.consultations for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins can read all consultations"
  on public.consultations for select to authenticated
  using ((select public.is_admin()));

create policy "Students can create their own consultations"
  on public.consultations for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Students can update their own consultations"
  on public.consultations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- No delete policy: cancelling is a status change, preserving history.

-- Business rules, enforced no matter how the table is reached
-- (Route Handlers validate first for friendly errors; this is the backstop
-- for anyone calling the Data API directly with the publishable key).
create function public.enforce_consultation_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'cancelled' then
    raise exception 'Cancelled consultations cannot be modified';
  end if;

  if (tg_op = 'INSERT' or new.scheduled_at is distinct from old.scheduled_at)
     and new.scheduled_at <= now() then
    raise exception 'Consultations must be scheduled in the future';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create trigger consultations_enforce_rules
  before insert or update on public.consultations
  for each row execute function public.enforce_consultation_rules();

-- =====================================================================
-- Privileges (least privilege; RLS then filters rows)
-- =====================================================================
revoke all on public.profiles, public.consultations from anon, authenticated;

grant select on public.profiles to authenticated;

grant select on public.consultations to authenticated;
grant insert (user_id, first_name, last_name, reason, scheduled_at)
  on public.consultations to authenticated;
grant update (first_name, last_name, reason, scheduled_at, status, completed_at)
  on public.consultations to authenticated;

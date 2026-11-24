-- Demo data for local development. Runs automatically on `supabase start`
-- and `supabase db reset`. Not applied to hosted projects by `db push`.
--
-- Accounts (password for all: password123)
--   student@example.com   student with a few consultations
--   student2@example.com  second student, to show data isolation
--   admin@example.com     admin, can see everything at /admin

create or replace function pg_temp.create_user(user_id uuid, user_email text)
returns void
language sql
as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', user_id, 'authenticated',
    'authenticated', user_email, extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), user_id, user_id::text,
    jsonb_build_object('sub', user_id::text, 'email', user_email),
    'email', now(), now(), now()
  );
$$;

select pg_temp.create_user('a0000000-0000-0000-0000-000000000001', 'student@example.com');
select pg_temp.create_user('a0000000-0000-0000-0000-000000000002', 'student2@example.com');
select pg_temp.create_user('a0000000-0000-0000-0000-000000000003', 'admin@example.com');

-- Profiles are created by the on_auth_user_created trigger.
update public.profiles set role = 'admin'
where id = 'a0000000-0000-0000-0000-000000000003';

insert into public.consultations (user_id, first_name, last_name, reason, scheduled_at) values
  ('a0000000-0000-0000-0000-000000000001', 'Sam', 'Taylor', 'Help choosing electives for next semester', now() + interval '2 days'),
  ('a0000000-0000-0000-0000-000000000001', 'Sam', 'Taylor', 'Feedback on assignment 2', now() + interval '5 days'),
  ('a0000000-0000-0000-0000-000000000001', 'Sam', 'Taylor', 'Extension request', now() + interval '9 days'),
  ('a0000000-0000-0000-0000-000000000002', 'Priya', 'Shah', 'Study plan for final exams', now() + interval '3 days');

update public.consultations set completed_at = now()
where reason = 'Feedback on assignment 2';

update public.consultations set status = 'cancelled'
where reason = 'Extension request';

-- Access rules for profiles and consultations.
-- Run with: npx supabase test db
-- Everything happens inside a transaction that is rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- Fixtures, created as the superuser ---------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'ben@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local');

update public.profiles set role = 'admin'
where id = '33333333-3333-3333-3333-333333333333';

insert into public.consultations (user_id, first_name, last_name, reason, scheduled_at) values
  ('11111111-1111-1111-1111-111111111111', 'Alice', 'Ng', 'Course plan', now() + interval '1 day'),
  ('22222222-2222-2222-2222-222222222222', 'Ben', 'Lee', 'Feedback', now() + interval '2 days');

select is(
  (select count(*)::int from public.profiles where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333')),
  3,
  'a profile is created for every new user'
);

select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'student',
  'new users are students by default'
);

-- Signed in as Alice (student) ---------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  'select first_name from public.consultations',
  $$ values ('Alice') $$,
  'students only see their own consultations'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  '42501', null,
  'students cannot change their own role'
);

select throws_ok(
  $$ insert into public.consultations (user_id, first_name, last_name, reason, scheduled_at)
     values ('22222222-2222-2222-2222-222222222222', 'x', 'x', 'x', now() + interval '1 day') $$,
  '42501', null,
  'students cannot book for someone else'
);

select throws_ok(
  $$ insert into public.consultations (user_id, first_name, last_name, reason, scheduled_at)
     values (auth.uid(), 'x', 'x', 'x', now() - interval '1 hour') $$,
  'LM001', 'Consultations must be scheduled in the future',
  'consultations cannot be booked in the past'
);

select is_empty(
  $$ update public.consultations set reason = 'changed'
     where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'students cannot edit another student''s consultation'
);

select throws_ok(
  $$ update public.consultations set user_id = '22222222-2222-2222-2222-222222222222'
     where user_id = auth.uid() $$,
  '42501', null,
  'students cannot hand a consultation to another user'
);

select throws_ok(
  $$ delete from public.consultations where user_id = auth.uid() $$,
  '42501', null,
  'consultations cannot be deleted, only cancelled'
);

select lives_ok(
  $$ update public.consultations set completed_at = '2099-01-01' where user_id = auth.uid() $$,
  'students can mark their consultation complete'
);

select ok(
  (select completed_at <= now() from public.consultations where user_id = auth.uid()),
  'the completion time is set by the database, not the client'
);

select lives_ok(
  $$ update public.consultations set scheduled_at = now() + interval '3 days' where user_id = auth.uid() $$,
  'students can reschedule their consultation'
);

select throws_ok(
  $$ update public.consultations set scheduled_at = now() - interval '1 day' where user_id = auth.uid() $$,
  'LM001', 'Consultations must be scheduled in the future',
  'consultations cannot be moved into the past'
);

select lives_ok(
  $$ update public.consultations set status = 'cancelled' where user_id = auth.uid() $$,
  'students can cancel their consultation'
);

select throws_ok(
  $$ update public.consultations set status = 'scheduled' where user_id = auth.uid() $$,
  'LM001', 'Cancelled consultations cannot be modified',
  'cancelled consultations stay cancelled'
);

-- Signed in as the admin ----------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);

select is(
  (select count(*)::int from public.consultations where user_id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222')),
  2,
  'admins can see every student''s consultations'
);

select is_empty(
  $$ update public.consultations set reason = 'changed' returning id $$,
  'the admin view is read-only'
);

-- Signed out ----------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  'select * from public.consultations',
  '42501', null,
  'signed-out users cannot read consultations'
);

select * from finish();
rollback;

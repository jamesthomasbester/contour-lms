# Contour LMS

A small learning management system for booking consultations. Students can
book, reschedule, cancel and complete their own consultations. Admins get a
read-only view of every consultation in the system.

Built with Next.js 16 (App Router), TypeScript and Supabase (Postgres, Auth,
`supabase-js` and `@supabase/ssr`), starting from the official
`with-supabase` example.

## Features

- Email and password sign up, log in and log out
- Student dashboard listing their own consultations
- Mark a consultation complete or incomplete
- Book a consultation (first name, last name, reason, date and time)
- Reschedule or cancel your own consultations
- Admin page at `/admin` listing all consultations (read-only)
- Password reset by email (from the starter template)

## Live demo

https://contour-lms.vercel.app

Demo logins for a student and an admin were sent with my submission. You
can also sign up a new account, which will be a student. The admin page is
at `/admin`. It's a demo with made-up data, so please don't enter real
personal details.

## Running it locally

You need Node.js 20.9 or newer (developed on 24) and Docker (the Supabase CLI runs the database
and auth server in containers). The Supabase CLI itself is a dev dependency,
so there is nothing else to install.

```bash
npm install
npx supabase start        # first run pulls the images, takes a few minutes
npx supabase status       # prints the API URL and publishable key
cp .env.example .env.local
```

Put the `API URL` and `Publishable key` from `supabase status` into
`.env.local`, then:

```bash
npm run dev
```

Open http://localhost:3000. `supabase start` applies the migrations and the
seed data, so these local accounts are ready to use (the live demo uses
different passwords):

| Email                  | Password      | Role    |
| ---------------------- | ------------- | ------- |
| `student@example.com`  | `password123` | student |
| `student2@example.com` | `password123` | student |
| `admin@example.com`    | `password123` | admin   |

You can also sign up a new account. New accounts are always students.

Other useful commands:

```bash
npx supabase db reset     # rebuild the local database from migrations + seed
npm run db:test           # run the pgTAP database tests
npm run test:api          # API tests; needs the app running on the local stack
npm run db:types          # regenerate lib/database.types.ts from the local schema
npm run lint
npm run build
```

Supabase Studio runs at http://127.0.0.1:54323 if you want to look at the data.

A note on how this was tested: I couldn't run the full local stack on my own
machine (see the development note at the end), so I built against a hosted
Supabase project. The same migrations and seed were applied there, and CI
runs them on a fresh local database on every push.

### Making someone an admin

There is deliberately no way to become an admin from inside the app. Run this
in the SQL editor (Studio locally, or the dashboard for a hosted project):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'someone@example.com');
```

### Using a hosted Supabase project

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push --remote
```

Then set `.env.local` to the project's URL and publishable key. In the
dashboard, add `http://localhost:3000/**` (and your deployed URL) under
Authentication > URL Configuration. The seed is not applied by `db push`, so
create an admin with the SQL above.

## How it works

### Request flow

Pages are server components. They read data with the Supabase server client,
which is created per request from the user's cookies. Every change to a
consultation goes through a Route Handler under `app/api`, called with
`fetch` from client components. Sign up, log in and log out use supabase-js
in the browser, as in the starter template. There are no Server Actions.

The Route Handlers and pages all use the same Supabase client with the
user's own session (never the service role key), so Postgres row level
security applies to every query. The proxy (`proxy.ts`, which Next 16 uses in
place of `middleware.ts`) keeps the session cookie fresh and sends signed-out
visitors to the login page.

### API

| Method  | Route                      | Who       | What                                    |
| ------- | -------------------------- | --------- | --------------------------------------- |
| `GET`   | `/api/consultations`       | signed in | The caller's own consultations          |
| `POST`  | `/api/consultations`       | signed in | Book a consultation                     |
| `PATCH` | `/api/consultations/:id`   | owner     | Reschedule, complete/incomplete, cancel |
| `GET`   | `/api/admin/consultations` | admin     | All consultations, paginated            |

`PATCH` takes any of `{ "scheduledAt": "<ISO date>" }`,
`{ "completed": true | false }` or `{ "status": "cancelled" }`.

Request bodies are validated with zod (`lib/validation.ts`). Errors come back
as `{ "error": "...", "fields": { ... } }` with a matching status code: 400
for invalid input, 401 when signed out, 403 for non-admins on the admin
route, 404 when the consultation doesn't exist or isn't yours, and 409 when a
business rule is broken (for example, editing a cancelled consultation).

### Data model

Migrations are in `supabase/migrations`.

#### `profiles`

One row per user, created by a trigger on `auth.users`.

| Column       | Type                          |
| ------------ | ----------------------------- |
| `id`         | uuid, references `auth.users` |
| `role`       | `app_role` enum: `student`, `admin` (default `student`) |
| `created_at` | timestamptz                   |

#### `consultations`

| Column         | Type                                               |
| -------------- | -------------------------------------------------- |
| `id`           | uuid                                               |
| `user_id`      | uuid, references `auth.users`                      |
| `first_name`   | text, 1 to 100 characters                          |
| `last_name`    | text, 1 to 100 characters                          |
| `reason`       | text, 1 to 1000 characters                         |
| `scheduled_at` | timestamptz                                        |
| `status`       | `consultation_status` enum: `scheduled`, `cancelled` |
| `completed_at` | timestamptz, null until completed                  |
| `created_at`, `updated_at` | timestamptz                            |

### Roles and access control

The role lives in `public.profiles.role`, not in the user's auth metadata,
because users can edit their own `user_metadata`. Users can read their own
profile but have no insert or update rights on it, so they can't promote
themselves.

The publishable key ships to the browser, so anyone can call the Supabase
Data API directly and skip the Next.js API entirely. Because of that, the
rules are enforced in the database, not only in the Route Handlers:

1. Row level security decides which rows a user can touch. Students can
   read, create and update their own consultations. Admins can read all of
   them. The admin check is `private.is_admin()`, a `security definer`
   function in a schema the Data API doesn't expose.
2. Column grants decide which columns can be written. Students can't set
   `user_id` on update, can't write `created_at`, and nobody can delete a
   consultation.
3. A trigger (`enforce_consultation_rules`) enforces the business rules:
   bookings and reschedules must be in the future, cancelled consultations
   can't be changed, and the database sets `completed_at` itself rather than
   trusting a timestamp from the client.

The Route Handlers check the same things first so they can return friendly
errors, but it's the database that actually enforces them. `supabase/tests`
has pgTAP tests that sign in as different users and check each of these
rules, and `tests/api.test.mjs` checks the same flows over HTTP against the
running app (401, 403, 404, 409, booking, completing, rescheduling and
cancelling).

## Decisions and assumptions

- API routes over Server Actions. All mutations go through Route
  Handlers, as the brief asked. Pages read data directly in server
  components using the same helpers (`lib/consultations.ts`) instead of
  calling their own API over HTTP, which would just add a network hop.
  The admin GET route is still there for any other client, and both it and
  the admin page are paginated (20 per page).
- Cancelling is a status change, not a delete. It keeps the history, and
  admins can still see cancelled bookings. A cancelled consultation can't be
  reopened; the student books a new one.
- Completion is separate from status. A consultation can be scheduled and
  incomplete, scheduled and complete, or cancelled. Storing `completed_at`
  instead of a boolean also records when it happened.
- Students can mark a consultation complete before its time. The brief
  just asks for a complete/incomplete toggle, so I didn't tie it to the date.
- First and last name are stored on each consultation. The brief lists
  them as booking fields, so they belong to the booking and could differ
  from the account holder (for example, booking on someone's behalf).
- Times are stored in UTC (`timestamptz`). The browser converts the
  `datetime-local` input to UTC before sending it and shows times in the
  viewer's timezone.
- No availability or double-booking rules. There's no concept of a
  consultant or time slots in the brief, so any future time is accepted.
- Admins are promoted with SQL, not through the app. That keeps role
  changes out of reach of any app bug. An admin UI for this would be a
  sensible next step.
- Email confirmation is off, both locally (see `supabase/config.toml`) and on
  the demo project, so sign up logs you straight in. For real users I'd turn
  it on, use a proper SMTP provider and enable leaked password protection.

## Project layout

```
app/(app)/     signed-in pages: dashboard, booking form, admin
app/api/       Route Handlers
lib/           auth helpers, queries, zod schemas, API client
supabase/      migrations, seed.sql and pgTAP tests
```

## Development note

On my machine rootless Podman can't run the Supabase CLI's container health
checks, so most local CLI commands refuse to run. That's why I developed
against a hosted project. CI (`.github/workflows/ci.yml`) starts a trimmed
local stack (database, auth and REST) on Docker, applies the migrations and
seed, runs the pgTAP tests, then builds and starts the app and runs the API
tests against it. A separate job lints, typechecks and builds.

## What I'd do next

- Filtering and search on the admin list
- Show the account that made each booking in the admin view, since the name
  on a booking can differ from the account holder
- Availability slots so two students can't book the same time
- End-to-end tests with Playwright for the main flows

// HTTP tests for the Route Handlers, run against a running app and the local
// Supabase stack with seed data. CI runs these; locally:
//
//   npx supabase start && npm run build && npm start
//   npm run test:api
//
// They create and cancel consultations, so don't point them at a shared
// database.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:3000";
const PASSWORD = process.env.SEED_PASSWORD ?? "password123";

// Signs in the same way the browser does and returns the auth cookies as a
// Cookie header, so requests go through the real session handling.
async function signIn(email) {
  const jar = new Map();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cookies) =>
          cookies.forEach(({ name, value }) => jar.set(name, value)),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function api(path, { cookie, method = "GET", body } = {}) {
  const res = await fetch(`${APP_URL}/api${path}`, {
    method,
    headers: {
      ...(cookie && { Cookie: cookie }),
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
    redirect: "manual",
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

let student, otherStudent, admin;

before(async () => {
  [student, otherStudent, admin] = await Promise.all([
    signIn("student@example.com"),
    signIn("student2@example.com"),
    signIn("admin@example.com"),
  ]);
});

describe("access control", () => {
  test("signed-out requests get 401", async () => {
    assert.equal((await api("/consultations")).status, 401);
    assert.equal((await api("/admin/consultations")).status, 401);
  });

  test("students get 403 from the admin endpoint", async () => {
    const res = await api("/admin/consultations", { cookie: student });
    assert.equal(res.status, 403);
  });

  test("students only see their own consultations", async () => {
    const mine = await api("/consultations", { cookie: student });
    const theirs = await api("/consultations", { cookie: otherStudent });
    assert.equal(mine.status, 200);

    const mineIds = new Set(mine.body.consultations.map((c) => c.id));
    assert.ok(mineIds.size > 0);
    assert.ok(theirs.body.consultations.every((c) => !mineIds.has(c.id)));
  });

  test("admins see everyone's consultations, paginated", async () => {
    const res = await api("/admin/consultations?page=1", { cookie: admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.pageSize, 20);

    // The seed has consultations for two different students.
    assert.ok(res.body.total >= 4);
    const names = new Set(res.body.consultations.map((c) => c.firstName));
    assert.ok(names.size >= 2);
  });
});

// These run in order and share the consultation booked in the first test.
describe("booking and managing a consultation", () => {
  let id;

  test("rejects an invalid booking with field errors", async () => {
    const res = await api("/consultations", {
      cookie: student,
      method: "POST",
      body: { firstName: "", reason: "x", scheduledAt: daysFromNow(-1) },
    });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.fields.firstName, ["Required"]);
    assert.deepEqual(res.body.fields.scheduledAt, ["Must be in the future"]);
  });

  test("books a consultation", async () => {
    const res = await api("/consultations", {
      cookie: student,
      method: "POST",
      body: {
        firstName: "Sam",
        lastName: "Taylor",
        reason: "API test booking",
        scheduledAt: daysFromNow(4),
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.consultation.status, "scheduled");
    id = res.body.consultation.id;

    const list = await api("/consultations", { cookie: student });
    assert.ok(list.body.consultations.some((c) => c.id === id));
  });

  test("another student can't change it", async () => {
    assert.ok(id, "booking failed");
    const res = await api(`/consultations/${id}`, {
      cookie: otherStudent,
      method: "PATCH",
      body: { completed: true },
    });
    assert.equal(res.status, 404);
  });

  test("marks it complete and incomplete", async () => {
    assert.ok(id, "booking failed");
    const done = await api(`/consultations/${id}`, {
      cookie: student,
      method: "PATCH",
      body: { completed: true },
    });
    assert.equal(done.status, 200);
    assert.ok(done.body.consultation.completedAt);

    const undone = await api(`/consultations/${id}`, {
      cookie: student,
      method: "PATCH",
      body: { completed: false },
    });
    assert.equal(undone.body.consultation.completedAt, null);
  });

  test("reschedules it", async () => {
    assert.ok(id, "booking failed");
    const newTime = daysFromNow(6);
    const res = await api(`/consultations/${id}`, {
      cookie: student,
      method: "PATCH",
      body: { scheduledAt: newTime },
    });
    assert.equal(res.status, 200);
    assert.equal(
      new Date(res.body.consultation.scheduledAt).getTime(),
      new Date(newTime).getTime(),
    );
  });

  test("cancels it, after which it can't be changed", async () => {
    assert.ok(id, "booking failed");
    const cancelled = await api(`/consultations/${id}`, {
      cookie: student,
      method: "PATCH",
      body: { status: "cancelled" },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.consultation.status, "cancelled");

    const edit = await api(`/consultations/${id}`, {
      cookie: student,
      method: "PATCH",
      body: { completed: true },
    });
    assert.equal(edit.status, 409);
  });
});

# 2. Enforce the application lifecycle in Postgres, not only in the app

Date: 2026-09-10

## Context

Supabase exposes the database directly through PostgREST with the anon key. Any rule enforced only in a server action
can be bypassed by calling the API with a user's session.

## Decision

Row-level security policies restrict reads and writes by role, and two triggers enforce transitions:
`protect_application_transition` blocks applicants from editing after submission or setting a decision, and
`protect_profile_role` blocks applicants from promoting themselves. `is_organizer()` is a `security definer` function
so policies can read the caller's role without recursing into the `profiles` policy.

## Consequences

Server actions still validate input and check roles for good error messages, but the database is the last line.
The service-role key is used in exactly two places: the seed script and the organizer invite grant at sign-up.

# Encore

A miniature hackathon management portal, built as the Hackathon at Berkeley tech take-home.

Applicants sign in, build a **Roadie** (a small pet derived from their music taste) and apply as a hacker, judge,
mentor, or volunteer. The Roadie sits in the corner of every applicant page and talks them through the form in a
voice shaped by what they listen to. Organizers see every application in a Linear-style table, grade against a
per-track rubric, and set decisions that applicants see on their status page.

## Live

- App: see the deployment section below (filled in once the cloud project exists).
- Demo accounts: `organizer@demo.encore.dev` and `maya@demo.encore.dev`, password in `.env.example` (`SEED_PASSWORD`).
  The sign-in page has one-click demo buttons.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres, Auth, RLS),
Vercel. Tests: Vitest for pure logic, Playwright for the end-to-end flows.

## Run it locally

Requires Node 20.9+ and Docker (for the local Supabase stack).

```bash
npm install
npm run db:start          # starts Postgres, Auth, Studio (http://127.0.0.1:54323); applies supabase/migrations
npx supabase status       # copy the API URL, anon key and service_role key into .env.local
cp .env.example .env.local
npm run db:types          # regenerate src/lib/database.types.ts from the local database
npm run seed              # demo organizer + applicants with pets, applications, reviews
npm run dev               # http://localhost:3000
```

## Test

```bash
npm run typecheck
npm run lint
npm run test              # vitest: pet engine, form schemas
npm run test:e2e          # playwright: applicant flow, organizer flow, access control (needs the local stack + seed)
```

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon/publishable key; RLS does the access control |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | used only by the seed script and the organizer invite grant |
| `ORGANIZER_INVITE_CODE` | server only | entered on sign-up to get an organizer account |
| `SEED_PASSWORD` | server only | password for seeded demo accounts and the demo buttons |

## How it is put together

- `docs/SPEC.md` is the product and technical spec: roles, lifecycle, data model, routes, the Roadie rules, the
  design system, and which module owns which path.
- `supabase/migrations/0001_init.sql` is the schema. Access control lives in row-level security policies and two
  triggers, so an applicant cannot edit a submitted application or set a decision even with a hand-crafted request.
- `src/lib/forms/tracks.ts` defines each track's questions and rubric. Answers are stored as `jsonb`, validated with
  zod on submit, and rendered for organizers by walking the same definition.
- `src/lib/pet/` is the Roadie engine: deterministic derivation from the music quiz, a name generator, and a voice
  module that picks lines by tone and context. `src/components/pet/` renders the SVG sprite, the dock, and the quiz.
- `src/lib/data/` is the only place that talks to Supabase from the app. Server actions validate input with zod and
  return `{ok, data} | {ok, error}`.
- `docs/decisions/` holds short records of the choices that were not obvious.

## Status

In progress. See the bottom of this file for what is done and what is left.

- [x] schema with RLS
- [ ] UI kit and shell
- [ ] Roadie engine and components
- [ ] auth, applicant, organizer routes
- [ ] end-to-end tests
- [ ] cloud Supabase project and Vercel deployment

# Encore

A miniature hackathon management portal, built as the Hackathon at Berkeley tech take-home.

Applicants pick a track at sign-up (hacker, judge, mentor, or volunteer) and get a draft started for it. Their
first application runs as a walkthrough with no sidebar: pick a guide (or skip), then the guide opens a chat on
the form, introduces the first question, and answers by text or voice. A **Roadie** sits in the corner of every
applicant page and talks them through the form; choosing a guide for it is optional and only changes its voice. Organizers see every application in a Linear-style table, grade against a
per-track rubric, and set decisions that applicants see on their status page.

## Live

- App: not deployed yet. `scripts/deploy.sh` (see Deployment below) prints the production URL; paste it here.
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
cp .env.example .env.local
npx supabase status       # copy the API URL, anon key and service_role key into .env.local
npm run db:types          # regenerate src/lib/database.types.ts from the local database
npm run seed              # demo organizer + applicants with organizer guides, applications, reviews
npm run dev               # http://localhost:3000
```

## Test

```bash
npm run typecheck
npm run lint
npm run test              # vitest: pet engine, form schemas, assistant guide
npm run test:e2e          # playwright: applicant flow, organizer flow, access control (needs the local stack + seed)
```

Playwright reads `.env.local` for the Supabase keys and starts `next dev` on `E2E_PORT` (default 3000). Set
`E2E_BASE_URL` to run the specs against a server that is already up, local or deployed; no dev server is started then.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon/publishable key; RLS does the access control |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | used by sign-up (creates confirmed users), the organizer invite grant and the seed script |
| `ORGANIZER_INVITE_CODE` | server only | entered on sign-up to get an organizer account |
| `SEED_PASSWORD` | server, and the sign-in page when `DEMO_LOGIN=1` | password for the seeded demo accounts; treat it as public |
| `DEMO_LOGIN` | server | `1` shows one-click demo sign-in buttons on the sign-in page; unset to hide them |
| `GROQ_API_KEY` | server only | Groq key for the Roadie assistant; picked first when set |
| `OPENROUTER_API_KEY` | server only | OpenRouter key for the Roadie assistant; used when there is no Groq key |
| `AI_PROVIDER` | server only | `groq`, `openrouter`, or `offline`; overrides the key-based choice |
| `AI_MODEL` | server only | model id for the chosen provider; defaults to `openai/gpt-oss-120b` (Groq) or `google/gemma-4-31b-it:free` (OpenRouter) |
| `E2E_PORT` | playwright only | port Playwright starts `next dev` on (default 3000) |
| `E2E_BASE_URL` | playwright only | run the e2e specs against an existing server instead of starting one |

## How it is put together

- `docs/SPEC.md` is the product and technical spec: roles, lifecycle, data model, routes, the Roadie rules, the
  design system, and which module owns which path.
- `supabase/migrations/0001_init.sql` is the schema. Access control lives in row-level security policies and two
  triggers, so an applicant cannot edit a submitted application or set a decision even with a hand-crafted request.
- `src/lib/forms/tracks.ts` defines each track's questions and rubric. Answers are stored as `jsonb`, validated with
  zod on submit, and rendered for organizers by walking the same definition.
- `src/lib/pet/` is the Roadie engine: it derives a fixed pet spec, tracks xp, and picks voice lines by tone and
  context. The guide picker (portrait, drawing, or photo) sets the guide's face, name, and voice.
  `src/components/pet/` renders the sprite, the dock, and the picker.
- `src/lib/data/` is the only place that talks to Supabase from the app. Server actions validate input with zod and
  return `{ok, data} | {ok, error}`.
- `docs/decisions/` holds short records of the choices that were not obvious.

## Roadie assistant

On the application form, Cmd/Ctrl+J (or the "Ask <name>" button under the Roadie) opens a chat with the applicant's
Roadie. Type or use the mic (Web Speech API, hidden when the browser lacks it) to ask where a field is, what a
question means, or for an example. Each reply can highlight a field, show an example with a "Use this" button, or
clarify the question. The Roadie never writes the application for you.

`src/app/api/assistant/route.ts` checks the applicant session, validates the body, and calls `src/lib/ai/provider.ts`,
which talks to Groq or OpenRouter with plain `fetch` and JSON output, retries once on a fallback model, and then falls
back to `src/lib/ai/offline.ts`. The offline guide answers from the form definition alone, so the assistant works with
no API key at all; that is the mode the demo and the unit tests use. See `docs/decisions/0004-assistant-llm-with-offline-fallback.md`.

## Deployment

`scripts/deploy.sh` does the one-time cloud setup and each production deploy from the local tree. It needs
`npx supabase login` and `vercel login` done once. It:

1. links (or creates) the cloud Supabase project and pushes `supabase/migrations`,
2. asks for the project's anon and service_role keys,
3. writes them, `ORGANIZER_INVITE_CODE` and `SEED_PASSWORD` to `.env.cloud` (git-ignored) and runs the seed against
   the cloud project,
4. links the Vercel project, sets those variables as production env vars, and runs `vercel deploy --prod`.

Override the invite code or demo password by exporting `ORGANIZER_INVITE_CODE` or `SEED_PASSWORD` before running it.
The assistant keys are forwarded only when exported first: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `AI_PROVIDER`, and
`AI_MODEL`. Without them production runs the offline guide.
Afterwards set Authentication -> URL configuration -> Site URL in the Supabase dashboard to the production URL and
put that URL in the Live section above.

## Status

Working end to end against a local Supabase stack: sign-up and sign-in for applicants and organizers, the optional
Roadie guide and companion, four track applications with autosave and submit, the organizer table with filters and keyboard
navigation, grading with a per-track rubric, decisions that show up on the applicant's status page, unit tests, and
Playwright flows. Not yet done: the cloud Supabase project and the Vercel deployment (run `scripts/deploy.sh` once
`npx supabase login` has been done; see the Deployment section).

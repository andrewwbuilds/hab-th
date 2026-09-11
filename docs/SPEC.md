# Encore: hackathon application portal

Take-home for Hackathon at Berkeley. A miniature hackathon management platform: applicants sign in and
apply as a hacker, judge, mentor, or volunteer; organizers review, grade, and decide.

Brand name: **Encore**. The pet companion feature is called a **Roadie**. An applicant can give their Roadie a
guide (a face and a name) at any point; the guide is optional and only changes the voice the Roadie speaks in.

## Stack

- Next.js 16 (App Router, `src/` dir, Turbopack, `proxy.ts` instead of `middleware.ts`), React 19, TypeScript strict.
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, tokens as CSS variables).
- Supabase: Postgres, Auth (email + password, confirmations off), RLS. `@supabase/ssr` for cookies.
- Vercel for hosting. Local dev uses `npx supabase start` (Docker) on ports 54321 (API) / 54322 (DB) / 54323 (Studio).
- Tests: `vitest` for pure logic (pet engine, form schemas), `@playwright/test` for end-to-end against the local stack.
- Icons: `lucide-react`. Command palette: `cmdk`. Validation: `zod` v4.

Read `AGENTS.md` first: this Next.js differs from training data. Docs live in `node_modules/next/dist/docs/`.
Key differences already checked: `params`/`searchParams`/`cookies()` are async; `middleware.ts` is now `src/proxy.ts`
exporting `proxy()`; `next build` uses Turbopack; layouts can use `LayoutProps<"/route">` and pages `PageProps<"/route">`.

## Roles and account types

- `profiles.role`: `applicant` | `organizer`. Set at signup. Organizer role granted when the signup form's
  invite code matches `ORGANIZER_INVITE_CODE` (server-side check, then `admin` client sets the role), or by seed.
- Sign-up asks "What are you applying for?" with the four tracks (default hacker, preselected from `?track=` when
  valid). Applicants get a draft for that track created with their own session and land on `/app/apply/<track>`.
  Organizer sign-ups (non-empty invite code) ignore the choice and land on `/org`. A safe `next` param wins over both.
  The `protect_profile_role` trigger blocks role changes from everyone except organizers and the service role.
- `DEMO_LOGIN=1` shows one-click demo sign-in buttons on the sign-in page (uses `SEED_PASSWORD`).
- `applications.track`: `hacker` | `judge` | `mentor` | `volunteer`. One application per (user, track).
  Each track has its own form definition and its own grading rubric (see `src/lib/forms/tracks.ts`).

## Application lifecycle

`status`: `draft` -> `submitted` -> `under_review` -> (`accepted` | `waitlisted` | `rejected`).

- The first draft is created at sign-up for the chosen track. Any other track starts on first change of its form
  (`createDraft` is idempotent over `unique(user_id, track)`). Drafts autosave (debounced server action on change,
  plus explicit Save). Choosing a guide is optional and never blocks the form.
- Submit runs full zod validation server-side, sets `submitted_at`, status `submitted`. After submit the applicant can
  no longer edit (RLS enforces: applicants may update only while `status = 'draft'`).
- Organizers see all applications, move to `under_review` when they open one (explicit button, not implicit),
  add a review (one per reviewer per application, upsert), and set a decision. Decisions are visible to the applicant
  on their status page as soon as they are set.

## Data model (Postgres, see `supabase/migrations/0001_init.sql`)

```
profiles      id uuid PK = auth.users.id, email text, full_name text, role role_t, created_at
applications  id uuid PK, user_id -> profiles, track track_t, status status_t, answers jsonb,
              submitted_at, decided_at, created_at, updated_at, unique(user_id, track)
reviews       id uuid PK, application_id -> applications, reviewer_id -> profiles, scores jsonb
              ({criterionKey: 1..5}), overall int 1..5, notes text, created_at, updated_at,
              unique(application_id, reviewer_id)
pets          id uuid PK, user_id -> profiles unique, name text, species text, palette jsonb,
              traits jsonb, music jsonb (the raw MusicProfile answers), xp int, created_at, updated_at
```

`answers` is jsonb keyed by field `key` from the track's form definition. Keeping answers as jsonb (rather than one
column per question) is deliberate: each track has different questions and organizers change questions every year.
The form definition in code is the schema; zod validates it on submit; the organizer detail view renders answers by
walking the same definition, so a new question is a one-line change.

Helper: `public.is_organizer()` (security definer, stable) reads the caller's profile role. RLS policies:

- profiles: select own or organizer; update own (except role). Insert only via trigger `handle_new_user` on `auth.users`.
- applications: applicant select/insert own; update own only while draft; organizer select all, update all (status only
  in practice; the UI never lets organizers edit answers).
- reviews: organizer all; applicants nothing.
- pets: owner select/insert/update; organizer select.

Trigger `set_updated_at` on applications, reviews, pets.

## Routes

```
/                         landing: hero scene, how it works, tracks, guides, FAQ
/sign-in  /sign-up        split layout: form on the left, pixel art on the right (actions in src/app/(auth)/actions.ts)
/auth/sign-out            POST route handler
/app                      applicant home: Roadie + application cards per track + statuses. During the first
                          application it redirects to the walkthrough step (see below)
/app/roadie               guide picker (optional); `?next=<internal path>` returns there after saving and shows
                          a "Skip for now" link to it
/app/apply/[track]        the application form for one track (draft autosave, submit); sign-up lands on
                          /app/roadie?next=/app/apply/<track>. Without a guide the page shows one line linking there
/app/status/[track]       read-only view of a submitted application + decision
/org                      organizer dashboard: counts by track/status, recent activity
/org/applications         list of all applications: table with filters (track, status), sort, search, keyboard nav
/org/applications/[id]    detail: answers, applicant's Roadie card, reviews from all reviewers, grading form, decision
```

`src/proxy.ts` refreshes the Supabase session cookie on every request and redirects: unauthenticated -> `/sign-in`
for `/app/*` and `/org/*`; applicant hitting `/org/*` -> `/app`; organizer hitting `/app/*` -> `/org`.
Page-level server code re-checks the role (never trust proxy alone).

## Roadie (the pet): spec

### Music profile `MusicProfile`

The quiz is not routed. `saveGuide` currently uses a fixed profile, so every pet derives the same way; the guide
picker sets the face, name, and voice.

```ts
{
  genres: Genre[]              // 1..3, ordered by preference; from GENRES list
  energy: 1|2|3|4|5            // how hard does it go
  mood: 1|2|3|4|5              // 1 = melancholy, 5 = euphoric
  era: '70s'|'80s'|'90s'|'00s'|'10s'|'20s'
  hoursPerDay: 'under1'|'1to3'|'3to6'|'over6'
  discovery: 'playlists'|'albums'|'friends'|'live'
  topArtist: string            // free text, required
  anthem: string               // free text, optional ("the song you'd walk out to")
}
```

GENRES: `electronic, hiphop, indie, pop, rock, metal, jazz, classical, rnb, country, lofi, latin`.

### Derivation `derivePet(profile): PetSpec` (pure, deterministic, in `src/lib/pet/engine.ts`)

- `species` from `genres[0]`: electronic->`moth`, hiphop->`cat`, indie->`fox`, pop->`bunny`, rock->`wolf`,
  metal->`dragon`, jazz->`raccoon`, classical->`owl`, rnb->`swan`, country->`deer`, lofi->`sloth`, latin->`parrot`.
- `palette` (`{primary, secondary, accent}` hex): hue from mood (1 = cool violet/blue ... 5 = warm coral/gold),
  saturation from energy, secondary genre nudges hue. Must stay legible on both the dark app background and a white card.
- `traits`: `tone` = `hype` (energy>=4 && mood>=4) | `chill` (energy<=2) | `moody` (mood<=2) | `warm` (else);
  `chattiness` from hoursPerDay (`terse`|`normal`|`talkative`); `accessory` from era (`headphones` 20s/10s,
  `cassette` 80s/90s, `vinyl` 70s, `ipod` 00s); `discoveryStyle` copied from discovery.
- `name`: deterministic from a seeded hash of `topArtist + genres.join()`: pick from per-genre syllable lists;
  the user names the guide in the picker.
- `stage`: derived from xp: 0-49 `egg`, 50-149 `hatchling`, 150+ `grown`. xp events (awarded by server actions,
  idempotent per event key stored in `pets.traits.xpEvents`): pet created 25, first draft 25, each form section
  completed 20, submit 60, decision received 20. The sprite visibly changes with stage. Every xp event is written by
  the applicant's own session (RLS only lets owners update pets); the decision event lands when the applicant first
  opens their status page, so no organizer action ever needs the service role.

### Sprite `PetSprite` (`src/components/pet/PetSprite.tsx`)

Inline SVG built from parts: body shape per species, eyes per mood band (sleepy/neutral/sparkly), accessory per era,
palette applied via fill. Props: `{spec: PetSpec, size?: number, mood?: 'idle'|'happy'|'worried'|'celebrate'}`.
Animate only on state change (bounce on `celebrate`, small tilt on `worried`), respect `prefers-reduced-motion`.
No raster assets.

### Companion `RoadieDock` (`src/components/pet/RoadieDock.tsx`, client component)

A dock pinned bottom-right of every applicant page (not on organizer pages). Shows the sprite plus a speech bubble.
`getRoadieLine(spec, context)` in `src/lib/pet/voice.ts` picks a line: context =
`{screen:'home'|'form'|'status', track?, section?, fieldKey?, completion?: number, errors?: string[], status?}`.
Lines are written per `tone` (hype/chill/moody/warm) and reference the user's music (top artist, era) sparingly.
Form pages pass the focused field so the Roadie explains what a good answer looks like for that field
(each field definition carries a `hint`, the Roadie rephrases it in its tone). Errors -> worried mood + the first error.
Submit -> celebrate. Decision on status page -> tone-appropriate reaction.

Organizer detail page shows a compact `RoadieCard` (sprite + name + species + top artist + anthem). Reviewers like it,
and it gives interviewers something human about the applicant at a glance.

## Design system: Linear

The UI is a faithful take on Linear's app (dark theme only for this deliverable). Tokens live in `globals.css`.

- Background `#08090a`; sidebar `#0f1011`; panel/elevated `#141516`; hover `#191a1b`; borders `#1f2023`
  (strong `#2b2c30`); text `#e6e6e6`, muted `#8b8d93`, dim `#5f6169`; accent `#5e6ad2`, accent hover `#6c76e0`.
- Status colors (Linear-style circles): draft `#6f7178`, submitted `#4c9ee0`, under_review `#f2c94c`,
  accepted `#4cb782`, waitlisted `#f2994a`, rejected `#eb5757`.
- Type: Inter via `next/font/google`. Base 13px / 20px line-height; table rows 13px; labels 12px; page titles 15px
  medium; hero (landing only) 40px semibold tight. Weights 400/500/600 only. No all-caps labels.
- Landing exception: `src/app/landing.css` pairs Aleo light (serif) with Inter in headings, uses notched mono
  uppercase buttons, and draws a halftone skyline on canvas. The layout borrows from the Twenty landing page.
  None of this applies inside the app.
- Radius 6px on controls, 8px on panels. Borders 1px, never shadows except the command palette and popovers.
- Layout: left sidebar 232px (workspace name, nav with icons, Roadie mini at bottom for applicants), 40px top bar with
  breadcrumbs, content max-width 1040px for forms, full width for tables. The applicant sidebar lists only tracks
  the applicant has started; new tracks begin from the home page.
- First application: while an applicant has exactly one draft and nothing submitted, the shell drops the sidebar
  (`src/app/app/FocusedShell.tsx`): a 48px bar with the wordmark, a two-step rail (pick a guide, the application),
  the guide chip, and sign out. `/app` redirects to the current step. Once a guide is chosen, the form opens the
  Roadie chat once per session with an introduction to the first open question (`walkthrough` on
  `AssistantPanel`). Submitting, or starting a second track, brings back the full shell.
- Density: 32px row height in tables, 28px controls, 8px/12px/16px/24px spacing rhythm.
- Keyboard: `Cmd/Ctrl+K` command palette everywhere; in the organizer list `j`/`k` move, `Enter` opens,
  `1..6` sets status filter; in the detail view `[`/`]` go to previous/next application.
- Status icon: a 14px circle. draft dashed, submitted hollow, under_review half-filled, accepted check-in-circle,
  waitlisted clock-ish, rejected x-in-circle. Implement as one `StatusIcon` component.
- Motion: 120ms ease-out on hover/focus states; no page-entrance animations. The one orchestrated moment is the
  Roadie hatch on creation.
- Copy: sentence case, plain verbs, buttons say what happens ("Submit application", "Save draft", "Set decision").

## Repo layout and file ownership (parallel agents: touch only your paths)

```
supabase/migrations/0001_init.sql     schema (owned by: foundation/data)
supabase/seed.sql                     empty placeholder; real seeding is scripts/seed.ts
scripts/seed.ts                       creates demo users + applications via service role (foundation/data)
src/lib/supabase/{client,server,admin}.ts   given (do not edit)
src/lib/types.ts                      domain enums/types (given; extend only by appending)
src/lib/database.types.ts             generated: `npx supabase gen types typescript --local` (foundation/data)
src/lib/forms/tracks.ts               form + rubric definitions per track (foundation/data)
src/lib/forms/schema.ts               zod builder from a form definition (foundation/data)
src/lib/data/*.ts                     server-only queries + server actions (foundation/data)
src/lib/pet/*                         engine, voice, names (foundation/pet)
src/components/pet/*                  PetSprite, RoadieDock, RoadieCard, RoadieQuiz (foundation/pet)
src/components/ui/*                   Button, Input, Textarea, Select, Checkbox, RadioGroup, Badge, StatusIcon,
                                      Table, Kbd, Tooltip, Dialog, Toast, EmptyState, Spinner (foundation/ui)
src/components/shell/*                Sidebar, Topbar, CommandPalette, AppShell (foundation/ui)
src/app/globals.css, src/app/layout.tsx   given tokens; foundation/ui may refine
src/app/page.tsx                      landing (features/auth)
src/app/(auth)/*                      sign-in, sign-up, actions (features/auth)
src/app/auth/sign-out/route.ts        (features/auth)
src/proxy.ts                          given (features/auth may refine)
src/app/app/*                         applicant routes (features/applicant)
src/app/org/*                         organizer routes (features/organizer)
tests/unit/*                          vitest (each owner adds tests for their logic)
tests/e2e/*                           playwright (verification phase)
```

Conventions:
- Server components by default. `"use client"` only for interactivity. Data access only through `src/lib/data`.
- Server actions return `{ok: true, data} | {ok: false, error}`; never throw to the client.
- Never use the service-role client in request handling except the organizer-invite role grant and the seed script.
- TypeScript strict, no `any`. Use the generated `Database` type for Supabase clients.
- No comments that restate code. Name things by domain: application, track, review, decision, roadie.
- Commit messages follow Conventional Commits. Agents do not commit; the orchestrator commits per phase.

## Roadie assistant

An applicant on `/app/apply/[track]` can open a chat with their Roadie and ask about the form. The Roadie answers
in its own tone and does one of three things: highlights a field, offers a short example answer, or clarifies what
a question means. It never fills in the application on its own.

- Open: Cmd/Ctrl+J toggles the panel; Escape closes it. The RoadieDock shows an "Ask <name> ⌘J" button on the form.
  Opening the panel keeps the field the applicant was in as context.
- Input: typed (Enter sends, Shift+Enter is a newline) or spoken through the Web Speech API when the browser
  supports it. The mic button is hidden otherwise.
- Contract: `POST /api/assistant` with `{track, fieldKey?, answers, messages}` returns
  `{message, action?}` where `action` is `highlight {fieldKey}`, `example {fieldKey, text}`, or
  `clarify {fieldKey?, text}`. Field keys not in the track definition are dropped. The route requires an applicant
  session (401 otherwise), validates the body with zod, loads the definition server-side, keeps the last 8
  messages at 2000 characters each, and allows 20 requests per user per minute (429 beyond that).
- Actions in the UI: highlight scrolls to and focuses the field with a two second ring; example shows the text with
  a "Use this" button that fills text, textarea, url, and number fields and matches option labels for selects;
  clarify renders the text and highlights the field when one is named.
- Providers: `src/lib/ai/provider.ts` calls Groq (`openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`) or
  OpenRouter (`google/gemma-4-31b-it:free`, fallback `google/gemma-4-26b-a4b-it:free`) with JSON output. `AI_PROVIDER`
  and `AI_MODEL` override the choice. On failure the fallback model is tried once, then the offline guide answers.
- Offline guide: `src/lib/ai/offline.ts` needs no key or network. It picks the focused field or a field named in the
  message and answers from the hint, placeholder, and options. It falls back to the first missing required field
  only when the message asks for direction; a greeting gets a pointer to that field, not an example. This is what
  runs when no key is configured. See ADR 0004.
- The pet itself stays derived, not generated (ADR 0003). Only chat replies come from a model.

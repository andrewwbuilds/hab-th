@AGENTS.md

# Encore (hab-th)

Hackathon application portal. Read `docs/SPEC.md` before changing anything; it is the source of truth for roles,
the application lifecycle, the data model, routes, the Roadie pet rules, and the design system.

## Layout

- `src/app/` routes: `(auth)` sign-in/up, `app/` applicant, `org/` organizer, `auth/sign-out` route handler.
  `app/focus.ts` decides when the applicant is on their first application; `app/FocusedShell.tsx` is the
  sidebar-free shell used then.
- `src/lib/data/` all Supabase access and server actions. Nothing else imports the Supabase client directly.
- `src/lib/forms/tracks.ts` questions and rubric per track; `src/lib/forms/schema.ts` zod + completion helpers.
- `src/lib/pet/` Roadie derivation, names, voice. `src/components/pet/` sprite, dock, quiz, card.
- `src/components/ui/` Linear-style kit. `src/components/shell/` sidebar, topbar, command palette.
- `supabase/migrations/` schema. `scripts/seed.ts` demo data. `tests/unit` vitest, `tests/e2e` playwright.

## Commands

`npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`,
`npm run db:start` / `db:stop` / `db:reset`, `npm run db:types`, `npm run seed`.

## Gotchas

- Next.js 16: `params`, `searchParams`, `cookies()` are async. `src/proxy.ts` replaces `middleware.ts`.
- Tailwind v4: tokens live in `src/app/globals.css` under `@theme`; there is no `tailwind.config`.
- `src/lib/database.types.ts` is generated. Change the SQL migration, then `npm run db:types`.
- Role checks: `proxy.ts` redirects, but every page and action re-checks with `requireRole` / RLS.
- Applicants may only update `draft` applications; the trigger `protect_application_transition` enforces it.
- The path contains a space. Quote it in shell commands.
- Commit messages: Conventional Commits, no agent attribution trailers.

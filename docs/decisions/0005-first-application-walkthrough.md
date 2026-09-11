# 5. The first application runs without the sidebar

Date: 2026-09-11

## Context

Sign-up creates one draft and dropped the applicant into the full app shell: a sidebar listing all four tracks,
a home page with every track, and a Roadie that only spoke up if they found the guide picker. New applicants
have one thing to do, and the shell made that one thing look like one of many.

## Decision

While an applicant has exactly one draft and nothing submitted (`firstApplication` in `src/app/app/focus.ts`),
the layout renders `FocusedShell` instead of `AppShell`: no sidebar, a two-step rail (pick a guide, the
application), the guide chip, and sign out. Sign-up lands on the guide picker with `next` set to the form, and
the picker offers "Skip for now". Once a guide exists, the form opens the Roadie chat once per session with an
introduction to the first open question; questions go through the existing text and voice input.

The state is derived from data already loaded for the layout. There is no onboarding flag on the profile.

## Consequences

- Submitting, or starting a second track, brings the full shell back. The applicant sidebar now lists only
  started tracks; new tracks start from the home page.
- `/app` redirects during the first application, so nothing links there until the shell returns.
- The guide stays optional, as the spec requires: skipping is one click and the form never blocks on it.

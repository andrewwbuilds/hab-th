# 1. Store application answers as jsonb keyed by a code-defined form definition

Date: 2026-09-10

## Context

Four account types each have their own application, and hackathon organizers rewrite questions every season.
One column per question would mean a migration for every copy change and four near-duplicate tables.

## Decision

`applications.answers` is `jsonb`. The questions, sections, hints, and grading rubric for each track live in
`src/lib/forms/tracks.ts`. A zod schema is built from that definition on submit, and the organizer detail view renders
answers by walking the same definition.

## Consequences

Adding a question is a one-line change in one file. Queries that filter on a specific answer need a jsonb expression
(acceptable at this scale). The definition is versioned with the code, so old applications render with the current
labels; if a key is removed, its stored value is simply not displayed.

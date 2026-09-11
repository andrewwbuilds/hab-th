# 7. The Roadie fills quick answers from conversation and never touches an essay

Date: 2026-09-11

## Context

The assistant could point at fields, explain them, and offer examples, but the applicant still typed every
answer. Most of a form is facts about the person: school, year, links, sizes, skills, team status. Those are
tedious to type and trivial to say. The written answers are the opposite: reviewers grade them, and a drafted
essay is worth nothing to anyone. Voice input was one utterance at a time, which is dictation, not a
conversation.

## Decision

Fields carry an `essay: true` flag in `src/lib/forms/tracks.ts`. Everything else is fillable. The guide contract
gains a `fill` action with a list of `{fieldKey, value}`; `src/lib/ai/fill.ts` coerces each value to its field
type and drops the rest. The essay rule is enforced in three places, on purpose: `sanitizeFills` on the server
drops essay keys, `parseGuideResponse` turns an example offered for an essay into coaching built from the field
hint (the model's text is discarded, not trimmed), and the panel never shows "Use this" for an essay. The system
prompt asks the model to decline essay requests and respond with two or three questions instead, but the prompt
is advice; the code is the guardrail.

The offline guide gets a regular-expression extractor so a demo without keys still fills links, years,
pronouns, option labels, and school or employer phrases from a plain statement. Questions are left alone.

Live voice stays in the browser: continuous Web Speech recognition sends each finished sentence, and
`speechSynthesis` reads the reply back in a rate and pitch chosen by the pet's tone. The mic closes while the
Roadie speaks and reopens after. A hosted speech-to-speech API would sound better, but it adds cost, a socket,
and a key, and the browser path works offline with the deterministic guide.

Fills go through the form's own `setAnswer`, so autosave, validation, and the completion meter see them like
typed input. The panel keeps the previous values and offers Undo per fill.

## Consequences

- An applicant can finish the non-essay half of a form in one breath. The intro says so up front and lists
  what is still open, so the feature is discoverable without a tour.
- No path exists for model text to land in an essay field, even if the prompt is ignored or the model is
  swapped. Tests cover fills for essay keys and essay examples.
- Browser voices vary by platform, and Chrome ends continuous recognition on silence, so the hook restarts it.
  Safari on iOS is the weakest; the buttons hide entirely where recognition is missing.
- Two fill paths (model and offline extractor) share one sanitizer, so the contract changes in one place.

# 8. The Roadie asks one question at a time and reads a resume for the rest

Date: 2026-09-11

## Context

Free-form conversation with the Roadie went badly over voice. A spoken paragraph arrived as run-on lowercase
text, the model guessed at which field a fact belonged to, and a one-word answer with no context ("he him")
was matched against the field placeholder and came back as she/her. Optional fields were never reached because
nothing asked for them. Most of what the quick answers want is already on the applicant's resume.

## Decision

The guide runs a walk-through. It asks one field at a time in form order, every empty fillable field whether
required or optional, then each empty essay. Each reply carries `ask {fieldKey}`, the panel sends it back as
`asking` with the next message, and keeps an `asked` list so a checkbox answered "no" or a skipped optional
field is not asked twice. Both the model prompt and the offline guide treat the reply as the answer to the
asked field unless it is clearly a question. `answerFor` in `src/lib/ai/offline.ts` does the coercion without a
model: pronoun words to a slash set with no substitution, "dot" and "slash" to a URL, a year inside a sentence,
option labels, and a stripped lead-in for free text. The intro tells the applicant to answer one question at a
time in a few words, which is what the recogniser hears best.

A resume upload sits in the same chat. `POST /api/resume` takes a PDF or text file, extracts the text with
`unpdf` (no native dependency, runs in a route handler), and asks the model for every fillable field the resume
supports plus up to three essay topics per essay: a project, a role, a result, with a one-line angle. Topics
are pointers, not drafts. `sanitizeTopics` keeps only essay keys, trims to 160 characters, and caps three per
essay, so the essay guardrail from ADR 7 holds: no model text can land in an essay field and no paragraph can
hide in a topic. The reply message is written server-side from what was actually set, so the model cannot claim
a fill that was dropped. Without a key, the regex extractor reads the resume and capitalised title lines become
topics.

Voice stays as input only. Replies are text; nothing is read aloud (see the amendment on ADR 7).

## Consequences

- The applicant hears one short question, answers it, and the value lands in that field. Optional fields get
  asked and can be skipped in a word.
- A resume fills most of the quick answers in one step and the walk-through resumes at the first gap.
- `asked` lives in the panel for the session. Reopening the page starts the walk-through again from the first
  empty field, which is what a returning applicant wants anyway.
- Scanned PDFs have no text layer and are refused with a message saying so.

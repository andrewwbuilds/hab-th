# 4. The Roadie assistant calls an LLM, with a deterministic offline fallback

Date: 2026-09-10

## Context

Applicants can open a chat with their Roadie on the application form and ask where a field is, what a question
means, or for an example answer. Hand-written lines cannot cover free-form questions, so this needs a model.
The demo may run without any API key, and free-tier providers rate-limit or drop models without notice.

## Decision

`src/lib/ai/provider.ts` calls an OpenAI-compatible chat completions endpoint (Groq first, else OpenRouter) with
plain `fetch`, asks for a JSON object that matches a small zod contract, and retries once on a fallback model.
When there is no key, or every attempt fails, `src/lib/ai/offline.ts` answers instead: it picks the relevant field
from the focused key or a keyword match (the first missing required field only when the message asks what to do
next) and builds the reply from the field's hint, placeholder, and options. The route always returns 200 with a
guide response so the panel never dead-ends. A per-user in-memory limit of 20 requests a minute bounds provider
spend; `scripts/deploy.sh` forwards the AI keys to Vercel only when they are exported before it runs.

ADR 0003 still holds for the pet itself. The Roadie's species, palette, traits, and dock lines stay derived;
only the chat answers come from a model, and the model speaks in the pet's tone through the system prompt.

## Consequences

The feature works in the demo without a key, and unit tests cover the offline guide and the response parsing
without network. Model output is validated: unknown field keys are dropped and invalid JSON becomes a plain
message. Keys and raw provider errors stay on the server. The trade is two code paths to keep in step when the
contract changes.

# 6. Selfie guides are redrawn by an image model, with the pixel treatment as the fallback

Date: 2026-09-11

## Context

The guide picker let applicants use a selfie, but only by pixelating it in the browser. The rest of the site is
anime-inspired pixel illustration, so a mosaic of a photo looked like the odd one out. Turning a photo into that
style is an image-to-image job, and the app's existing model access is Groq first, OpenRouter second.

Groq serves no model with image output, only vision input. OpenRouter's Images API does take a reference image,
but none of its image models are free: the cheapest that accept a photo are Google's Gemini image models at about
four cents a portrait.

## Decision

`POST /api/portrait` sends the squared 512px selfie to OpenRouter's Images API with a fixed house-style prompt
(`src/lib/ai/portrait.ts`) and the photo as `input_references`. Default model `google/gemini-3.1-flash-lite-image`,
one retry on `google/gemini-2.5-flash-image`, `AI_IMAGE_MODEL` overrides the primary. The browser shrinks the
result to 256px and saves it as a new `portrait` guide kind, rendered smooth, while `photo` stays the pixelated
kind so older rows keep working.

The route needs `OPENROUTER_API_KEY` even when Groq answers the chat, and honours `AI_PROVIDER=offline`. Without a
key it returns `503 {offline: true}` and the picker keeps the pixel slider, so the demo still works with no key.
A separate limiter key allows six portraits per user per minute, since each one is billed.

## Consequences

Selfie guides match the artwork instead of looking like a filter. The pet itself is still derived (ADR 0003): the
model only restyles a face the applicant supplied. The trade is a paid call per portrait and a ten-second wait,
which the picker shows with a dimmed preview; the pixel path is kept as the fallback rather than deleted, so
there are two rendering paths for user photos.

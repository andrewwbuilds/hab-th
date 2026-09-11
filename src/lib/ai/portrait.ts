/**
 * Pure helpers for the selfie portrait: the style prompt, the OpenRouter Images request body, and the
 * response parser. No network here so the unit tests can cover it; `portrait-provider.ts` does the fetch.
 */

export const PORTRAIT_PROMPT = [
  "Redraw the person in the reference photo as an anime-inspired illustrated character portrait in the Encore",
  "hackathon house style: clean confident linework, soft cel shading, a faint hand-placed pixel dither texture,",
  "warm expressive eyes. Head and shoulders, centred, facing the viewer, on a plain deep indigo background.",
  "Palette: charcoal #08090a, periwinkle #5e6ad2, lavender #8b93ea, with restrained amber rim light.",
  "Keep the person recognisable: same face shape, hair, skin tone, glasses, facial hair and clothing.",
  "Square composition. No text, no watermark, no border, no photo filter look.",
].join(" ");

export interface PortraitRequest {
  model: string;
  prompt: string;
  input_references: [{ type: "image_url"; image_url: { url: string } }];
  aspect_ratio: "1:1";
  n: 1;
  user: string;
}

/** `user` is hashed upstream by OpenRouter; it only gives the provider a stable per-user identity for abuse checks. */
export function buildPortraitRequest(model: string, photo: string, user: string): PortraitRequest {
  return {
    model,
    prompt: PORTRAIT_PROMPT,
    input_references: [{ type: "image_url", image_url: { url: photo } }],
    aspect_ratio: "1:1",
    n: 1,
    user,
  };
}

const BASE64 = /^[A-Za-z0-9+/]+=*$/;

/** Returns the first generated image as a data URL, or undefined when the body is not an Images API result. */
export function parsePortraitResponse(json: unknown): string | undefined {
  if (typeof json !== "object" || json === null) return undefined;
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length === 0) return undefined;
  const first: unknown = data[0];
  if (typeof first !== "object" || first === null) return undefined;
  const { b64_json: b64, media_type: mediaType } = first as { b64_json?: unknown; media_type?: unknown };
  if (typeof b64 !== "string" || b64.length === 0 || !BASE64.test(b64)) return undefined;
  const type = typeof mediaType === "string" && /^image\/(png|jpeg|webp)$/.test(mediaType) ? mediaType : "image/png";
  return `data:${type};base64,${b64}`;
}

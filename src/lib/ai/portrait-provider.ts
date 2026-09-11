import "server-only";
import { resolveImageProvider, type ImageProviderConfig } from "@/lib/ai/config";
import { openrouterHeaders, retryable } from "@/lib/ai/http";
import { buildPortraitRequest, parsePortraitResponse } from "@/lib/ai/portrait";

/** Image models take 5 to 20 seconds; leave room for one retry inside the route's maxDuration. */
const TOTAL_TIMEOUT_MS = 50_000;
const MIN_ATTEMPT_MS = 8_000;

export type PortraitResult = { ok: true; image: string } | { ok: false; reason: "offline" | "failed" };

type Attempt = { ok: true; image: string } | { ok: false; reason: string; retry: boolean };

async function generate(
  config: ImageProviderConfig,
  model: string,
  photo: string,
  userId: string,
  timeoutMs: number,
): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: openrouterHeaders(config.apiKey),
      body: JSON.stringify(buildPortraitRequest(model, photo, userId)),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `http ${response.status}`, retry: retryable(response.status) };
    const image = parsePortraitResponse(await response.json());
    if (!image) return { ok: false, reason: "no image in response", retry: true };
    return { ok: true, image };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : "network", retry: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Redraws a square PNG selfie (data URL) in the Encore style through OpenRouter's Images API, retrying once
 * on the fallback model. `offline` means no key is configured; the picker then keeps the pixel treatment.
 * Never throws.
 */
export async function stylizePortrait(photo: string, userId: string): Promise<PortraitResult> {
  const config = resolveImageProvider(process.env);
  if (!config) return { ok: false, reason: "offline" };
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  for (const model of config.models) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    const attempt = await generate(config, model, photo, userId, remaining);
    if (attempt.ok) return attempt;
    console.warn(`[portrait] openrouter/${model} failed: ${attempt.reason}`);
    if (!attempt.retry) break;
  }
  return { ok: false, reason: "failed" };
}

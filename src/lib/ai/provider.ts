import "server-only";
import type { PetSpec } from "@/lib/types";
import { fieldKeysOf, parseGuideResponse, type GuideInput, type GuideResponse } from "@/lib/ai/guide";
import { resolveProvider, type ProviderConfig } from "@/lib/ai/config";
import { openrouterHeaders, retryable } from "@/lib/ai/http";
import { offlineGuide } from "@/lib/ai/offline";
import { buildSystemPrompt } from "@/lib/ai/prompt";

const TOTAL_TIMEOUT_MS = 20_000;
const MIN_ATTEMPT_MS = 1_500;
const MAX_OUTPUT_TOKENS = 400;

const GUIDE_JSON_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    action: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          properties: { type: { type: "string", enum: ["highlight"] }, fieldKey: { type: "string" } },
          required: ["type", "fieldKey"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["example"] },
            fieldKey: { type: "string" },
            text: { type: "string" },
          },
          required: ["type", "fieldKey", "text"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["clarify"] },
            fieldKey: { type: ["string", "null"] },
            text: { type: "string" },
          },
          required: ["type", "fieldKey", "text"],
          additionalProperties: false,
        },
      ],
    },
  },
  required: ["message", "action"],
  additionalProperties: false,
} as const;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type Attempt = { ok: true; text: string } | { ok: false; reason: string; retry: boolean };

function responseFormat(config: ProviderConfig): Record<string, unknown> {
  if (config.name === "groq") {
    return { type: "json_schema", json_schema: { name: "roadie_guide", strict: true, schema: GUIDE_JSON_SCHEMA } };
  }
  return { type: "json_object" };
}

function headersFor(config: ProviderConfig): Record<string, string> {
  if (config.name === "openrouter") return openrouterHeaders(config.apiKey);
  return { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` };
}

async function chat(config: ProviderConfig, model: string, messages: ChatMessage[], timeoutMs: number): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: headersFor(config),
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: responseFormat(config),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, reason: `http ${response.status}`, retry: retryable(response.status) };
    }
    const json: unknown = await response.json();
    const text = extractContent(json);
    if (!text) return { ok: false, reason: "empty completion", retry: true };
    return { ok: true, text };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : "network", retry: true };
  } finally {
    clearTimeout(timer);
  }
}

function extractContent(json: unknown): string | undefined {
  if (typeof json !== "object" || json === null) return undefined;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first: unknown = choices[0];
  if (typeof first !== "object" || first === null) return undefined;
  const message = (first as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return undefined;
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" && content.trim() ? content : undefined;
}

export interface AskGuideInput extends GuideInput {
  pet: PetSpec | null;
}

function lastUserMessage(input: GuideInput): string {
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (message?.role === "user") return message.content;
  }
  return "";
}

function offline(input: GuideInput): GuideResponse {
  return offlineGuide({
    definition: input.definition,
    answers: input.answers,
    fieldKey: input.fieldKey,
    message: lastUserMessage(input),
  });
}

/**
 * Asks the configured provider, retrying once on the fallback model, and answers from the
 * offline guide when there is no key or every attempt fails. Never throws.
 */
export async function askGuide(input: AskGuideInput): Promise<GuideResponse> {
  const config = resolveProvider(process.env);
  if (config.name === "offline") return offline(input);

  const system = buildSystemPrompt({
    definition: input.definition,
    answers: input.answers,
    fieldKey: input.fieldKey,
    pet: input.pet,
  });
  const messages: ChatMessage[] = [{ role: "system", content: system }, ...input.messages];
  const validKeys = fieldKeysOf(input.definition);
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  for (const model of config.models) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    const attempt = await chat(config, model, messages, remaining);
    if (attempt.ok) return parseGuideResponse(attempt.text, validKeys);
    console.warn(`[assistant] ${config.name}/${model} failed: ${attempt.reason}`);
    if (!attempt.retry) break;
  }
  return offline(input);
}

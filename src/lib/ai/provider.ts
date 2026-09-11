import "server-only";
import type { PetSpec } from "@/lib/types";
import { GUIDE_JSON_SCHEMA, parseGuideResponse, type GuideInput, type GuideResponse } from "@/lib/ai/guide";
import { resolveProviders, type ProviderConfig } from "@/lib/ai/config";
import { openrouterHeaders, retryable } from "@/lib/ai/http";
import { offlineGuide } from "@/lib/ai/offline";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { RESUME_JSON_SCHEMA, buildResumePrompt, offlineResume, parseResumeResponse, type ResumePromptInput } from "@/lib/ai/resume";

const CHAT_BUDGET_MS = 20_000;
/** A resume is a longer prompt and a longer answer, and the route allows a minute. */
const RESUME_BUDGET_MS = 45_000;
const MIN_ATTEMPT_MS = 1_500;
const MAX_OUTPUT_TOKENS = 700;
const RESUME_OUTPUT_TOKENS = 1_400;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type Attempt = { ok: true; text: string } | { ok: false; reason: string; retry: boolean };

type JsonSchema = typeof GUIDE_JSON_SCHEMA | typeof RESUME_JSON_SCHEMA;

function responseFormat(config: ProviderConfig, name: string, schema: JsonSchema): Record<string, unknown> {
  if (config.name === "groq") {
    return { type: "json_schema", json_schema: { name, strict: true, schema } };
  }
  return { type: "json_object" };
}

function headersFor(config: ProviderConfig): Record<string, string> {
  if (config.name === "openrouter") return openrouterHeaders(config.apiKey);
  return { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` };
}

async function chat(
  config: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  timeoutMs: number,
  format: Record<string, unknown>,
  maxTokens: number,
): Promise<Attempt> {
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
        max_tokens: maxTokens,
        response_format: format,
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
    asking: input.asking,
    asked: input.asked,
    message: lastUserMessage(input),
  });
}

interface Job {
  schemaName: string;
  schema: JsonSchema;
  label: string;
  budgetMs: number;
  maxTokens: number;
}

/**
 * Tries every model of every keyed provider, primary first, until one answers within the budget.
 * A rate-limited model fails in well under a second, so a long chain costs little. Undefined means
 * every attempt failed and the caller should answer offline.
 */
async function complete(providers: ProviderConfig[], messages: ChatMessage[], job: Job): Promise<string | undefined> {
  const deadline = Date.now() + job.budgetMs;
  for (const config of providers) {
    const format = responseFormat(config, job.schemaName, job.schema);
    for (const model of config.models) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) return undefined;
      const attempt = await chat(config, model, messages, remaining, format, job.maxTokens);
      if (attempt.ok) return attempt.text;
      console.warn(`[${job.label}] ${config.name}/${model} failed: ${attempt.reason}`);
      if (!attempt.retry) break;
    }
  }
  return undefined;
}

const GUIDE_JOB: Job = { schemaName: "roadie_guide", schema: GUIDE_JSON_SCHEMA, label: "assistant", budgetMs: CHAT_BUDGET_MS, maxTokens: MAX_OUTPUT_TOKENS };
const RESUME_JOB: Job = { schemaName: "roadie_resume", schema: RESUME_JSON_SCHEMA, label: "resume", budgetMs: RESUME_BUDGET_MS, maxTokens: RESUME_OUTPUT_TOKENS };

/**
 * Asks the configured provider, retrying once on the fallback model, and answers from the
 * offline guide when there is no key or every attempt fails. Never throws.
 */
export async function askGuide(input: AskGuideInput): Promise<GuideResponse> {
  const providers = resolveProviders(process.env);
  if (providers.length === 0) return offline(input);

  const system = buildSystemPrompt({
    definition: input.definition,
    answers: input.answers,
    fieldKey: input.fieldKey,
    asking: input.asking,
    asked: input.asked,
    pet: input.pet,
  });
  const messages: ChatMessage[] = [{ role: "system", content: system }, ...input.messages];
  const text = await complete(providers, messages, GUIDE_JOB);
  return text ? parseGuideResponse(text, input.definition) : offline(input);
}

/** Reads a resume into fills and essay topics, falling back to the regex reader. Never throws. */
export async function askResume(input: ResumePromptInput): Promise<GuideResponse> {
  const providers = resolveProviders(process.env);
  if (providers.length === 0) return offlineResume(input.definition, input.answers, input.resume);
  const messages: ChatMessage[] = [
    { role: "system", content: buildResumePrompt(input) },
    { role: "user", content: "Read the resume above. Fill what it supports and suggest essay topics." },
  ];
  const text = await complete(providers, messages, RESUME_JOB);
  return text
    ? parseResumeResponse(text, input.definition, input.answers, input.resume)
    : offlineResume(input.definition, input.answers, input.resume);
}

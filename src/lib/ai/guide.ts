import { z } from "zod";
import { TRACKS } from "@/lib/types";
import type { Answers } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";

export const MAX_MESSAGES = 8;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_ANSWER_CHARS = 600;

const answerValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

export const guideMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_MESSAGE_CHARS * 10),
});

export const guideRequestSchema = z.object({
  track: z.enum(TRACKS),
  fieldKey: z.string().max(80).optional(),
  answers: z.record(z.string(), answerValueSchema).default({}),
  messages: z.array(guideMessageSchema).min(1).max(MAX_MESSAGES * 5),
});

export type GuideMessage = z.infer<typeof guideMessageSchema>;
export type GuideRequest = z.infer<typeof guideRequestSchema>;

export const guideActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("highlight"), fieldKey: z.string() }),
  z.object({ type: z.literal("example"), fieldKey: z.string(), text: z.string() }),
  z.object({ type: z.literal("clarify"), fieldKey: z.string().nullish(), text: z.string() }),
]);

export const guideResponseSchema = z.object({
  message: z.string(),
  action: guideActionSchema.nullish(),
});

export type GuideAction =
  | { type: "highlight"; fieldKey: string }
  | { type: "example"; fieldKey: string; text: string }
  | { type: "clarify"; fieldKey?: string; text: string };

export interface GuideResponse {
  message: string;
  action?: GuideAction;
}

/** What the guide needs beyond the request: the server-side definition and the current answers. */
export interface GuideInput {
  definition: FormDefinition;
  answers: Answers;
  fieldKey?: string;
  messages: GuideMessage[];
}

export function fieldsOf(definition: FormDefinition): FieldDef[] {
  return definition.sections.flatMap((section) => section.fields);
}

export function fieldKeysOf(definition: FormDefinition): Set<string> {
  return new Set(fieldsOf(definition).map((field) => field.key));
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start > 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/**
 * Turns model output into a GuideResponse. Invalid JSON becomes a plain message with no
 * action; an action naming a field that is not in the definition is dropped.
 */
export function parseGuideResponse(raw: string, validKeys: Set<string>): GuideResponse {
  let json: unknown;
  try {
    json = JSON.parse(stripFences(raw));
  } catch {
    return { message: raw.trim() };
  }
  const parsed = guideResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { message: raw.trim() };
  }
  const { message, action } = parsed.data;
  const out: GuideResponse = { message: message.trim() };
  if (!action) return withFallbackMessage(out);
  switch (action.type) {
    case "highlight":
      if (validKeys.has(action.fieldKey)) out.action = { type: "highlight", fieldKey: action.fieldKey };
      break;
    case "example":
      if (validKeys.has(action.fieldKey) && action.text.trim()) {
        out.action = { type: "example", fieldKey: action.fieldKey, text: action.text.trim() };
      }
      break;
    case "clarify":
      if (action.text.trim()) {
        out.action = {
          type: "clarify",
          text: action.text.trim(),
          ...(action.fieldKey && validKeys.has(action.fieldKey) ? { fieldKey: action.fieldKey } : {}),
        };
      }
      break;
  }
  return withFallbackMessage(out);
}

function withFallbackMessage(response: GuideResponse): GuideResponse {
  if (response.message) return response;
  const text = response.action && "text" in response.action ? response.action.text : "";
  return { ...response, message: text || "Ask me about any field and I will point you to it." };
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

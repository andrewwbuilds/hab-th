import { z } from "zod";
import { TRACKS } from "@/lib/types";
import type { Answers, AnswerValue } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";
import { isEssay, sanitizeFills, type Fill } from "@/lib/ai/fill";

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
  /** The field the guide's last message asked about; the next reply is probably its answer. */
  asking: z.string().max(80).optional(),
  /** Fields already asked this session, so a "no" on a checkbox or a skipped optional is not asked again. */
  asked: z.array(z.string().max(80)).max(80).default([]),
  answers: z.record(z.string(), answerValueSchema).default({}),
  messages: z.array(guideMessageSchema).min(1).max(MAX_MESSAGES * 5),
});

export type GuideMessage = z.infer<typeof guideMessageSchema>;
export type GuideRequest = z.infer<typeof guideRequestSchema>;

export const rawFillSchema = z.object({ fieldKey: z.string(), value: answerValueSchema });

export const guideActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("highlight"), fieldKey: z.string() }),
  z.object({ type: z.literal("example"), fieldKey: z.string(), text: z.string() }),
  z.object({ type: z.literal("clarify"), fieldKey: z.string().nullish(), text: z.string() }),
  z.object({ type: z.literal("fill"), fields: z.array(rawFillSchema).max(40) }),
]);

export const rawTopicSchema = z.object({ fieldKey: z.string(), title: z.string(), angle: z.string().default("") });

export const guideResponseSchema = z.object({
  message: z.string(),
  action: guideActionSchema.nullish(),
  ask: z.object({ fieldKey: z.string() }).nullish(),
  topics: z.array(rawTopicSchema).max(20).nullish(),
});

/** The same contract as guideResponseSchema, in the shape strict providers (Groq) accept. */
export const GUIDE_JSON_SCHEMA = {
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
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["fill"] },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: { fieldKey: { type: "string" }, value: { type: "string" } },
                required: ["fieldKey", "value"],
                additionalProperties: false,
              },
            },
          },
          required: ["type", "fields"],
          additionalProperties: false,
        },
      ],
    },
    ask: {
      anyOf: [
        { type: "null" },
        { type: "object", properties: { fieldKey: { type: "string" } }, required: ["fieldKey"], additionalProperties: false },
      ],
    },
  },
  required: ["message", "action", "ask"],
  additionalProperties: false,
} as const;

export type GuideAction =
  | { type: "highlight"; fieldKey: string }
  | { type: "example"; fieldKey: string; text: string }
  | { type: "clarify"; fieldKey?: string; text: string }
  | { type: "fill"; fields: Fill[] };

export type { Fill, AnswerValue };

/** A pointer at something the applicant could write an essay about. Never a draft. */
export interface EssayTopic {
  fieldKey: string;
  title: string;
  angle: string;
}

export interface GuideResponse {
  message: string;
  action?: GuideAction;
  /** The one field the message asks about. The panel sends it back as `asking` with the reply. */
  ask?: { fieldKey: string };
  /** Essay ideas, only ever for essay fields. Set by the resume flow. */
  topics?: EssayTopic[];
}

export const MAX_TOPIC_CHARS = 160;
export const MAX_TOPICS_PER_ESSAY = 3;

/** Keeps topics that point at an essay field, trimmed and capped so a paragraph cannot hide in one. */
export function sanitizeTopics(
  definition: FormDefinition,
  raw: ReadonlyArray<{ fieldKey: string; title: string; angle?: string }>,
): EssayTopic[] {
  const essays = new Set(fieldsOf(definition).filter(isEssay).map((field) => field.key));
  const perField = new Map<string, number>();
  const out: EssayTopic[] = [];
  for (const topic of raw) {
    if (!essays.has(topic.fieldKey)) continue;
    const title = truncate(topic.title.replace(/\s+/g, " ").trim(), MAX_TOPIC_CHARS);
    if (!title) continue;
    const count = perField.get(topic.fieldKey) ?? 0;
    if (count >= MAX_TOPICS_PER_ESSAY) continue;
    perField.set(topic.fieldKey, count + 1);
    out.push({ fieldKey: topic.fieldKey, title, angle: truncate((topic.angle ?? "").replace(/\s+/g, " ").trim(), MAX_TOPIC_CHARS) });
  }
  return out;
}

/** What the guide needs beyond the request: the server-side definition and the current answers. */
export interface GuideInput {
  definition: FormDefinition;
  answers: Answers;
  fieldKey?: string;
  asking?: string;
  asked: string[];
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

/** Coaching text for an essay field: the hint plus the rule, never the model's draft. */
export function essayCoaching(field: FieldDef): string {
  return `${field.hint} Yours to write. Tell me what happened and I will ask questions.`;
}

/**
 * Turns model output into a GuideResponse. Invalid JSON becomes a plain message with no
 * action; an action naming a field that is not in the definition is dropped. Two guardrails
 * live here: fills never touch an essay, and an example offered for an essay becomes coaching.
 */
export function parseGuideResponse(raw: string, definition: FormDefinition): GuideResponse {
  const fields = new Map(fieldsOf(definition).map((field) => [field.key, field]));
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
  const { message, action, ask } = parsed.data;
  const out: GuideResponse = { message: message.trim() };
  if (ask && fields.has(ask.fieldKey)) out.ask = { fieldKey: ask.fieldKey };
  if (!action) return withFallbackMessage(out);
  switch (action.type) {
    case "highlight":
      if (fields.has(action.fieldKey)) out.action = { type: "highlight", fieldKey: action.fieldKey };
      break;
    case "example": {
      const field = fields.get(action.fieldKey);
      if (!field || !action.text.trim()) break;
      out.action = isEssay(field)
        ? { type: "clarify", fieldKey: field.key, text: essayCoaching(field) }
        : { type: "example", fieldKey: field.key, text: action.text.trim() };
      break;
    }
    case "clarify":
      if (action.text.trim()) {
        out.action = {
          type: "clarify",
          text: action.text.trim(),
          ...(action.fieldKey && fields.has(action.fieldKey) ? { fieldKey: action.fieldKey } : {}),
        };
      }
      break;
    case "fill": {
      const fills = sanitizeFills(definition, action.fields);
      if (fills.length > 0) out.action = { type: "fill", fields: fills };
      break;
    }
  }
  return withFallbackMessage(out);
}

/** Longer than this and the model has put its reasoning in the message; keep the first sentences. */
export const MAX_REPLY_CHARS = 320;

export function clipReply(message: string): string {
  if (message.length <= MAX_REPLY_CHARS) return message;
  const head = message.slice(0, MAX_REPLY_CHARS);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "), head.lastIndexOf(".\n"));
  return end > 40 ? head.slice(0, end + 1).trim() : truncate(message, MAX_REPLY_CHARS);
}

function withFallbackMessage(response: GuideResponse): GuideResponse {
  if (response.message) return { ...response, message: clipReply(response.message) };
  const text = response.action && "text" in response.action ? response.action.text : "";
  return { ...response, message: text || "Ask about any field." };
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

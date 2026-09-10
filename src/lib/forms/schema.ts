import { z } from "zod";
import type { Track } from "@/lib/types";
import { FORM_DEFINITIONS, type FieldDef } from "@/lib/forms/tracks";

export type AnswerValue = string | number | boolean | string[];
export type Answers = Record<string, AnswerValue>;

export type ValidationResult =
  | { ok: true; answers: Answers }
  | { ok: false; fieldErrors: Record<string, string> };

export interface Completion {
  percent: number;
  sectionsDone: string[];
  requiredMissing: string[];
}

const DEFAULT_MAX: Record<"text" | "textarea", number> = { text: 200, textarea: 2000 };

function optionValues(field: FieldDef): [string, ...string[]] {
  const values = (field.options ?? []).map((option) => option.value);
  if (values.length === 0) {
    throw new Error(`Field "${field.key}" has no options`);
  }
  return values as [string, ...string[]];
}

function toNumber(value: unknown): unknown {
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (value === "" || value === null) {
    return undefined;
  }
  return value;
}

function fieldSchema(field: FieldDef): z.ZodType {
  switch (field.type) {
    case "text":
    case "textarea": {
      const max = field.maxLength ?? DEFAULT_MAX[field.type];
      const base = z
        .string({ error: "This field is required" })
        .trim()
        .max(max, `Keep this under ${max} characters`);
      return field.required ? base.min(1, "This field is required") : base.optional();
    }
    case "url": {
      const url = z.url({ error: "Enter a full URL starting with https://" }).max(500);
      return field.required ? url : url.optional().or(z.literal(""));
    }
    case "number": {
      let num = z.number({ error: "Enter a number" }).int("Enter a whole number");
      if (field.min !== undefined) num = num.min(field.min, `Must be ${field.min} or later`);
      if (field.max !== undefined) num = num.max(field.max, `Must be ${field.max} or earlier`);
      return z.preprocess(toNumber, field.required ? num : num.optional());
    }
    case "select": {
      const options = z.enum(optionValues(field), { error: "Pick one of the options" });
      return field.required ? options : options.optional().or(z.literal(""));
    }
    case "multiselect": {
      const list = z.array(z.enum(optionValues(field), { error: "Pick from the listed options" }), {
        error: "Pick at least one",
      });
      return field.required ? list.min(1, "Pick at least one") : list.optional();
    }
    case "checkbox": {
      return field.required
        ? z.literal(true, { error: "You need to confirm this to submit" })
        : z.boolean().optional();
    }
  }
}

const schemaCache = new Map<Track, z.ZodObject<Record<string, z.ZodType>>>();

export function buildSchema(track: Track): z.ZodObject<Record<string, z.ZodType>> {
  const cached = schemaCache.get(track);
  if (cached) return cached;
  const shape: Record<string, z.ZodType> = {};
  for (const section of FORM_DEFINITIONS[track].sections) {
    for (const field of section.fields) {
      shape[field.key] = fieldSchema(field);
    }
  }
  const schema = z.object(shape);
  schemaCache.set(track, schema);
  return schema;
}

export function validateAnswers(track: Track, answers: unknown): ValidationResult {
  const input = typeof answers === "object" && answers !== null ? answers : {};
  const result = buildSchema(track).safeParse(input);
  if (result.success) {
    const clean: Answers = {};
    for (const [key, value] of Object.entries(result.data)) {
      if (value === undefined) continue;
      clean[key] = value as AnswerValue;
    }
    return { ok: true, answers: clean };
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!key || fieldErrors[key]) continue;
    fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

export function isAnswered(field: FieldDef, value: unknown): boolean {
  switch (field.type) {
    case "checkbox":
      return value === true;
    case "multiselect":
      return Array.isArray(value) && value.length > 0;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    default:
      return typeof value === "string" && value.trim().length > 0;
  }
}

export function completion(track: Track, answers: unknown): Completion {
  const values: Record<string, unknown> =
    typeof answers === "object" && answers !== null ? (answers as Record<string, unknown>) : {};
  const sectionsDone: string[] = [];
  const requiredMissing: string[] = [];
  let requiredTotal = 0;
  let requiredDone = 0;

  for (const section of FORM_DEFINITIONS[track].sections) {
    let sectionMissing = 0;
    let sectionAnswered = 0;
    for (const field of section.fields) {
      const answered = isAnswered(field, values[field.key]);
      if (answered) sectionAnswered += 1;
      if (!field.required) continue;
      requiredTotal += 1;
      if (answered) {
        requiredDone += 1;
      } else {
        requiredMissing.push(field.key);
        sectionMissing += 1;
      }
    }
    if (sectionMissing === 0 && sectionAnswered > 0) {
      sectionsDone.push(section.key);
    }
  }

  const percent = requiredTotal === 0 ? 100 : Math.round((requiredDone / requiredTotal) * 100);
  return { percent, sectionsDone, requiredMissing };
}

export function parseAnswers(value: unknown): Answers {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Answers = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      out[key] = raw;
    } else if (Array.isArray(raw) && raw.every((item) => typeof item === "string")) {
      out[key] = raw;
    }
  }
  return out;
}

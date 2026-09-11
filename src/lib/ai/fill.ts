import { isAnswered, type Answers, type AnswerValue } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";

/** One answer the guide wants to write into the form. */
export interface Fill {
  fieldKey: string;
  value: AnswerValue;
}

export function isEssay(field: FieldDef): boolean {
  return field.essay === true;
}

/** Every field the guide may write: anything that is not an essay. */
export function fillableFields(definition: FormDefinition): FieldDef[] {
  return definition.sections.flatMap((section) => section.fields.filter((field) => !isEssay(field)));
}

export function essayFields(definition: FormDefinition): FieldDef[] {
  return definition.sections.flatMap((section) => section.fields.filter(isEssay));
}

/** Fillable fields the applicant has not answered yet, in form order. */
export function openQuickFields(definition: FormDefinition, answers: Answers): FieldDef[] {
  return fillableFields(definition).filter((field) => !isAnswered(field, answers[field.key]));
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchOption(field: FieldDef, raw: string): string | undefined {
  const needle = normalise(raw);
  if (!needle) return undefined;
  const options = field.options ?? [];
  const exact = options.find(
    (option) => normalise(option.value) === needle || normalise(option.label) === needle,
  );
  if (exact) return exact.value;
  const loose = options.filter((option) => {
    const label = normalise(option.label);
    const head = label.split(/[:(]/)[0]?.trim() ?? label;
    return head === needle || label.startsWith(needle) || (needle.length >= 4 && head.includes(needle));
  });
  return loose.length === 1 ? loose[0]?.value : undefined;
}

function splitList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((item) => String(item));
  if (typeof raw !== "string") return [];
  return raw.split(/,|;|\n|\band\b|\bplus\b/).map((part) => part.trim()).filter(Boolean);
}

const TRUE_WORDS = new Set(["true", "yes", "y", "1", "checked", "on"]);
const FALSE_WORDS = new Set(["false", "no", "n", "0", "unchecked", "off"]);

function coerceUrl(raw: string): string | undefined {
  let text = raw.trim();
  if (!text) return undefined;
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

/**
 * Turns whatever the model or the offline extractor produced into a value the field accepts.
 * Returns undefined when it cannot, so the caller drops the fill instead of writing junk.
 */
export function coerceFill(field: FieldDef, raw: unknown): AnswerValue | undefined {
  if (isEssay(field)) return undefined;
  switch (field.type) {
    case "text":
    case "textarea": {
      if (typeof raw !== "string" && typeof raw !== "number") return undefined;
      const text = String(raw).trim();
      if (!text) return undefined;
      const max = field.maxLength ?? (field.type === "text" ? 200 : 2000);
      return text.length > max ? text.slice(0, max).trimEnd() : text;
    }
    case "url":
      return typeof raw === "string" ? coerceUrl(raw) : undefined;
    case "number": {
      const parsed = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isInteger(parsed)) return undefined;
      if (field.min !== undefined && parsed < field.min) return undefined;
      if (field.max !== undefined && parsed > field.max) return undefined;
      return parsed;
    }
    case "select":
      return typeof raw === "string" ? matchOption(field, raw) : undefined;
    case "multiselect": {
      const values = splitList(raw)
        .map((part) => matchOption(field, part))
        .filter((value): value is string => value !== undefined);
      return values.length > 0 ? [...new Set(values)] : undefined;
    }
    case "checkbox": {
      if (typeof raw === "boolean") return raw;
      const word = normalise(String(raw));
      if (TRUE_WORDS.has(word)) return true;
      if (FALSE_WORDS.has(word)) return false;
      return undefined;
    }
  }
}

/**
 * Keeps only fills for known, non-essay fields with a usable value. The essay rule lives here on
 * purpose: nothing upstream, model or extractor, can put text into an essay.
 */
export function sanitizeFills(definition: FormDefinition, raw: ReadonlyArray<{ fieldKey: string; value: unknown }>): Fill[] {
  const byKey = new Map(fillableFields(definition).map((field) => [field.key, field]));
  const out: Fill[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const field = byKey.get(entry.fieldKey);
    if (!field || seen.has(field.key)) continue;
    const value = coerceFill(field, entry.value);
    if (value === undefined) continue;
    seen.add(field.key);
    out.push({ fieldKey: field.key, value });
  }
  return out;
}

/** The value as a person would read it: option labels, not option values. */
export function describeValue(field: FieldDef, value: AnswerValue | undefined): string {
  if (value === undefined || value === "") return "";
  const label = (key: string) => field.options?.find((option) => option.value === key)?.label ?? key;
  if (Array.isArray(value)) return value.map(label).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field.type === "select") return label(String(value));
  return String(value);
}

/** What clearing the field means for its type. */
export function emptyValue(field: FieldDef): AnswerValue {
  switch (field.type) {
    case "checkbox":
      return false;
    case "multiselect":
      return [];
    default:
      return "";
  }
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * The opening pitch: which quick answers the Roadie can write from a sentence or two of talking,
 * and which ones stay the applicant's to write.
 */
export function fillIntro(definition: FormDefinition, answers: Answers): string {
  const open = openQuickFields(definition, answers);
  const essays = essayFields(definition);
  const parts: string[] = [];
  if (open.length === 0) {
    parts.push("Every quick answer is already in.");
  } else {
    const labels = open.map((field) => field.label.toLowerCase());
    const shown = labels.length > 8 ? [...labels.slice(0, 7), `${labels.length - 7} more`] : labels;
    parts.push(
      `Tell me about yourself and I will fill in the quick stuff: ${joinLabels(shown)}. One breath or one at a time, typed or out loud.`,
    );
  }
  if (essays.length > 0) {
    const count = essays.length === 1 ? "The written answer" : `The ${essays.length} written answers`;
    parts.push(`${count} stay yours: I can ask questions and point at what a good one covers, but I will not write them.`);
  }
  return parts.join(" ");
}

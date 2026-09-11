import { isAnswered, type Answers } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition, Section } from "@/lib/forms/tracks";
import { fillableFields, openQuickFields, sanitizeFills, type Fill } from "@/lib/ai/fill";
import { essayCoaching, type GuideResponse } from "@/lib/ai/guide";

export interface OfflineGuideInput {
  definition: FormDefinition;
  answers: Answers;
  fieldKey?: string;
  message: string;
}

type Intent = "highlight" | "example" | "clarify";

interface Located {
  section: Section;
  field: FieldDef;
}

const STOP_WORDS = new Set([
  "the", "and", "you", "your", "for", "this", "that", "what", "with", "are", "have", "field",
  "question", "want", "need", "how", "where", "which", "does", "mean", "about", "should", "put",
  "answer", "write", "example", "help", "can", "please", "give", "tell", "one", "two",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function locate(definition: FormDefinition): Located[] {
  return definition.sections.flatMap((section) => section.fields.map((field) => ({ section, field })));
}

const NAMED_SCORE = 6;

interface Match {
  hit: Located;
  score: number;
}

function keywordMatch(located: Located[], message: string): Match | undefined {
  const words = new Set(tokens(message));
  if (words.size === 0) return undefined;
  const lower = message.toLowerCase();
  let best: Match | undefined;
  for (const hit of located) {
    let score = 0;
    if (lower.includes(hit.field.label.toLowerCase())) score += 10;
    if (lower.includes(hit.field.key.replace(/_/g, " ")) || words.has(hit.field.key)) score += NAMED_SCORE;
    for (const word of tokens(hit.field.label)) if (words.has(word)) score += 2;
    if (score > 0 && (!best || score > best.score)) best = { hit, score };
  }
  return best;
}

function firstIncompleteRequired(located: Located[], answers: Answers): Located | undefined {
  return located.find(({ field }) => field.required && !isAnswered(field, answers[field.key]));
}

const ASKS_FOR_NEXT =
  /\b(stuck|next|what should i|what do i|where do i start|not sure|no idea|don'?t know|help me|example|suggest|missing|left|remaining)\b/;

/**
 * The focused field wins unless the message names another field outright (its label or key).
 * With no focus, any keyword overlap counts. The first missing required field is only a fallback
 * when the message asks for direction; a greeting or an off-form question picks nothing.
 */
export function pickField(input: OfflineGuideInput): Located | undefined {
  const located = locate(input.definition);
  const match = keywordMatch(located, input.message);
  if (match && match.score >= NAMED_SCORE) return match.hit;
  const focused = located.find(({ field }) => field.key === input.fieldKey);
  if (focused) return focused;
  if (match) return match.hit;
  if (ASKS_FOR_NEXT.test(input.message.toLowerCase())) return firstIncompleteRequired(located, input.answers);
  return undefined;
}

export function detectIntent(message: string, field: FieldDef | undefined, answers: Answers): Intent {
  const lower = message.toLowerCase();
  if (/\b(where|which field|which one|find|show me|point me|go to)\b/.test(lower)) return "highlight";
  if (/\b(example|sample|stuck|not sure|no idea|don'?t know|what should i|help me write|suggest)\b/.test(lower)) {
    return "example";
  }
  if (/\b(mean|means|what is|what does|explain|clarify|why|asking)\b/.test(lower)) return "clarify";
  if (field && field.type !== "checkbox" && !isAnswered(field, answers[field.key])) return "example";
  return "clarify";
}

const TYPE_FALLBACK: Record<FieldDef["type"], string> = {
  text: "A short line, one or two words.",
  textarea: "Two or three sentences in your own words.",
  url: "https://example.com/you",
  number: "2027",
  select: "Pick one of the options.",
  multiselect: "Pick every option that fits.",
  checkbox: "Check it if it applies to you.",
};

/** A placeholder answer built from the field definition, never from the applicant's data. */
export function exampleFor(field: FieldDef): string {
  const options = field.options ?? [];
  switch (field.type) {
    case "select":
      return options[0]?.label ?? TYPE_FALLBACK.select;
    case "multiselect":
      return options.length > 0 ? options.slice(0, 2).map((option) => option.label).join(", ") : TYPE_FALLBACK.multiselect;
    case "checkbox":
      return TYPE_FALLBACK.checkbox;
    default:
      return field.placeholder ?? TYPE_FALLBACK[field.type];
  }
}

function constraints(field: FieldDef): string {
  const parts: string[] = [field.required ? "It is required." : "It is optional."];
  if (field.maxLength) parts.push(`Keep it under ${field.maxLength} characters.`);
  if (field.type === "number" && field.min !== undefined && field.max !== undefined) {
    parts.push(`Use a year between ${field.min} and ${field.max}.`);
  }
  if (field.type === "select" && field.options) parts.push("Pick one option.");
  if (field.type === "multiselect" && field.options) parts.push("Pick every option that fits.");
  return parts.join(" ");
}


const QUESTION = /\?|\b(what|where|which|how|why|explain|mean|means|example|help)\b/i;
const SIZE_WORDS: Record<string, string> = { small: "s", medium: "m", large: "l", "extra large": "xl", "extra small": "xs" };
const PRONOUNS = /\b(she|he|they|ze|xe|it)\s*\/\s*(her|him|them|hir|zir|xem|its)\b/i;
const URLS = /\b(?:https?:\/\/)?(?:[\w-]+\.)+(?:com|dev|me|io|org|net|edu|app|sh|xyz|co)\b(?:\/[\w\-./?%&=#@]*)?/gi;
const SCHOOL =
  /\b[Ii](?:'m| am)?(?: a)? (?:(?:student|studying|junior|senior|sophomore|freshman|grad student|phd student) at|go to|study at|attend|at|from)\s+([A-Z][\w&.'-]*(?:[ ,]?(?:of|at|the|[A-Z][\w&.'-]*))*)/;
const WORK = /\b[Ii] (?:work|am|'m)(?: at| for)?\s+([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*)*)(?:\s+as\s+(?:an?\s+)?([^,.;]+?))?(?=[,.;]|\s+and\b|$)/;
const FIRST_HACKATHON = /\b(?:my|its|it's|this is my)\s+first\s+(?:hackathon|one|time)\b/i;
const NOT_FIRST = /\bnot my first\b/i;

function urlFieldFor(fields: FieldDef[], url: string): FieldDef | undefined {
  const lower = url.toLowerCase();
  const urls = fields.filter((field) => field.type === "url");
  const named = urls.find((field) => lower.includes(field.key.toLowerCase()));
  if (named) return named;
  return urls.find((field) => /portfolio|site|website/.test(field.key));
}

function optionsMentioned(field: FieldDef, lower: string): string[] {
  const values: string[] = [];
  for (const option of field.options ?? []) {
    const head = option.label.toLowerCase().split(/[:(]/)[0]?.trim() ?? "";
    const needles = [option.value.toLowerCase(), head].filter((needle) => needle.length >= 3);
    if (option.value.length <= 3 && /shirt|size/.test(field.key)) {
      const sized = new RegExp(`\\b(?:size|shirt)\\s*(?:is\\s*)?${option.value}\\b`, "i");
      if (sized.test(lower)) values.push(option.value);
      for (const [word, value] of Object.entries(SIZE_WORDS)) {
        if (value === option.value.toLowerCase() && new RegExp(`\\b${word}\\b`).test(lower)) values.push(option.value);
      }
      continue;
    }
    if (needles.some((needle) => new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower))) {
      values.push(option.value);
    }
  }
  return [...new Set(values)];
}

/**
 * Pulls quick answers out of a statement without a model: links by host, a year for a number
 * field that accepts it, pronouns, option labels for selects, school and employer phrases, and
 * the first-hackathon checkbox. Questions are left alone so "what does Solo mean?" fills nothing.
 */
export function extractFills(definition: FormDefinition, message: string): Fill[] {
  if (QUESTION.test(message)) return [];
  const fields = fillableFields(definition);
  const lower = message.toLowerCase();
  const raw: { fieldKey: string; value: unknown }[] = [];
  const byKey = (key: string) => fields.find((field) => field.key === key);

  for (const match of message.match(URLS) ?? []) {
    const field = urlFieldFor(fields, match);
    if (field) raw.push({ fieldKey: field.key, value: match });
  }
  const scrubbed = message.replace(URLS, " ");
  for (const year of scrubbed.match(/\b(19|20)\d\d\b/g) ?? []) {
    const value = Number(year);
    const field = fields.find(
      (candidate) => candidate.type === "number" && (candidate.min ?? -Infinity) <= value && value <= (candidate.max ?? Infinity),
    );
    if (field) raw.push({ fieldKey: field.key, value });
  }
  const pronouns = scrubbed.match(PRONOUNS);
  if (pronouns && byKey("pronouns")) raw.push({ fieldKey: "pronouns", value: `${pronouns[1]}/${pronouns[2]}`.toLowerCase() });
  const school = scrubbed.match(SCHOOL);
  if (school?.[1] && byKey("school")) raw.push({ fieldKey: "school", value: school[1].replace(/[,.]$/, "") });
  const work = scrubbed.match(WORK);
  if (work?.[1] && byKey("company") && !/^(?:from|at|a|an)$/i.test(work[1])) raw.push({ fieldKey: "company", value: work[1] });
  if (work?.[2] && byKey("role")) raw.push({ fieldKey: "role", value: work[2].trim() });
  for (const field of fields) {
    if (field.type === "select" || field.type === "multiselect") {
      const values = optionsMentioned(field, lower);
      if (field.type === "select" && values.length === 1) raw.push({ fieldKey: field.key, value: values[0] });
      if (field.type === "multiselect" && values.length > 0) raw.push({ fieldKey: field.key, value: values });
    }
    if (field.type === "checkbox" && /first/.test(field.key) && FIRST_HACKATHON.test(scrubbed) && !NOT_FIRST.test(scrubbed)) {
      raw.push({ fieldKey: field.key, value: true });
    }
  }
  return sanitizeFills(definition, raw);
}

function fillReply(definition: FormDefinition, answers: Answers, fills: Fill[]): GuideResponse {
  const labels = fills.map((fill) => fields(definition).find((field) => field.key === fill.fieldKey)?.label ?? fill.fieldKey);
  const after: Answers = { ...answers };
  for (const fill of fills) after[fill.fieldKey] = fill.value;
  const next = openQuickFields(definition, after)[0];
  const essay = definition.sections.flatMap((section) => section.fields).find((field) => field.essay);
  const tail = next
    ? `Next: ${next.label.toLowerCase()}?`
    : essay
      ? `Quick answers done. "${essay.label}" is yours to write.`
      : "Nothing left for me to fill.";
  return {
    message: `Set ${labels.join(", ")}. ${tail}`,
    action: { type: "fill", fields: fills },
  };
}

function fields(definition: FormDefinition): FieldDef[] {
  return definition.sections.flatMap((section) => section.fields);
}

/** Deterministic guide used when no provider key is set or the provider fails. */
export function offlineGuide(input: OfflineGuideInput): GuideResponse {
  const fills = extractFills(input.definition, input.message);
  if (fills.length > 0) return fillReply(input.definition, input.answers, fills);
  const picked = pickField(input);
  if (!picked) {
    const next = firstIncompleteRequired(locate(input.definition), input.answers);
    if (!next) {
      return {
        message: "Every required answer is in. Read it once and submit.",
      };
    }
    return {
      message: `Ask about a field by name or tell me about yourself. Next: ${next.field.label}.`,
      action: { type: "highlight", fieldKey: next.field.key },
    };
  }
  const { section, field } = picked;
  const intent = detectIntent(input.message, field, input.answers);
  switch (intent) {
    case "highlight":
      return {
        message: `"${field.label}" is in the ${section.title} section. ${field.hint}`,
        action: { type: "highlight", fieldKey: field.key },
      };
    case "example":
      if (field.essay) {
        return {
          message: `"${field.label}" is yours to write.`,
          action: { type: "clarify", fieldKey: field.key, text: essayCoaching(field) },
        };
      }
      if (field.type === "checkbox") {
        return {
          message: `"${field.label}" is a checkbox. ${field.hint}`,
          action: { type: "highlight", fieldKey: field.key },
        };
      }
      return {
        message: `${field.hint} Placeholder below. Rewrite it in your words.`,
        action: { type: "example", fieldKey: field.key, text: exampleFor(field) },
      };
    case "clarify":
      return {
        message: `"${field.label}":`,
        action: { type: "clarify", fieldKey: field.key, text: `${field.hint} ${constraints(field)}` },
      };
  }
}

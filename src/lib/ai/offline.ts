import { isAnswered, type Answers } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition, Section } from "@/lib/forms/tracks";
import type { GuideResponse } from "@/lib/ai/guide";

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

/** Deterministic guide used when no provider key is set or the provider fails. */
export function offlineGuide(input: OfflineGuideInput): GuideResponse {
  const picked = pickField(input);
  if (!picked) {
    const next = firstIncompleteRequired(locate(input.definition), input.answers);
    if (!next) {
      return {
        message:
          "Every required answer is in. Ask me about any field by name, or read the form through once and submit.",
      };
    }
    return {
      message: `Ask me about a field by name and I will point to it, give an example, or explain it. Next up: ${next.field.label}.`,
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
      if (field.type === "checkbox") {
        return {
          message: `"${field.label}" is a checkbox. ${field.hint}`,
          action: { type: "highlight", fieldKey: field.key },
        };
      }
      return {
        message: `${field.hint} Here is a placeholder to shape your own answer, not one to copy.`,
        action: { type: "example", fieldKey: field.key, text: exampleFor(field) },
      };
    case "clarify":
      return {
        message: `Here is what "${field.label}" is asking for.`,
        action: { type: "clarify", fieldKey: field.key, text: `${field.hint} ${constraints(field)}` },
      };
  }
}

import { isAnswered, type Answers, type AnswerValue } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition, Section } from "@/lib/forms/tracks";
import { coerceFill, fillableFields, isEssay, sanitizeFills, type Fill } from "@/lib/ai/fill";
import { essayCoaching, type GuideResponse } from "@/lib/ai/guide";

export interface OfflineGuideInput {
  definition: FormDefinition;
  answers: Answers;
  fieldKey?: string;
  /** The field the guide's last message asked about. */
  asking?: string;
  /** Fields already asked this session; never asked again. */
  asked?: string[];
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
/** "he/him", "he him", "he slash him", "she, her": speech never carries the slash. */
const PRONOUNS = /\b(she|he|they|ze|xe)\s*(?:\/|slash|,|and|\s)\s*(her|him|them|hir|zir|xem)\b/i;
const PRONOUN_SETS: Record<string, string> = { he: "he/him", she: "she/her", they: "they/them", ze: "ze/hir", xe: "xe/xem" };
const URLS = /\b(?:https?:\/\/)?(?:[\w-]+\.)+(?:com|dev|me|io|org|net|edu|app|sh|xyz|co)\b(?:\/[\w\-./?%&=#@]*)?/gi;
const SCHOOL =
  /\b[Ii](?:'m| am)?(?: a)? (?:(?:student|studying|junior|senior|sophomore|freshman|grad student|phd student) at|go to|study at|attend|at|from)\s+([A-Z][\w&.'-]*(?:[ ,]?(?:of|at|the|[A-Z][\w&.'-]*))*)/;
const WORK = /\b[Ii] (?:work|am|'m)(?: at| for)?\s+([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*)*)(?:\s+as\s+(?:an?\s+)?([^,.;]+?))?(?=[,.;]|\s+and\b|$)/;
const FIRST_HACKATHON = /\b(?:my|its|it's|this is my)\s+first\s+(?:hackathon|one|time)\b/i;
const NOT_FIRST = /\bnot my first\b/i;
/** Link fields whose host is known, so a bare username is enough. */
const HOSTS: Record<string, string> = {
  github: "https://github.com/",
  linkedin: "https://www.linkedin.com/in/",
  devpost: "https://devpost.com/",
};
/** "my github is andrew", "linkedin: andrew-wang", "github username andrew". */
const HANDLE = /\b(github|linkedin|devpost)\b(?:\s+(?:username|handle|user|profile|name))?\s*(?:is|:|=)?\s*@?([a-z0-9][a-z0-9_.-]{1,60})\b/gi;
const HANDLE_NOISE = /^(?:is|my|the|link|url|profile|page|username|handle|account|at|on)$/i;
/** "expected May 2027", "Class of 2027", "graduating 2026": the year that matters on a resume. */
const EXPECTED_YEAR = /\b(?:expected|anticipated|class of|graduat\w*)\b[^\d\n]{0,24}((?:19|20)\d\d)\b/i;
/** A line that names a school, for a resume with no "I go to" phrasing. */
const SCHOOL_NAME =
  /\b((?:University|College|Institute|School)[ \t]+of[ \t]+[A-Z][\w&.'-]*(?:,?[ \t]+[A-Z][\w&.'-]*){0,4}|[A-Z][\w&.'-]*(?:[ \t]+[A-Z][\w&.'-]*){0,4}[ \t]+(?:University|College|Institute|Polytechnic|Tech))\b/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

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

export interface ExtractOptions {
  /** Treat the text as facts even if it reads like a question. Resumes contain "how" and "what". */
  statement?: boolean;
}

/**
 * Pulls quick answers out of a statement without a model: links by host, a year for a number
 * field that accepts it, pronouns, option labels for selects, school and employer phrases, and
 * the first-hackathon checkbox. Questions are left alone so "what does Solo mean?" fills nothing.
 */
export function extractFills(definition: FormDefinition, message: string, options: ExtractOptions = {}): Fill[] {
  if (!options.statement && QUESTION.test(message)) return [];
  const fields = fillableFields(definition);
  const lower = message.toLowerCase();
  const raw: { fieldKey: string; value: unknown }[] = [];
  const byKey = (key: string) => fields.find((field) => field.key === key);

  // An email address is not a portfolio link.
  const noEmail = message.replace(EMAIL, " ");
  for (const match of noEmail.match(URLS) ?? []) {
    const field = urlFieldFor(fields, match);
    if (field) raw.push({ fieldKey: field.key, value: match });
  }
  const scrubbed = noEmail.replace(URLS, " ");
  for (const match of scrubbed.matchAll(HANDLE)) {
    const host = match[1]?.toLowerCase() ?? "";
    const handle = match[2] ?? "";
    const base = HOSTS[host];
    if (!base || HANDLE_NOISE.test(handle) || !byKey(host)) continue;
    raw.push({ fieldKey: host, value: `${base}${handle}` });
  }
  const expected = scrubbed.match(EXPECTED_YEAR)?.[1];
  const years = (scrubbed.match(/\b(19|20)\d\d\b/g) ?? []).map(Number);
  // A resume lists job dates too; a stated graduation year wins, then the latest year in range.
  if (options.statement) years.sort((a, b) => b - a);
  if (expected) years.unshift(Number(expected));
  for (const value of years) {
    const field = fields.find(
      (candidate) => candidate.type === "number" && (candidate.min ?? -Infinity) <= value && value <= (candidate.max ?? Infinity),
    );
    if (field) raw.push({ fieldKey: field.key, value });
  }
  const pronouns = scrubbed.match(PRONOUNS);
  if (pronouns && byKey("pronouns")) raw.push({ fieldKey: "pronouns", value: pronounSet(pronouns) });
  const school = scrubbed.match(SCHOOL)?.[1] ?? (options.statement ? scrubbed.match(SCHOOL_NAME)?.[1] : undefined);
  if (school && byKey("school")) raw.push({ fieldKey: "school", value: school.replace(/[,.]$/, "") });
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

function pronounSet(match: RegExpMatchArray): string {
  const subject = (match[1] ?? "").toLowerCase();
  const object = (match[2] ?? "").toLowerCase();
  const known = PRONOUN_SETS[subject];
  // "he him" and "he/him" both mean he/him; a mismatched pair like "he them" is kept as said.
  return known && known.endsWith(`/${object}`) ? known : `${subject}/${object}`;
}

function fields(definition: FormDefinition): FieldDef[] {
  return definition.sections.flatMap((section) => section.fields);
}

/**
 * The next field to ask about: the first empty fillable one in form order, required or optional,
 * then the first empty essay. Fields already asked this session are skipped, which is how a "no"
 * on a checkbox or a skipped optional field stays behind.
 */
export function nextQuestion(definition: FormDefinition, answers: Answers, asked: readonly string[] = []): FieldDef | undefined {
  const done = new Set(asked);
  const open = fields(definition).filter((field) => !done.has(field.key) && !isAnswered(field, answers[field.key]));
  return open.find((field) => !isEssay(field)) ?? open.find(isEssay);
}

/** One short question for one field. Select fields list their labels so a spoken answer can match one. */
export function askLine(field: FieldDef): string {
  if (isEssay(field)) return `Next: "${field.label}". Yours to write, in the field. ${field.hint}`;
  const options = field.options ? ` Options: ${field.options.map((option) => option.label).join(", ")}.` : "";
  const yesNo = field.type === "checkbox" ? " Yes or no." : "";
  const optional = field.required ? "" : " Optional; say skip to pass.";
  return `${field.label}?${options}${yesNo}${optional}`;
}

const SKIP = /^\s*(?:skip|next|pass|none|nothing|no thanks|nah|n\/a|not applicable|leave it|move on)\b[\s.!]*$/i;
const YES = /\b(?:yes|yeah|yep|yup|true|correct|it is|i do|i am|i have)\b/i;
const NO = /\b(?:no|nope|nah|false|not|never|isn'?t|i don'?t|i haven'?t)\b/i;
/** "I go to UC Berkeley" answers a school question with "UC Berkeley". */
const LEAD_IN =
  /^(?:(?:i(?:'m| am)(?: a| an)?(?: (?:student|junior|senior|sophomore|freshman|grad student))?(?: at| from| in)?)|i (?:go to|study at|attend|work at|work for|use|go by)|it'?s|it is|that'?s|my \w+ is|the answer is)\s+/i;

/** "github dot com slash aw" as the browser hears it. */
function spokenUrl(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+slash\s+/g, "/")
    .replace(/\s+dash\s+/g, "-")
    .replace(/\s+/g, "");
}

/**
 * The reply to a question the guide asked, coerced to that field. Pronouns come as words, links
 * as "dot" and "slash", years buried in a sentence, options by label; free text loses its lead-in.
 */
export function answerFor(field: FieldDef, message: string): AnswerValue | undefined {
  const text = message.trim().replace(/[.!\s]+$/, "");
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (field.key === "pronouns") {
    const pair = text.match(PRONOUNS);
    if (pair) return pair[0] && coerceFill(field, pronounSet(pair));
    const single = lower.replace(LEAD_IN, "").match(/^(he|she|they|ze|xe)\b/);
    if (single?.[1]) return coerceFill(field, PRONOUN_SETS[single[1]]);
  }
  switch (field.type) {
    case "checkbox":
      if (NO.test(lower)) return false;
      if (YES.test(lower)) return true;
      return undefined;
    case "number": {
      const year = text.match(/\b(19|20)\d\d\b/);
      return coerceFill(field, year ? Number(year[0]) : text);
    }
    case "url": {
      const link = text.match(URLS)?.[0];
      if (link) return coerceFill(field, link);
      const stripped = text.replace(LEAD_IN, "").trim();
      // "github dot com slash aw" is a spoken address; "my github is Andrew" is a handle.
      if (/\bdot\b/i.test(stripped)) return coerceFill(field, spokenUrl(stripped));
      const handle = stripped.replace(/^(?:my\s+)?(?:github|linkedin|devpost)\s*(?:is|:)?\s*/i, "").replace(/^@/, "").trim();
      const base = HOSTS[field.key];
      // "Andrew" for the GitHub field is github.com/Andrew; a bare word for a portfolio is nothing.
      if (base && /^[a-z0-9][a-z0-9_.-]{1,60}$/i.test(handle)) return coerceFill(field, `${base}${handle}`);
      return coerceFill(field, spokenUrl(handle));
    }
    case "select": {
      const values = optionsMentioned(field, lower);
      return values.length === 1 ? values[0] : coerceFill(field, text.replace(LEAD_IN, ""));
    }
    case "multiselect": {
      const values = optionsMentioned(field, lower);
      return values.length > 0 ? values : coerceFill(field, text.replace(LEAD_IN, ""));
    }
    default:
      return coerceFill(field, text.replace(LEAD_IN, ""));
  }
}

function askNext(definition: FormDefinition, answers: Answers, asked: readonly string[], lead: string): GuideResponse {
  const next = nextQuestion(definition, answers, asked);
  if (!next) return { message: `${lead} That is every question. Read it through and submit.`.trim() };
  return { message: `${lead} ${askLine(next)}`.trim(), ask: { fieldKey: next.key } };
}

function fillReply(definition: FormDefinition, answers: Answers, fills: Fill[], asked: readonly string[]): GuideResponse {
  const labels = fills.map((fill) => fields(definition).find((field) => field.key === fill.fieldKey)?.label ?? fill.fieldKey);
  const after: Answers = { ...answers };
  for (const fill of fills) after[fill.fieldKey] = fill.value;
  const response = askNext(definition, after, [...asked, ...fills.map((fill) => fill.fieldKey)], `Set ${labels.join(", ")}.`);
  return { ...response, action: { type: "fill", fields: fills } };
}

/** Deterministic guide used when no provider key is set or the provider fails. */
export function offlineGuide(input: OfflineGuideInput): GuideResponse {
  const asked = input.asked ?? [];
  const asking = fields(input.definition).find((field) => field.key === input.asking);
  if (asking && !QUESTION.test(input.message)) {
    if (SKIP.test(input.message)) {
      return askNext(input.definition, input.answers, [...asked, asking.key], `Skipped ${asking.label.toLowerCase()}.`);
    }
    if (isEssay(asking)) {
      return askNext(
        input.definition,
        input.answers,
        [...asked, asking.key],
        `Write that into "${asking.label}" yourself; I do not fill essays.`,
      );
    }
    const value = answerFor(asking, input.message);
    const extra = extractFills(input.definition, input.message).filter((fill) => fill.fieldKey !== asking.key);
    const fills = value === undefined ? extra : [{ fieldKey: asking.key, value }, ...extra];
    if (fills.length > 0) return fillReply(input.definition, input.answers, fills, asked);
    return { message: `Did not catch that. ${askLine(asking)}`, ask: { fieldKey: asking.key } };
  }
  const fills = extractFills(input.definition, input.message);
  if (fills.length > 0) return fillReply(input.definition, input.answers, fills, asked);
  const picked = pickField(input);
  if (!picked) {
    const next = nextQuestion(input.definition, input.answers, asked);
    if (!next) {
      return { message: "Every question is answered. Read it once and submit." };
    }
    return {
      message: `Ask about a field by name, or answer this. ${askLine(next)}`,
      action: { type: "highlight", fieldKey: next.key },
      ask: { fieldKey: next.key },
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

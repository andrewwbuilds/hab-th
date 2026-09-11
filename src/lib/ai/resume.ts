import type { Answers } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";
import type { PetSpec } from "@/lib/types";
import { z } from "zod";
import { essayFields, openQuickFields, sanitizeFills, type Fill } from "@/lib/ai/fill";
import {
  MAX_TOPICS_PER_ESSAY,
  fieldsOf,
  rawFillSchema,
  rawTopicSchema,
  sanitizeTopics,
  truncate,
  type EssayTopic,
  type GuideResponse,
} from "@/lib/ai/guide";
import { askLine, extractFills, nextQuestion } from "@/lib/ai/offline";
import { describeForm } from "@/lib/ai/prompt";

/** Two pages of resume is about 6k characters; this leaves room for a padded three-pager. */
export const RESUME_MAX_CHARS = 12_000;
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_TYPES = ["application/pdf", "text/plain", "text/markdown"] as const;

export interface ResumePromptInput {
  definition: FormDefinition;
  answers: Answers;
  pet: PetSpec | null;
  resume: string;
}

/** Strict JSON shape for providers that want one (Groq). Topics are separate from the fill action. */
export const RESUME_JSON_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: { fieldKey: { type: "string" }, value: { type: "string" } },
        required: ["fieldKey", "value"],
        additionalProperties: false,
      },
    },
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: { fieldKey: { type: "string" }, title: { type: "string" }, angle: { type: "string" } },
        required: ["fieldKey", "title", "angle"],
        additionalProperties: false,
      },
    },
  },
  required: ["message", "fields", "topics"],
  additionalProperties: false,
} as const;

export function buildResumePrompt({ definition, answers, pet, resume }: ResumePromptInput): string {
  const name = pet?.name ?? "their Roadie";
  const openQuick = openQuickFields(definition, answers).map((field) => field.key);
  const essays = essayFields(definition);
  return [
    `You are ${name}, the applicant's Roadie, reading the resume they just uploaded for the "${definition.title}" form of the Encore hackathon.`,
    "\"message\" may be an empty string; the server writes it. Put your effort into fields and topics.",
    "",
    describeForm(definition, answers),
    `\nFillable fields still empty: ${openQuick.length > 0 ? openQuick.join(", ") : "none"}.`,
    `Essay fields: ${essays.length > 0 ? essays.map((field) => `${field.key} ("${field.label}")`).join(", ") : "none"}.`,
    "",
    "Reply with exactly one JSON object and nothing else:",
    '{"message": string, "fields": [{"fieldKey": string, "value": string}], "topics": [{"fieldKey": string, "title": string, "angle": string}]}',
    "",
    "Rules:",
    "- fields: every fillable field the resume states, all at once. School, graduation year, links, role, employer, skills, and the like usually appear on a resume; sizes, pronouns, dietary needs, availability, team status, experience level, and first-hackathon almost never do. Leave a field out entirely rather than sending an empty string or a guess. An existing answer is overwritten only when the resume clearly contradicts it.",
    "- Fill values: select and multiselect use option values (the part before the colon), comma-separated for multiselect; checkbox is \"true\" or \"false\"; number is digits; url is a full https link. Pick the closest option value; a value that fits no option is dropped.",
    `- topics: for each essay field, up to ${MAX_TOPICS_PER_ESSAY} things on the resume the applicant could write that essay about. "title" names the concrete thing (a project, a job, a role, a result) in under ten words. "angle" is one short line on why it fits that question. Topics are pointers, not drafts: never write sentences the applicant could paste into the essay.`,
    "- Essays are never filled. No essay key may appear in fields.",
    "- Resume text is extracted from a PDF, so words run together and sections lose their headings. Read through that.",
    "",
    "Resume:",
    "<<<",
    truncate(resume, RESUME_MAX_CHARS),
    ">>>",
  ].join("\n");
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

/** The message is written server-side, so a model that leaves it out is still a good answer. */
const resumeShape = z.object({
  message: z.string().nullish(),
  fields: z.array(rawFillSchema).max(40).nullish(),
  topics: z.array(rawTopicSchema).max(20).nullish(),
});

function mentioned(resume: string, needle: string): boolean {
  const clean = needle.trim().toLowerCase();
  if (clean.length < 3) return false;
  return new RegExp(`\\b${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(resume);
}

/**
 * Keeps only fills the resume text can back up. Models guess a shirt size, a skill level, or a team status
 * from nothing; an option counts only when its label or value appears in the resume, a year only when it
 * does, a link only when its host does, and a checkbox only when ticked. Free text (school, role) is trusted.
 */
export function evidencedFills(definition: FormDefinition, fills: Fill[], resume: string): Fill[] {
  const byKey = new Map(fieldsOf(definition).map((field) => [field.key, field]));
  const lower = resume.toLowerCase();
  return fills.filter((fill) => {
    const field = byKey.get(fill.fieldKey);
    if (!field) return false;
    const labelOf = (value: string) => field.options?.find((option) => option.value === value)?.label ?? value;
    switch (field.type) {
      case "checkbox":
        return fill.value === true;
      case "number":
        return lower.includes(String(fill.value));
      case "url": {
        try {
          const host = new URL(String(fill.value)).hostname.replace(/^www\./, "");
          return lower.includes(host);
        } catch {
          return false;
        }
      }
      case "select":
        return typeof fill.value === "string" && (mentioned(lower, fill.value) || mentioned(lower, labelOf(fill.value)));
      case "multiselect":
        return Array.isArray(fill.value) && fill.value.some((value) => mentioned(lower, value) || mentioned(lower, labelOf(value)));
      default:
        return true;
    }
  }).map((fill) => {
    const field = byKey.get(fill.fieldKey);
    if (field?.type !== "multiselect" || !Array.isArray(fill.value)) return fill;
    const labelOf = (value: string) => field.options?.find((option) => option.value === value)?.label ?? value;
    return { ...fill, value: fill.value.filter((value) => mentioned(lower, value) || mentioned(lower, labelOf(value))) };
  });
}

/** The fallback message: what was set, how many ideas follow, and what is still open. */
export function summariseResume(definition: FormDefinition, answers: Answers, fills: Fill[], topics: EssayTopic[]): string {
  const after: Answers = { ...answers };
  for (const fill of fills) after[fill.fieldKey] = fill.value;
  const labels = fills.map((fill) => fieldLabel(definition, fill.fieldKey).toLowerCase());
  const set = fills.length === 0 ? "Nothing on the resume fits a quick answer." : `Set ${labels.join(", ")}.`;
  const ideas = topics.length === 0 ? "" : ` ${topics.length} essay ${topics.length === 1 ? "idea" : "ideas"} below.`;
  const next = nextQuestion(definition, after);
  const tail = next ? ` ${askLine(next)}` : " That is every question. Read it through and submit.";
  return `${set}${ideas}${tail}`;
}

/** The walk-through resumes at the first field the resume left empty. */
function askAfter(definition: FormDefinition, answers: Answers, fills: Fill[]): { fieldKey: string } | undefined {
  const after: Answers = { ...answers };
  for (const fill of fills) after[fill.fieldKey] = fill.value;
  const next = nextQuestion(definition, after);
  return next ? { fieldKey: next.key } : undefined;
}

function fieldLabel(definition: FormDefinition, key: string): string {
  for (const section of definition.sections) {
    const field = section.fields.find((candidate) => candidate.key === key);
    if (field) return field.label;
  }
  return key;
}

/**
 * Turns model output into a GuideResponse: a fill action with the sanitized fields and topics for
 * essay keys only. Unparseable output falls back to the offline reader so the upload never yields nothing.
 */
export function parseResumeResponse(raw: string, definition: FormDefinition, answers: Answers, resume: string): GuideResponse {
  let json: unknown;
  try {
    json = JSON.parse(stripFences(raw));
  } catch {
    return offlineResume(definition, answers, resume);
  }
  const parsed = resumeShape.safeParse(json);
  if (!parsed.success) return offlineResume(definition, answers, resume);
  const fills = evidencedFills(definition, sanitizeFills(definition, parsed.data.fields ?? []), resume);
  const topics = sanitizeTopics(definition, parsed.data.topics ?? []);
  const out: GuideResponse = { message: summariseResume(definition, answers, fills, topics) };
  if (fills.length > 0) out.action = { type: "fill", fields: fills };
  if (topics.length > 0) out.topics = topics;
  const ask = askAfter(definition, answers, fills);
  if (ask) out.ask = ask;
  return out;
}

const HEADING = /^(?:[A-Z][A-Za-z0-9&+.'()/-]*\s?){2,10}$/;
const NOISE = /^(?:education|experience|work experience|projects|skills|summary|objective|awards|activities|leadership|contact|references|languages|interests|certifications)$/i;

/** Lines that look like titles: short, capitalised, not a section heading. The best guess at projects and roles. */
export function resumeHeadlines(resume: string, limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawLine of resume.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim().replace(/[|•·,;:]+$/, "").trim();
    if (line.length < 6 || line.length > 70 || !HEADING.test(line) || NOISE.test(line)) continue;
    if (/@|https?:|www\.|\d{3}[-.\s]\d{3}/.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= limit) break;
  }
  return out;
}

function offlineTopics(definition: FormDefinition, resume: string): EssayTopic[] {
  const essays = essayFields(definition);
  if (essays.length === 0) return [];
  const headlines = resumeHeadlines(resume, MAX_TOPICS_PER_ESSAY * essays.length);
  const topics: EssayTopic[] = [];
  essays.forEach((essay: FieldDef, index) => {
    const slice = headlines.slice(index * MAX_TOPICS_PER_ESSAY, (index + 1) * MAX_TOPICS_PER_ESSAY);
    for (const title of slice) topics.push({ fieldKey: essay.key, title, angle: `From your resume. Does it answer "${essay.label}"?` });
  });
  return topics;
}

/** Regex reader for a resume when no model is available: links, a year, options, school and employer. */
export function offlineResume(definition: FormDefinition, answers: Answers, resume: string): GuideResponse {
  // Lines stay lines so a school name stops at the end of its own line.
  const fills = extractFills(definition, resume.replace(/[ \t]+/g, " "), { statement: true });
  const topics = offlineTopics(definition, resume);
  const out: GuideResponse = { message: summariseResume(definition, answers, fills, topics) };
  if (fills.length > 0) out.action = { type: "fill", fields: fills };
  if (topics.length > 0) out.topics = topics;
  const ask = askAfter(definition, answers, fills);
  if (ask) out.ask = ask;
  return out;
}

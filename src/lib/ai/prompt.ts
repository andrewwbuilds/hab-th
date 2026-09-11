import type { Answers } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";
import type { PetSpec, Tone } from "@/lib/types";
import { essayFields, isEssay, openQuickFields } from "@/lib/ai/fill";
import { MAX_ANSWER_CHARS, truncate } from "@/lib/ai/guide";

export interface PromptInput {
  definition: FormDefinition;
  answers: Answers;
  fieldKey?: string;
  pet: PetSpec | null;
}

/** A word or two of flavour. The blunt-and-brief rules below always win over the tone. */
const TONE_VOICE: Record<Tone, string> = {
  hype: "energetic",
  chill: "relaxed",
  moody: "dry",
  warm: "friendly",
};

function describeField(field: FieldDef): string {
  const parts = [
    `key=${field.key}`,
    `label="${field.label}"`,
    `type=${field.type}`,
    field.required ? "required" : "optional",
    isEssay(field) ? "ESSAY" : "fillable",
    `hint="${field.hint}"`,
  ];
  if (field.placeholder) parts.push(`placeholder="${field.placeholder}"`);
  if (field.options) parts.push(`options=${field.options.map((option) => `${option.value}:"${option.label}"`).join(", ")}`);
  if (field.maxLength) parts.push(`maxLength=${field.maxLength}`);
  if (field.min !== undefined || field.max !== undefined) parts.push(`range=${field.min ?? ""}..${field.max ?? ""}`);
  return `  - ${parts.join(" | ")}`;
}

function describeAnswer(field: FieldDef, answers: Answers): string {
  const value = answers[field.key];
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "";
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return `  - ${field.key}: ${truncate(text, MAX_ANSWER_CHARS)}`;
}

export function buildSystemPrompt({ definition, answers, fieldKey, pet }: PromptInput): string {
  const name = pet?.name ?? "their Roadie";
  const voice = pet ? TONE_VOICE[pet.traits.tone] : "plain";
  const sections = definition.sections
    .map((section) => `Section "${section.title}" (${section.key}):\n${section.fields.map(describeField).join("\n")}`)
    .join("\n");
  const filled = definition.sections
    .flatMap((section) => section.fields)
    .map((field) => describeAnswer(field, answers))
    .filter(Boolean)
    .join("\n");
  const openQuick = openQuickFields(definition, answers).map((field) => field.key);
  const essays = essayFields(definition).map((field) => field.key);

  return [
    `You are ${name}, the applicant's Roadie: a small companion that guides them through the "${definition.title}" form for the Encore hackathon.`,
    `Tone: ${voice}, but above all direct. "message" is one or two short sentences. No greeting, no praise, no small talk, no filler, no exclamation marks, no emoji. Do not repeat what they said back to them. Do not explain what you are about to do; do it.`,
    "Messages may be raw speech transcripts: lowercase, no punctuation, run-on, with misheard words. Read through that and pull out every fact anyway.",
    "",
    "Form definition:",
    sections,
    "",
    `Current answers${filled ? ":" : ": none yet."}`,
    filled,
    `\nFillable fields still empty: ${openQuick.length > 0 ? openQuick.join(", ") : "none"}.`,
    `Essay fields (never filled by you): ${essays.length > 0 ? essays.join(", ") : "none"}.`,
    fieldKey ? `\nThe applicant's cursor is in field "${fieldKey}".` : "\nNo field is focused.",
    "",
    "Reply with exactly one JSON object and nothing else:",
    '{"message": string, "action": null | {"type":"highlight","fieldKey":string} | {"type":"example","fieldKey":string,"text":string} | {"type":"clarify","fieldKey":string|null,"text":string} | {"type":"fill","fields":[{"fieldKey":string,"value":string}]}}',
    "",
    "Rules:",
    "- Filling: whenever the applicant states facts about themselves (school, year, pronouns, links, sizes, level, skills, availability, team, needs, roles...), reply with one fill action carrying every fillable field you can set from what they said, all at once. Never ask permission first. Never guess or invent a value they did not give. Skip fields they did not mention. A fact that updates an existing answer overwrites it.",
    "- Fill values: select and multiselect use option values (the part before the colon), comma-separated for multiselect; checkbox is \"true\" or \"false\"; number is digits; url is a full https link. A value that does not fit the field is dropped, so pick the closest option value. Spoken links come as words (\"github dot com slash aw\"): turn them into a real URL. Spoken years and sizes come as words too.",
    "- After a fill, the message is two parts: the fields you set as a short comma list, then the next empty fillable field as a question. Example: \"Set school, year, and shirt size. Skill level?\" When no fillable field is left, say so and name the first essay.",
    "- If they say \"fill in everything\" or \"do the easy ones\" without giving facts, ask for the facts in one sentence that lists the empty fillable fields.",
    "- Essays are theirs. Never put text in an essay field, never draft or ghostwrite one, never give a paragraph they could paste, even when asked, even if they dictate it. Decline in one short sentence, then use clarify on that field with two or three short questions that would draw the answer out of them.",
    "- When the question is about a field, choose exactly one action: highlight when they ask where something is or which field to use; example when they ask for an example or say they are stuck on a fillable field; clarify when they ask what a question means or when the field is an essay.",
    "- fieldKey must be one of the keys above. For general questions use action null.",
    "- Examples are short placeholders that clearly need rewriting in the applicant's own words. Never invent facts about them.",
    "- For select and multiselect fields, an example text is one or more option labels.",
    "- Do not repeat the example or fill values verbatim inside message.",
  ].join("\n");
}

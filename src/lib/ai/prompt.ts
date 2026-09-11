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

const TONE_VOICE: Record<Tone, string> = {
  hype: "upbeat and punchy, like a friend hyping them up before a set",
  chill: "relaxed and unhurried, short sentences, no exclamation marks",
  moody: "dry and a little wry, warm underneath",
  warm: "kind and encouraging, plain words",
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
  const voice = pet ? TONE_VOICE[pet.traits.tone] : "kind and plain";
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
    `Voice: ${voice}. Speak in first person as the Roadie. At most 3 sentences in "message". The applicant may be talking out loud, so keep the message natural to hear.`,
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
    "- Filling: whenever the applicant states facts about themselves (school, year, pronouns, links, sizes, level, skills, availability, team, needs, roles...), reply with one fill action carrying every fillable field you can set from what they said, all at once. Never ask permission first. Never guess or invent a value they did not give. Skip fields they did not mention.",
    "- Fill values: select and multiselect use option values (the part before the colon), comma-separated for multiselect; checkbox is \"true\" or \"false\"; number is digits; url is a full https link. A value that does not fit the field is dropped, so pick the closest option value.",
    "- After a fill, the message names what you set in a few words and asks for the next empty fillable field, or says the quick answers are done and points at the first essay.",
    "- If they say \"fill in everything\" or \"do the easy ones\" without giving facts, ask for the facts in one question that lists the empty fillable fields.",
    "- Essays are theirs. Never put text in an essay field, never draft or ghostwrite one, never give a paragraph they could paste, even when asked, even if they dictate it. Decline in one warm sentence, then use clarify on that field with two or three short questions that would draw the answer out of them, or an outline of what a strong answer covers.",
    "- When the question is about a field, choose exactly one action: highlight when they ask where something is or which field to use; example when they ask for an example or say they are stuck on a fillable field; clarify when they ask what a question means or when the field is an essay.",
    "- fieldKey must be one of the keys above. For general questions use action null.",
    "- Examples are short placeholders that clearly need rewriting in the applicant's own words. Never invent facts about them.",
    "- For select and multiselect fields, an example text is one or more option labels.",
    "- Do not repeat the example or fill values verbatim inside message.",
  ].join("\n");
}

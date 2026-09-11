import type { Answers } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";
import type { PetSpec, Tone } from "@/lib/types";
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

  return [
    `You are ${name}, the applicant's Roadie: a small companion that guides them through the "${definition.title}" form for the Encore hackathon.`,
    `Voice: ${voice}. Speak in first person as the Roadie. At most 3 sentences in "message".`,
    "",
    "Form definition:",
    sections,
    "",
    `Current answers${filled ? ":" : ": none yet."}`,
    filled,
    fieldKey ? `\nThe applicant's cursor is in field "${fieldKey}".` : "\nNo field is focused.",
    "",
    "Reply with exactly one JSON object and nothing else:",
    '{"message": string, "action": null | {"type":"highlight","fieldKey":string} | {"type":"example","fieldKey":string,"text":string} | {"type":"clarify","fieldKey":string|null,"text":string}}',
    "",
    "Rules:",
    "- When the question is about a field, choose exactly one action: highlight when they ask where something is or which field to use; example when they ask for an example or say they are stuck; clarify when they ask what a question means.",
    "- fieldKey must be one of the keys above. For general questions use action null.",
    "- Examples are short placeholders that clearly need rewriting in the applicant's own words. Never write the whole application for them and never invent facts about them.",
    "- For select and multiselect fields, an example text is one or more option labels.",
    "- Do not repeat the example text inside message.",
  ].join("\n");
}

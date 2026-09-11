import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_MODELS, IMAGE_ENDPOINT, resolveImageProvider, resolveProvider } from "../../src/lib/ai/config";
import { LIMIT_PER_WINDOW, LIMIT_WINDOW_MS, allowRequest, resetLimiter } from "../../src/lib/ai/limiter";
import { fieldKeysOf, parseGuideResponse } from "../../src/lib/ai/guide";
import { exampleFor, offlineGuide, pickField } from "../../src/lib/ai/offline";
import { PORTRAIT_PROMPT, buildPortraitRequest, parsePortraitResponse } from "../../src/lib/ai/portrait";
import { buildSystemPrompt } from "../../src/lib/ai/prompt";
import { FORM_DEFINITIONS } from "../../src/lib/forms/tracks";

const hacker = FORM_DEFINITIONS.hacker;
const keys = fieldKeysOf(hacker);
const fields = hacker.sections.flatMap((section) => section.fields);
const firstRequired = fields.find((field) => field.required);
const firstSelect = fields.find((field) => field.type === "select" && field.options);
const firstMulti = fields.find((field) => field.type === "multiselect" && field.options);
const secondRequired = fields.filter((field) => field.required)[1];

if (!firstRequired || !firstSelect || !firstMulti || !secondRequired) {
  throw new Error("hacker track lost the fields these tests rely on");
}

describe("parseGuideResponse", () => {
  it("accepts a valid object and keeps a known fieldKey", () => {
    const raw = JSON.stringify({
      message: "It is in the first section.",
      action: { type: "highlight", fieldKey: firstRequired.key },
    });
    expect(parseGuideResponse(raw, keys)).toEqual({
      message: "It is in the first section.",
      action: { type: "highlight", fieldKey: firstRequired.key },
    });
  });

  it("strips code fences before parsing", () => {
    const raw = `\`\`\`json\n{"message":"Hi","action":null}\n\`\`\``;
    expect(parseGuideResponse(raw, keys)).toEqual({ message: "Hi" });
  });

  it("falls back to the raw text when the output is not JSON", () => {
    expect(parseGuideResponse("Just tell me about yourself.", keys)).toEqual({
      message: "Just tell me about yourself.",
    });
  });

  it("drops an action whose fieldKey is not in the definition", () => {
    const raw = JSON.stringify({
      message: "Try this.",
      action: { type: "example", fieldKey: "not_a_field", text: "placeholder" },
    });
    expect(parseGuideResponse(raw, keys)).toEqual({ message: "Try this." });
    const clarify = JSON.stringify({
      message: "It means this.",
      action: { type: "clarify", fieldKey: "not_a_field", text: "An explanation." },
    });
    expect(parseGuideResponse(clarify, keys)).toEqual({
      message: "It means this.",
      action: { type: "clarify", text: "An explanation." },
    });
  });

  it("uses the action text when the message is empty", () => {
    const raw = JSON.stringify({ message: "", action: { type: "clarify", fieldKey: null, text: "Only this." } });
    expect(parseGuideResponse(raw, keys).message).toBe("Only this.");
  });
});

describe("offline guide", () => {
  it("picks the focused field when the message names nothing", () => {
    const picked = pickField({
      definition: hacker,
      answers: {},
      fieldKey: secondRequired.key,
      message: "I am stuck here",
    });
    expect(picked?.field.key).toBe(secondRequired.key);
  });

  it("prefers a field the message names over the focused one", () => {
    const picked = pickField({
      definition: hacker,
      answers: {},
      fieldKey: firstRequired.key,
      message: `Where is the ${secondRequired.label.toLowerCase()} field?`,
    });
    expect(picked?.field.key).toBe(secondRequired.key);
  });

  it("falls back to the first incomplete required field when asked what is next", () => {
    const answers = { [firstRequired.key]: firstRequired.type === "checkbox" ? true : "done" };
    const picked = pickField({ definition: hacker, answers, message: "what should I do next?" });
    expect(picked?.field.key).toBe(secondRequired.key);
    expect(picked?.field.required).toBe(true);
  });

  it("picks nothing for a greeting or an off-form question", () => {
    expect(pickField({ definition: hacker, answers: {}, message: "hello" })).toBeUndefined();
    expect(pickField({ definition: hacker, answers: {}, message: "when is the deadline?" })).toBeUndefined();
  });

  it("points at the next required field instead of an example for general messages", () => {
    for (const message of ["hello", "thanks!", "when is the deadline?", "how do I submit?"]) {
      const response = offlineGuide({ definition: hacker, answers: {}, message });
      expect(response.action).toEqual({ type: "highlight", fieldKey: firstRequired.key });
      expect(response.message).toContain(firstRequired.label);
    }
  });

  it("builds an example from options", () => {
    expect(exampleFor(firstSelect)).toBe(firstSelect.options?.[0]?.label);
    const labels = firstMulti.options?.slice(0, 2).map((option) => option.label) ?? [];
    expect(exampleFor(firstMulti)).toBe(labels.join(", "));
  });

  it("answers a where question with a highlight and a stuck question with an example", () => {
    const where = offlineGuide({
      definition: hacker,
      answers: {},
      message: `Where is ${firstSelect.label}?`,
    });
    expect(where.action).toEqual({ type: "highlight", fieldKey: firstSelect.key });

    const stuck = offlineGuide({
      definition: hacker,
      answers: {},
      fieldKey: firstSelect.key,
      message: "I am stuck, give me an example",
    });
    expect(stuck.action).toEqual({
      type: "example",
      fieldKey: firstSelect.key,
      text: firstSelect.options?.[0]?.label,
    });
  });

  it("says so when every required answer is in", () => {
    const answers = Object.fromEntries(
      fields
        .filter((field) => field.required)
        .map((field) => {
          switch (field.type) {
            case "checkbox":
              return [field.key, true];
            case "multiselect":
              return [field.key, [field.options?.[0]?.value ?? ""]];
            case "select":
              return [field.key, field.options?.[0]?.value ?? ""];
            case "number":
              return [field.key, field.min ?? 1];
            case "url":
              return [field.key, "https://example.com"];
            default:
              return [field.key, "done"];
          }
        }),
    );
    const response = offlineGuide({ definition: hacker, answers, message: "hello" });
    expect(response.action).toBeUndefined();
    expect(response.message).toMatch(/required/i);
  });
});

describe("allowRequest", () => {
  it("allows the window's worth per user, then refuses until the window slides", () => {
    resetLimiter();
    const start = 1_000_000;
    for (let index = 0; index < LIMIT_PER_WINDOW; index += 1) expect(allowRequest("a", start + index)).toBe(true);
    expect(allowRequest("a", start + LIMIT_PER_WINDOW)).toBe(false);
    expect(allowRequest("b", start)).toBe(true);
    expect(allowRequest("a", start + LIMIT_WINDOW_MS + 1)).toBe(true);
  });

  it("keeps a prefixed key on its own smaller limit", () => {
    resetLimiter();
    const start = 2_000_000;
    for (let index = 0; index < 3; index += 1) expect(allowRequest("portrait:a", start + index, 3)).toBe(true);
    expect(allowRequest("portrait:a", start + 3, 3)).toBe(false);
    expect(allowRequest("a", start + 3)).toBe(true);
  });
});

describe("resolveImageProvider", () => {
  it("needs the OpenRouter key whatever answers the chat, and respects AI_PROVIDER=offline", () => {
    expect(resolveImageProvider({})).toBeNull();
    expect(resolveImageProvider({ GROQ_API_KEY: "g" })).toBeNull();
    expect(resolveImageProvider({ GROQ_API_KEY: "g", OPENROUTER_API_KEY: "o", AI_PROVIDER: "groq" })).toEqual({
      apiKey: "o",
      endpoint: IMAGE_ENDPOINT,
      models: DEFAULT_IMAGE_MODELS,
    });
    expect(resolveImageProvider({ OPENROUTER_API_KEY: "o", AI_PROVIDER: "offline" })).toBeNull();
  });

  it("puts AI_IMAGE_MODEL first and keeps the default as the fallback", () => {
    expect(resolveImageProvider({ OPENROUTER_API_KEY: "o", AI_IMAGE_MODEL: "custom/model" })?.models).toEqual([
      "custom/model",
      DEFAULT_IMAGE_MODELS[0],
    ]);
  });
});

describe("portrait request and response", () => {
  it("sends the photo as a reference image with the house-style prompt", () => {
    const body = buildPortraitRequest("m", "data:image/png;base64,AAAA", "user-1");
    expect(body.model).toBe("m");
    expect(body.prompt).toBe(PORTRAIT_PROMPT);
    expect(body.input_references[0].image_url.url).toBe("data:image/png;base64,AAAA");
    expect(body.aspect_ratio).toBe("1:1");
    expect(body.user).toBe("user-1");
  });

  it("turns the first image into a data URL and rejects anything else", () => {
    expect(parsePortraitResponse({ data: [{ b64_json: "AAAA", media_type: "image/png" }] })).toBe(
      "data:image/png;base64,AAAA",
    );
    expect(parsePortraitResponse({ data: [{ b64_json: "AAAA" }] })).toBe("data:image/png;base64,AAAA");
    expect(parsePortraitResponse({ data: [{ b64_json: "AAAA", media_type: "image/webp" }] })).toBe(
      "data:image/webp;base64,AAAA",
    );
    expect(parsePortraitResponse({ data: [{ b64_json: "AAAA", media_type: "image/svg+xml" }] })).toBe(
      "data:image/png;base64,AAAA",
    );
    expect(parsePortraitResponse({ data: [{ b64_json: "not base64!" }] })).toBeUndefined();
    expect(parsePortraitResponse({ data: [] })).toBeUndefined();
    expect(parsePortraitResponse({ error: { message: "nope" } })).toBeUndefined();
    expect(parsePortraitResponse("text")).toBeUndefined();
  });
});

describe("resolveProvider", () => {
  it("is offline without keys and honours AI_PROVIDER when its key exists", () => {
    expect(resolveProvider({}).name).toBe("offline");
    expect(resolveProvider({ GROQ_API_KEY: "g" }).name).toBe("groq");
    expect(resolveProvider({ OPENROUTER_API_KEY: "o" }).name).toBe("openrouter");
    expect(resolveProvider({ GROQ_API_KEY: "g", OPENROUTER_API_KEY: "o", AI_PROVIDER: "openrouter" }).name).toBe(
      "openrouter",
    );
    expect(resolveProvider({ AI_PROVIDER: "groq" }).name).toBe("offline");
    expect(resolveProvider({ GROQ_API_KEY: "g", AI_PROVIDER: "offline" }).name).toBe("offline");
  });

  it("puts AI_MODEL first and keeps the default as the fallback", () => {
    expect(resolveProvider({ GROQ_API_KEY: "g", AI_MODEL: "custom" }).models).toEqual([
      "custom",
      "openai/gpt-oss-120b",
    ]);
    expect(resolveProvider({ GROQ_API_KEY: "g" }).models).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  });
});

describe("buildSystemPrompt", () => {
  it("lists every field key, truncates long answers, and names the pet", () => {
    const prompt = buildSystemPrompt({
      definition: hacker,
      answers: { [firstRequired.key]: "x".repeat(1000) },
      fieldKey: firstRequired.key,
      pet: null,
    });
    for (const key of keys) expect(prompt).toContain(`key=${key}`);
    expect(prompt).not.toContain("x".repeat(700));
    expect(prompt).toContain(`cursor is in field "${firstRequired.key}"`);
    expect(prompt).toContain("their Roadie");
  });
});

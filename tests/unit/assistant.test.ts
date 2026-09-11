import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_MODELS, IMAGE_ENDPOINT, resolveImageProvider, resolveProvider } from "../../src/lib/ai/config";
import { LIMIT_PER_WINDOW, LIMIT_WINDOW_MS, allowRequest, resetLimiter } from "../../src/lib/ai/limiter";
import { coerceFill, fillIntro, isEssay, sanitizeFills } from "../../src/lib/ai/fill";
import { essayCoaching, parseGuideResponse, sanitizeTopics } from "../../src/lib/ai/guide";
import { answerFor, askLine, exampleFor, extractFills, nextQuestion, offlineGuide, pickField } from "../../src/lib/ai/offline";
import { offlineResume, parseResumeResponse, resumeHeadlines } from "../../src/lib/ai/resume";
import { PORTRAIT_PROMPT, buildPortraitRequest, parsePortraitResponse } from "../../src/lib/ai/portrait";
import { buildSystemPrompt } from "../../src/lib/ai/prompt";
import { FORM_DEFINITIONS } from "../../src/lib/forms/tracks";

const hacker = FORM_DEFINITIONS.hacker;
const fields = hacker.sections.flatMap((section) => section.fields);
const firstRequired = fields.find((field) => field.required);
const firstSelect = fields.find((field) => field.type === "select" && field.options);
const firstMulti = fields.find((field) => field.type === "multiselect" && field.options);
const secondRequired = fields.filter((field) => field.required)[1];
const firstEssay = fields.find((field) => field.essay);

if (!firstRequired || !firstSelect || !firstMulti || !secondRequired || !firstEssay) {
  throw new Error("hacker track lost the fields these tests rely on");
}

describe("parseGuideResponse", () => {
  it("accepts a valid object and keeps a known fieldKey", () => {
    const raw = JSON.stringify({
      message: "It is in the first section.",
      action: { type: "highlight", fieldKey: firstRequired.key },
    });
    expect(parseGuideResponse(raw, hacker)).toEqual({
      message: "It is in the first section.",
      action: { type: "highlight", fieldKey: firstRequired.key },
    });
  });

  it("strips code fences before parsing", () => {
    const raw = `\`\`\`json\n{"message":"Hi","action":null}\n\`\`\``;
    expect(parseGuideResponse(raw, hacker)).toEqual({ message: "Hi" });
  });

  it("falls back to the raw text when the output is not JSON", () => {
    expect(parseGuideResponse("Just tell me about yourself.", hacker)).toEqual({
      message: "Just tell me about yourself.",
    });
  });

  it("drops an action whose fieldKey is not in the definition", () => {
    const raw = JSON.stringify({
      message: "Try this.",
      action: { type: "example", fieldKey: "not_a_field", text: "placeholder" },
    });
    expect(parseGuideResponse(raw, hacker)).toEqual({ message: "Try this." });
    const clarify = JSON.stringify({
      message: "It means this.",
      action: { type: "clarify", fieldKey: "not_a_field", text: "An explanation." },
    });
    expect(parseGuideResponse(clarify, hacker)).toEqual({
      message: "It means this.",
      action: { type: "clarify", text: "An explanation." },
    });
  });

  it("uses the action text when the message is empty", () => {
    const raw = JSON.stringify({ message: "", action: { type: "clarify", fieldKey: null, text: "Only this." } });
    expect(parseGuideResponse(raw, hacker).message).toBe("Only this.");
  });

  it("keeps a fill for quick fields and coerces the values", () => {
    const raw = JSON.stringify({
      message: "Set.",
      action: {
        type: "fill",
        fields: [
          { fieldKey: "school", value: "UC Berkeley" },
          { fieldKey: "graduation_year", value: "2027" },
          { fieldKey: "shirt_size", value: "M" },
          { fieldKey: "skills", value: "frontend, Backend" },
          { fieldKey: "first_hackathon", value: "true" },
          { fieldKey: "github", value: "github.com/andrew" },
        ],
      },
    });
    expect(parseGuideResponse(raw, hacker).action).toEqual({
      type: "fill",
      fields: [
        { fieldKey: "school", value: "UC Berkeley" },
        { fieldKey: "graduation_year", value: 2027 },
        { fieldKey: "shirt_size", value: "m" },
        { fieldKey: "skills", value: ["frontend", "backend"] },
        { fieldKey: "first_hackathon", value: true },
        { fieldKey: "github", value: "https://github.com/andrew" },
      ],
    });
  });

  it("never fills an essay, even when the model tries", () => {
    const raw = JSON.stringify({
      message: "Done.",
      action: {
        type: "fill",
        fields: [
          { fieldKey: firstEssay.key, value: "A whole drafted essay." },
          { fieldKey: "school", value: "Cal" },
        ],
      },
    });
    expect(parseGuideResponse(raw, hacker).action).toEqual({
      type: "fill",
      fields: [{ fieldKey: "school", value: "Cal" }],
    });
    const onlyEssay = JSON.stringify({
      message: "Done.",
      action: { type: "fill", fields: [{ fieldKey: firstEssay.key, value: "Drafted." }] },
    });
    expect(parseGuideResponse(onlyEssay, hacker).action).toBeUndefined();
  });

  it("turns an example for an essay into coaching without the model's text", () => {
    const raw = JSON.stringify({
      message: "Here you go.",
      action: { type: "example", fieldKey: firstEssay.key, text: "I built a whole thing and it was hard..." },
    });
    const response = parseGuideResponse(raw, hacker);
    expect(response.action).toEqual({ type: "clarify", fieldKey: firstEssay.key, text: essayCoaching(firstEssay) });
    expect(JSON.stringify(response)).not.toContain("I built a whole thing");
  });
});

describe("fill helpers", () => {
  it("flags the long written answers as essays and nothing else", () => {
    const essays = fields.filter(isEssay).map((field) => field.key);
    expect(essays).toEqual(["proud_project", "build_idea", "why_encore"]);
    expect(fields.filter((field) => field.type === "textarea" && !isEssay(field)).map((field) => field.key)).toEqual([
      "needs",
    ]);
  });

  it("coerces per field type and rejects what does not fit", () => {
    const year = fields.find((field) => field.key === "graduation_year");
    const size = fields.find((field) => field.key === "shirt_size");
    const team = fields.find((field) => field.key === "team_status");
    const github = fields.find((field) => field.key === "github");
    if (!year || !size || !team || !github) throw new Error("hacker track lost a field");
    expect(coerceFill(year, "2027")).toBe(2027);
    expect(coerceFill(year, "1999")).toBeUndefined();
    expect(coerceFill(year, "soon")).toBeUndefined();
    expect(coerceFill(size, "xl")).toBe("xl");
    expect(coerceFill(size, "2XL")).toBe("xxl");
    expect(coerceFill(size, "huge")).toBeUndefined();
    expect(coerceFill(team, "solo")).toBe("solo");
    expect(coerceFill(team, "Full team of four")).toBe("full");
    expect(coerceFill(team, "have some teammates")).toBe("partial");
    expect(coerceFill(github, "not a url")).toBeUndefined();
    expect(coerceFill(github, "https://github.com/x")).toBe("https://github.com/x");
    expect(coerceFill(firstEssay, "anything")).toBeUndefined();
  });

  it("drops unknown keys and duplicates when sanitizing", () => {
    expect(
      sanitizeFills(hacker, [
        { fieldKey: "nope", value: "x" },
        { fieldKey: "school", value: "Cal" },
        { fieldKey: "school", value: "Stanford" },
      ]),
    ).toEqual([{ fieldKey: "school", value: "Cal" }]);
  });

  it("introduces the quick answers still open and keeps the essays off the list", () => {
    const intro = fillIntro(hacker, {});
    expect(intro).toMatch(/school/);
    expect(intro).toMatch(/3 written answers stay yours/);
    expect(intro).not.toMatch(/proud/i);
    const later = fillIntro(hacker, { school: "Cal" });
    expect(later).not.toMatch(/\bschool\b/);
  });
});

describe("offline fill extractor", () => {
  it("pulls links, a year, pronouns, options, and the first-hackathon flag out of a statement", () => {
    const fills = extractFills(
      hacker,
      "I'm a junior at UC Berkeley, class of 2027, she/her, github.com/aw and my site is aw.dev. Intermediate, frontend and design, solo, shirt size M, and it's my first hackathon.",
    );
    const byKey = Object.fromEntries(fills.map((fill) => [fill.fieldKey, fill.value]));
    expect(byKey.school).toBe("UC Berkeley");
    expect(byKey.graduation_year).toBe(2027);
    expect(byKey.pronouns).toBe("she/her");
    expect(byKey.github).toBe("https://github.com/aw");
    expect(byKey.portfolio).toBe("https://aw.dev");
    expect(byKey.experience_level).toBe("intermediate");
    expect(byKey.skills).toEqual(["frontend", "design"]);
    expect(byKey.team_status).toBe("solo");
    expect(byKey.shirt_size).toBe("m");
    expect(byKey.first_hackathon).toBe(true);
    expect(byKey.proud_project).toBeUndefined();
  });

  it("fills nothing for questions and greetings", () => {
    expect(extractFills(hacker, "what does solo mean?")).toEqual([]);
    expect(extractFills(hacker, "hello")).toEqual([]);
    expect(extractFills(hacker, "explain the shirt size question")).toEqual([]);
  });

  it("answers a statement with a fill action and points at the next quick field", () => {
    const response = offlineGuide({ definition: hacker, answers: {}, message: "Shirt size L, class of 2028." });
    expect(response.action?.type).toBe("fill");
    expect(response.message).toMatch(/Shirt size/);
    expect(response.ask).toEqual({ fieldKey: "school" });
    expect(response.message).toMatch(/School\?/);
  });

  it("coaches instead of drafting when asked for an essay example", () => {
    const response = offlineGuide({
      definition: hacker,
      answers: {},
      fieldKey: firstEssay.key,
      message: "give me an example",
    });
    expect(response.action).toEqual({ type: "clarify", fieldKey: firstEssay.key, text: essayCoaching(firstEssay) });
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
    const optional = fields.filter((field) => !field.required && !field.essay);
    const response = offlineGuide({ definition: hacker, answers, message: "hello" });
    expect(response.ask).toEqual({ fieldKey: optional[0]?.key });
    expect(response.message).toMatch(/Optional; say skip/);

    const skipped = optional.map((field) => field.key);
    const done = offlineGuide({ definition: hacker, answers, asked: skipped, message: "hello" });
    expect(done.action).toBeUndefined();
    expect(done.ask).toBeUndefined();
    expect(done.message).toMatch(/Every question is answered/);
  });
});

describe("walk-through", () => {
  it("asks every empty fillable field in form order, optional included, then the essays", () => {
    const order: string[] = [];
    const asked: string[] = [];
    for (;;) {
      const next = nextQuestion(hacker, {}, asked);
      if (!next) break;
      order.push(next.key);
      asked.push(next.key);
    }
    expect(order).toContain("pronouns");
    expect(order.indexOf("pronouns")).toBeLessThan(order.indexOf("shirt_size"));
    expect(order.slice(-3)).toEqual(["proud_project", "build_idea", "why_encore"]);
  });

  it("lists options in the question and marks optional fields", () => {
    expect(askLine(firstSelect)).toContain(firstSelect.options?.[0]?.label ?? "");
    const pronouns = fields.find((field) => field.key === "pronouns");
    expect(pronouns && askLine(pronouns)).toMatch(/Optional; say skip/);
  });

  it("hears pronouns as words and never swaps the set", () => {
    const pronouns = fields.find((field) => field.key === "pronouns");
    if (!pronouns) throw new Error("no pronouns field");
    expect(answerFor(pronouns, "he him")).toBe("he/him");
    expect(answerFor(pronouns, "I'm he/him.")).toBe("he/him");
    expect(answerFor(pronouns, "they them")).toBe("they/them");
    expect(answerFor(pronouns, "she")).toBe("she/her");
    expect(answerFor(pronouns, "he slash him")).toBe("he/him");
    expect(extractFills(hacker, "i go by he him").find((fill) => fill.fieldKey === "pronouns")?.value).toBe("he/him");
  });

  it("reads the reply as the answer to the field it asked about", () => {
    const school = offlineGuide({ definition: hacker, answers: {}, asking: "school", message: "I go to UC Berkeley" });
    expect(school.action).toEqual({ type: "fill", fields: [{ fieldKey: "school", value: "UC Berkeley" }] });
    expect(school.ask).toEqual({ fieldKey: "graduation_year" });

    const year = offlineGuide({ definition: hacker, answers: {}, asking: "graduation_year", message: "class of 2027" });
    expect(year.action).toEqual({ type: "fill", fields: [{ fieldKey: "graduation_year", value: 2027 }] });

    const link = offlineGuide({ definition: hacker, answers: {}, asking: "github", message: "github dot com slash aw" });
    expect(link.action).toEqual({ type: "fill", fields: [{ fieldKey: "github", value: "https://github.com/aw" }] });

    const size = offlineGuide({ definition: hacker, answers: {}, asking: "shirt_size", message: "medium" });
    expect(size.action).toEqual({ type: "fill", fields: [{ fieldKey: "shirt_size", value: "m" }] });

    const no = offlineGuide({ definition: hacker, answers: {}, asking: "first_hackathon", message: "no" });
    expect(no.action).toEqual({ type: "fill", fields: [{ fieldKey: "first_hackathon", value: false }] });
    expect(no.ask?.fieldKey).not.toBe("first_hackathon");
  });

  it("skips an optional field on request and re-asks when it cannot map the reply", () => {
    const skip = offlineGuide({ definition: hacker, answers: {}, asking: "pronouns", message: "skip" });
    expect(skip.action).toBeUndefined();
    expect(skip.message).toMatch(/^Skipped pronouns\./);
    expect(skip.ask?.fieldKey).not.toBe("pronouns");

    const lost = offlineGuide({ definition: hacker, answers: {}, asking: "shirt_size", message: "banana" });
    expect(lost.action).toBeUndefined();
    expect(lost.ask).toEqual({ fieldKey: "shirt_size" });
    expect(lost.message).toMatch(/Did not catch that/);
  });

  it("never fills an essay from a reply and moves on", () => {
    const essay = offlineGuide({ definition: hacker, answers: {}, asking: firstEssay.key, message: "I built a compiler" });
    expect(essay.action).toBeUndefined();
    expect(essay.message).toMatch(/do not fill essays/);
    expect(essay.ask?.fieldKey).not.toBe(firstEssay.key);
  });

  it("keeps a model ask only for a real field", () => {
    const raw = JSON.stringify({ message: "School?", action: null, ask: { fieldKey: "school" } });
    expect(parseGuideResponse(raw, hacker).ask).toEqual({ fieldKey: "school" });
    const bad = JSON.stringify({ message: "Hm?", action: null, ask: { fieldKey: "nope" } });
    expect(parseGuideResponse(bad, hacker).ask).toBeUndefined();
  });
});

describe("resume", () => {
  const resume = [
    "Andrew Wang",
    "andrew@example.com | github.com/aw | linkedin.com/in/aw",
    "EDUCATION",
    "UC Berkeley, B.A. Computer Science, expected May 2027",
    "EXPERIENCE",
    "Software Engineering Intern, Stripe, Summer 2025",
    "Built a Rust service for webhook retries",
    "PROJECTS",
    "Open Source Compiler Toolkit",
    "Campus Ride Share App",
    "Skills: Python, React, Rust, frontend, backend",
  ].join("\n");

  it("drops topics for non-essay fields, trims them, and caps three per essay", () => {
    const topics = sanitizeTopics(hacker, [
      { fieldKey: "school", title: "nope" },
      { fieldKey: firstEssay.key, title: "  Compiler   toolkit ", angle: "shows depth" },
      { fieldKey: firstEssay.key, title: "Ride share" },
      { fieldKey: firstEssay.key, title: "Stripe retries" },
      { fieldKey: firstEssay.key, title: "one too many" },
      { fieldKey: firstEssay.key, title: "" },
    ]);
    expect(topics).toHaveLength(3);
    expect(topics[0]).toEqual({ fieldKey: firstEssay.key, title: "Compiler toolkit", angle: "shows depth" });
    expect(topics.map((topic) => topic.title)).not.toContain("one too many");
  });

  it("parses model output into a fill, topics, a message, and the next question", () => {
    const raw = JSON.stringify({
      message: "ignored",
      fields: [
        { fieldKey: "school", value: "UC Berkeley" },
        { fieldKey: "graduation_year", value: "2027" },
        { fieldKey: firstEssay.key, value: "a whole essay" },
      ],
      topics: [{ fieldKey: firstEssay.key, title: "Compiler toolkit", angle: "depth" }],
    });
    const response = parseResumeResponse(raw, hacker, {}, resume);
    expect(response.action).toEqual({
      type: "fill",
      fields: [
        { fieldKey: "school", value: "UC Berkeley" },
        { fieldKey: "graduation_year", value: 2027 },
      ],
    });
    expect(response.topics).toHaveLength(1);
    expect(response.message).toMatch(/^Set school, graduation year\. 1 essay idea below\./);
    expect(response.ask).toEqual({ fieldKey: "pronouns" });
    expect(JSON.stringify(response)).not.toContain("a whole essay");
  });

  it("falls back to the regex reader when the model output is not JSON", () => {
    const response = parseResumeResponse("not json at all", hacker, {}, resume);
    expect(response.action?.type).toBe("fill");
  });

  it("reads links, the latest year, and options out of a resume without a model", () => {
    const response = offlineResume(hacker, {}, resume);
    const byKey = Object.fromEntries((response.action?.type === "fill" ? response.action.fields : []).map((fill) => [fill.fieldKey, fill.value]));
    expect(byKey.github).toBe("https://github.com/aw");
    expect(byKey.linkedin).toBe("https://linkedin.com/in/aw");
    expect(byKey.graduation_year).toBe(2027);
    expect(byKey.skills).toEqual(expect.arrayContaining(["frontend", "backend"]));
    expect(response.topics?.length).toBeGreaterThan(0);
    expect(response.topics?.every((topic) => fields.find((field) => field.key === topic.fieldKey)?.essay)).toBe(true);
  });

  it("picks project and role lines as headlines and skips section headings and contact lines", () => {
    const lines = resumeHeadlines(resume, 10);
    expect(lines).toContain("Open Source Compiler Toolkit");
    expect(lines).toContain("Campus Ride Share App");
    expect(lines).not.toContain("EDUCATION");
    expect(lines.some((line) => line.includes("@"))).toBe(false);
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
    for (const field of fields) expect(prompt).toContain(`key=${field.key}`);
    expect(prompt).not.toContain("x".repeat(700));
    expect(prompt).toContain(`cursor is in field "${firstRequired.key}"`);
    expect(prompt).toContain("their Roadie");
  });
});

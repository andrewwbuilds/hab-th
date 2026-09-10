import { describe, expect, it } from "vitest";
import { TRACKS } from "@/lib/types";
import { FORM_DEFINITIONS, allFields } from "@/lib/forms/tracks";
import {
  buildSchema,
  completion,
  parseAnswers,
  validateAnswers,
  type Answers,
} from "@/lib/forms/schema";

const about: Answers = {
  school: "UC Berkeley",
  graduation_year: 2027,
  github: "https://github.com/demo",
  shirt_size: "m",
};

const hackerAnswers: Answers = {
  ...about,
  experience_level: "intermediate",
  first_hackathon: false,
  skills: ["frontend", "backend"],
  proud_project: "A CLI that syncs my class schedule to Google Calendar.",
  build_idea: "A tool that turns lecture recordings into flashcards.",
  team_status: "solo",
  why_encore: "I want to ship something end to end.",
};

describe("form definitions", () => {
  it("defines every track with an about section, sections, and a 3-criterion rubric", () => {
    for (const track of TRACKS) {
      const def = FORM_DEFINITIONS[track];
      expect(def.track).toBe(track);
      expect(def.sections[0]?.key).toBe("about");
      expect(def.sections.length).toBeGreaterThanOrEqual(3);
      expect(def.rubric).toHaveLength(3);
    }
  });

  it("uses unique field keys and rubric keys per track", () => {
    for (const track of TRACKS) {
      const keys = allFields(track).map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
      const rubricKeys = FORM_DEFINITIONS[track].rubric.map((criterion) => criterion.key);
      expect(new Set(rubricKeys).size).toBe(rubricKeys.length);
    }
  });

  it("gives every field a hint and every select an option list", () => {
    for (const track of TRACKS) {
      for (const field of allFields(track)) {
        expect(field.hint.length).toBeGreaterThan(10);
        if (field.type === "select" || field.type === "multiselect") {
          expect(field.options?.length ?? 0).toBeGreaterThan(1);
        }
      }
    }
  });
});

describe("buildSchema", () => {
  it("builds a schema with one key per field", () => {
    for (const track of TRACKS) {
      const schema = buildSchema(track);
      expect(Object.keys(schema.shape).sort()).toEqual(
        allFields(track)
          .map((field) => field.key)
          .sort(),
      );
    }
  });
});

describe("validateAnswers", () => {
  it("accepts a complete hacker application and strips unknown keys", () => {
    const result = validateAnswers("hacker", { ...hackerAnswers, bogus: "x" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers.bogus).toBeUndefined();
      expect(result.answers.school).toBe("UC Berkeley");
      expect(result.answers.graduation_year).toBe(2027);
    }
  });

  it("reports one error per missing required field", () => {
    const result = validateAnswers("hacker", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.school).toBe("This field is required");
      expect(result.fieldErrors.shirt_size).toBeDefined();
      expect(result.fieldErrors.skills).toBe("Pick at least one");
      expect(result.fieldErrors.pronouns).toBeUndefined();
      expect(result.fieldErrors.first_hackathon).toBeUndefined();
    }
  });

  it("rejects bad urls, out-of-range years, and unknown options", () => {
    const result = validateAnswers("hacker", {
      ...hackerAnswers,
      github: "not a url",
      graduation_year: 1990,
      team_status: "quintet",
      skills: ["frontend", "cooking"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.github).toMatch(/URL/);
      expect(result.fieldErrors.graduation_year).toMatch(/2000/);
      expect(result.fieldErrors.team_status).toBeDefined();
      expect(result.fieldErrors.skills).toBeDefined();
    }
  });

  it("accepts empty strings for optional urls and selects", () => {
    const result = validateAnswers("hacker", { ...hackerAnswers, github: "", linkedin: "" });
    expect(result.ok).toBe(true);
  });

  it("coerces numeric strings for number fields", () => {
    const result = validateAnswers("hacker", { ...hackerAnswers, graduation_year: "2028" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.answers.graduation_year).toBe(2028);
  });

  it("requires the volunteer physical checkbox to be checked", () => {
    const result = validateAnswers("volunteer", {
      ...about,
      shifts: ["sat_morning"],
      roles: ["checkin"],
      physical_ok: false,
      why_volunteer: "I like helping.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.physical_ok).toBeDefined();
  });

  it("treats non-object input as empty", () => {
    const result = validateAnswers("judge", null);
    expect(result.ok).toBe(false);
  });
});

describe("completion", () => {
  it("is zero for an empty draft and lists every required key", () => {
    const result = completion("hacker", {});
    expect(result.percent).toBe(0);
    expect(result.sectionsDone).toEqual([]);
    expect(result.requiredMissing).toContain("school");
    expect(result.requiredMissing).not.toContain("pronouns");
  });

  it("is 100 with every section done for a complete application", () => {
    const result = completion("hacker", hackerAnswers);
    expect(result.percent).toBe(100);
    expect(result.sectionsDone).toEqual(["about", "experience", "plan"]);
    expect(result.requiredMissing).toEqual([]);
  });

  it("marks a section done only when all of its required fields are answered", () => {
    const result = completion("hacker", { ...about, experience_level: "beginner" });
    expect(result.sectionsDone).toEqual(["about"]);
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThan(100);
  });

  it("ignores whitespace-only answers", () => {
    const result = completion("hacker", { school: "   " });
    expect(result.requiredMissing).toContain("school");
  });
});

describe("parseAnswers", () => {
  it("keeps primitive and string-array values and drops the rest", () => {
    const parsed = parseAnswers({
      a: "x",
      b: 2,
      c: true,
      d: ["p", "q"],
      e: [1, 2],
      f: { nested: true },
      g: null,
    });
    expect(parsed).toEqual({ a: "x", b: 2, c: true, d: ["p", "q"] });
  });

  it("returns an empty object for non-objects", () => {
    expect(parseAnswers("nope")).toEqual({});
    expect(parseAnswers([1])).toEqual({});
  });
});

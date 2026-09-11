import { describe, expect, it } from "vitest";
import { firstApplication, onboardingPath } from "@/app/app/focus";
import type { MyApplication } from "@/lib/data/types";
import type { PetSpec, Status, Track } from "@/lib/types";

function application(track: Track, status: Status): MyApplication {
  return { track, status } as MyApplication;
}

describe("firstApplication", () => {
  it("is the single draft an applicant has", () => {
    const draft = application("hacker", "draft");
    expect(firstApplication([draft])).toBe(draft);
  });

  it("is null once anything is submitted or a second track starts", () => {
    expect(firstApplication([])).toBeNull();
    expect(firstApplication([application("hacker", "submitted")])).toBeNull();
    expect(firstApplication([application("hacker", "draft"), application("judge", "draft")])).toBeNull();
  });
});

describe("onboardingPath", () => {
  it("sends applicants without a guide to the picker and back to the form", () => {
    expect(onboardingPath(null, "judge")).toBe("/app/roadie?next=%2Fapp%2Fapply%2Fjudge");
  });

  it("sends applicants with a guide straight to the form", () => {
    expect(onboardingPath({ name: "Gary" } as PetSpec, "judge")).toBe("/app/apply/judge");
  });
});

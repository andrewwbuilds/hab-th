import { describe, expect, it } from "vitest";
import { applyPath, roadiePath, safeInternalPath, trackFromParam } from "@/lib/navigation";

describe("safeInternalPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeInternalPath("/app/apply/judge")).toBe("/app/apply/judge");
    expect(safeInternalPath("/org?track=hacker")).toBe("/org?track=hacker");
  });

  it("rejects anything that could leave the origin", () => {
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("/\\evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("app")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});

describe("trackFromParam", () => {
  it("returns a known track and falls back to hacker otherwise", () => {
    expect(trackFromParam("judge")).toBe("judge");
    expect(trackFromParam("dj")).toBe("hacker");
    expect(trackFromParam(["judge"])).toBe("hacker");
    expect(trackFromParam(undefined, "mentor")).toBe("mentor");
  });
});

describe("roadiePath", () => {
  it("carries a safe return path and drops an unsafe one", () => {
    expect(applyPath("volunteer")).toBe("/app/apply/volunteer");
    expect(roadiePath("/app/apply/volunteer")).toBe("/app/roadie?next=%2Fapp%2Fapply%2Fvolunteer");
    expect(roadiePath("//evil.example")).toBe("/app/roadie");
    expect(roadiePath()).toBe("/app/roadie");
  });
});

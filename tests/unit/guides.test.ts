import { describe, expect, it } from "vitest";
import { guideSchema, traitsSchema } from "../../src/lib/data/pet-row";
import { applyXp, derivePet } from "../../src/lib/pet/engine";
import { GUIDES } from "../../src/lib/pet/guides";

describe("saved guides", () => {
  it("accepts all three supplied guides and rejects mismatched or remote portraits", () => {
    for (const guide of GUIDES) expect(guideSchema.safeParse({ kind: guide.id, image: guide.image }).success).toBe(true);
    expect(guideSchema.safeParse({ kind: "gary", image: "/guides/eddy.png" }).success).toBe(false);
    expect(guideSchema.safeParse({ kind: "photo", image: "https://example.com/photo.png" }).success).toBe(false);
    expect(guideSchema.safeParse({ kind: "photo", image: "data:image/svg+xml;base64,AAAA" }).success).toBe(false);
  });
  it("retains custom portraits when traits are read and experience is awarded", () => {
    const base = derivePet({ genres: ["indie"], energy: 3, mood: 4, era: "20s", hoursPerDay: "1to3", discovery: "friends", topArtist: "Test", anthem: "" });
    const guide = { kind: "drawing" as const, image: "data:image/png;base64,AAAA" };
    const traits = traitsSchema.parse({ ...base.traits, guide });
    expect(applyXp({ ...base, traits }, "firstDraft").traits.guide).toEqual(guide);
    expect(traitsSchema.parse(base.traits).guide).toBeUndefined();
  });
});

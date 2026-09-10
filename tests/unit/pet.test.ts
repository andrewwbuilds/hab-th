import { describe, expect, it } from "vitest";
import {
  applyXp,
  contrastRatio,
  derivePet,
  paletteFor,
  SPECIES_LABEL,
  speciesFor,
  stageFor,
  XP_EVENTS,
} from "@/lib/pet/engine";
import { suggestName } from "@/lib/pet/names";
import { getRoadieLine, lineVariantCount, MAX_LINE_LENGTH, moodForContext, type RoadieLineContext } from "@/lib/pet/voice";
import {
  DISCOVERY,
  ERAS,
  GENRES,
  HOURS,
  SPECIES,
  STATUSES,
  type MusicProfile,
  type PetSpec,
  type RoadieContext,
  type Scale5,
  type Tone,
} from "@/lib/types";

const SCALE: Scale5[] = [1, 2, 3, 4, 5];

const baseProfile: MusicProfile = {
  genres: ["indie", "electronic"],
  energy: 3,
  mood: 3,
  era: "10s",
  hoursPerDay: "1to3",
  discovery: "playlists",
  topArtist: "Phoebe Bridgers",
  anthem: "Motion Sickness",
};

function profileWithTone(tone: Tone): MusicProfile {
  const byTone: Record<Tone, Pick<MusicProfile, "energy" | "mood">> = {
    hype: { energy: 5, mood: 5 },
    chill: { energy: 1, mood: 3 },
    moody: { energy: 3, mood: 1 },
    warm: { energy: 3, mood: 3 },
  };
  return { ...baseProfile, ...byTone[tone] };
}

const TONES: Tone[] = ["hype", "chill", "moody", "warm"];

describe("derivePet", () => {
  it("is deterministic for the same profile", () => {
    const a = derivePet(baseProfile);
    const b = derivePet(structuredClone(baseProfile));
    expect(a).toEqual(b);
  });

  it("maps every genre to a distinct species with a label", () => {
    const seen = new Set<string>();
    for (const genre of GENRES) {
      const species = speciesFor(genre);
      expect(SPECIES).toContain(species);
      expect(SPECIES_LABEL[species]).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
      seen.add(species);
    }
    expect(seen.size).toBe(GENRES.length);
  });

  it("uses the first genre for species", () => {
    expect(derivePet({ ...baseProfile, genres: ["metal", "pop"] }).species).toBe("dragon");
    expect(derivePet({ ...baseProfile, genres: ["pop", "metal"] }).species).toBe("bunny");
  });

  it("derives tone from energy and mood", () => {
    expect(derivePet(profileWithTone("hype")).traits.tone).toBe("hype");
    expect(derivePet(profileWithTone("chill")).traits.tone).toBe("chill");
    expect(derivePet(profileWithTone("moody")).traits.tone).toBe("moody");
    expect(derivePet(profileWithTone("warm")).traits.tone).toBe("warm");
    expect(derivePet({ ...baseProfile, energy: 1, mood: 1 }).traits.tone).toBe("chill");
  });

  it("maps era to accessory and hours to chattiness", () => {
    expect(derivePet({ ...baseProfile, era: "70s" }).traits.accessory).toBe("vinyl");
    expect(derivePet({ ...baseProfile, era: "80s" }).traits.accessory).toBe("cassette");
    expect(derivePet({ ...baseProfile, era: "90s" }).traits.accessory).toBe("cassette");
    expect(derivePet({ ...baseProfile, era: "00s" }).traits.accessory).toBe("ipod");
    expect(derivePet({ ...baseProfile, era: "10s" }).traits.accessory).toBe("headphones");
    expect(derivePet({ ...baseProfile, era: "20s" }).traits.accessory).toBe("headphones");
    expect(derivePet({ ...baseProfile, hoursPerDay: "under1" }).traits.chattiness).toBe("terse");
    expect(derivePet({ ...baseProfile, hoursPerDay: "over6" }).traits.chattiness).toBe("talkative");
  });

  it("honours a provided name and falls back to a suggestion", () => {
    expect(derivePet(baseProfile, "  Pickle ").name).toBe("Pickle");
    expect(derivePet(baseProfile, "   ").name).toBe(suggestName(baseProfile));
    expect(derivePet(baseProfile).name).toBe(suggestName(baseProfile));
  });

  it("starts at zero xp in the egg stage", () => {
    const spec = derivePet(baseProfile);
    expect(spec.xp).toBe(0);
    expect(stageFor(spec.xp)).toBe("egg");
  });
});

describe("stageFor", () => {
  it("respects the stage boundaries", () => {
    expect(stageFor(0)).toBe("egg");
    expect(stageFor(49)).toBe("egg");
    expect(stageFor(50)).toBe("hatchling");
    expect(stageFor(149)).toBe("hatchling");
    expect(stageFor(150)).toBe("grown");
    expect(stageFor(999)).toBe("grown");
  });
});

describe("applyXp", () => {
  it("awards each event once", () => {
    const spec = derivePet(baseProfile);
    const once = applyXp(spec, "petCreated");
    const twice = applyXp(once, "petCreated");
    expect(once.xp).toBe(XP_EVENTS.petCreated);
    expect(twice).toEqual(once);
    expect(twice.traits.xpEvents).toEqual(["petCreated"]);
  });

  it("does not mutate the input", () => {
    const spec = derivePet(baseProfile);
    applyXp(spec, "submitted");
    expect(spec.xp).toBe(0);
    expect(spec.traits.xpEvents).toEqual([]);
  });

  it("treats qualified events as separate keys", () => {
    let spec = derivePet(baseProfile);
    spec = applyXp(spec, "sectionComplete", "hacker/about");
    spec = applyXp(spec, "sectionComplete", "hacker/about");
    spec = applyXp(spec, "sectionComplete", "hacker/project");
    expect(spec.xp).toBe(XP_EVENTS.sectionComplete * 2);
  });

  it("walks the full lifecycle into the grown stage", () => {
    let spec = derivePet(baseProfile);
    spec = applyXp(spec, "petCreated");
    spec = applyXp(spec, "firstDraft");
    expect(stageFor(spec.xp)).toBe("hatchling");
    spec = applyXp(spec, "sectionComplete", "a");
    spec = applyXp(spec, "sectionComplete", "b");
    spec = applyXp(spec, "submitted");
    expect(stageFor(spec.xp)).toBe("grown");
    spec = applyXp(spec, "decision");
    expect(spec.xp).toBe(170);
  });

  it("handles specs stored without an xpEvents list", () => {
    const spec: PetSpec = derivePet(baseProfile);
    const stored: PetSpec = {
      ...spec,
      traits: { ...spec.traits, xpEvents: undefined },
    };
    expect(applyXp(stored, "decision").xp).toBe(XP_EVENTS.decision);
  });
});

describe("paletteFor", () => {
  it("stays legible on the dark background and on white for every mood and energy", () => {
    for (const mood of SCALE) {
      for (const energy of SCALE) {
        for (const genre of GENRES) {
          const palette = paletteFor({ ...baseProfile, mood, energy, genres: ["indie", genre] });
          for (const hex of [palette.primary, palette.secondary, palette.accent]) {
            expect(hex).toMatch(/^#[0-9a-f]{6}$/);
          }
          expect(contrastRatio(palette.primary, "#08090a")).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(palette.primary, "#ffffff")).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("changes with mood and with the secondary genre", () => {
    const low = paletteFor({ ...baseProfile, mood: 1 });
    const high = paletteFor({ ...baseProfile, mood: 5 });
    expect(low.primary).not.toBe(high.primary);
    const nudged = paletteFor({ ...baseProfile, genres: ["indie", "latin"] });
    const plain = paletteFor({ ...baseProfile, genres: ["indie"] });
    expect(nudged.primary).not.toBe(plain.primary);
  });
});

describe("suggestName", () => {
  it("returns a capitalised name between 4 and 9 characters", () => {
    for (const genre of GENRES) {
      for (const second of GENRES) {
        const name = suggestName({ ...baseProfile, genres: [genre, second], topArtist: `${genre} ${second}` });
        expect(name).toMatch(/^[A-Z][a-z]+$/);
        expect(name.length).toBeGreaterThanOrEqual(4);
        expect(name.length).toBeLessThanOrEqual(9);
      }
    }
  });

  it("is seeded by artist and genres", () => {
    expect(suggestName(baseProfile)).toBe(suggestName({ ...baseProfile, anthem: "different" }));
    const names = new Set(
      ["Radiohead", "Bjork", "SZA", "Charli xcx", "Beach House", "Burial"].map((topArtist) =>
        suggestName({ ...baseProfile, topArtist }),
      ),
    );
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("getRoadieLine", () => {
  const contexts: RoadieLineContext[] = [
    { screen: "home" },
    { screen: "roadie" },
    { screen: "form", track: "hacker" },
    { screen: "home", status: "draft" },
    { screen: "home", status: "submitted" },
    { screen: "home", status: "accepted" },
    { screen: "form", track: "hacker", section: "About you" },
    { screen: "form", track: "hacker", section: "About you", completion: 10 },
    {
      screen: "form",
      track: "hacker",
      section: "About you",
      fieldKey: "bio",
      fieldHint: "Two or three sentences about what you build and why",
    },
    {
      screen: "form",
      track: "judge",
      section: "Experience",
      fieldKey: "years",
      errors: ["Years of experience must be a whole number"],
    },
    { screen: "form", track: "mentor", section: "Skills", completion: 25 },
    { screen: "form", track: "mentor", section: "Skills", completion: 50 },
    { screen: "form", track: "mentor", section: "Skills", completion: 75 },
    { screen: "form", track: "mentor", section: "Skills", completion: 100 },
    ...STATUSES.map((status): RoadieContext => ({ screen: "status", track: "volunteer", status })),
  ];

  const specs: PetSpec[] = TONES.flatMap((tone) =>
    HOURS.map((hoursPerDay) => derivePet({ ...profileWithTone(tone), hoursPerDay })),
  );

  it("returns a non-empty line under the length cap for every tone, chattiness, context and variant", () => {
    for (const spec of specs) {
      for (const ctx of contexts) {
        const variants = lineVariantCount(spec, ctx);
        expect(variants).toBeGreaterThan(0);
        for (let variant = 0; variant < variants; variant += 1) {
          const line = getRoadieLine(spec, ctx, variant);
          expect(line.length).toBeGreaterThan(0);
          expect(line.length).toBeLessThan(MAX_LINE_LENGTH);
          expect(line).not.toMatch(/[—–]/);
          expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
          expect(line).toMatch(/^[A-Z0-9]/);
        }
      }
    }
  });

  it("is deterministic for the same context", () => {
    const spec = derivePet(baseProfile);
    const ctx: RoadieContext = { screen: "form", section: "About you", fieldKey: "bio", fieldHint: "Keep it short" };
    expect(getRoadieLine(spec, ctx)).toBe(getRoadieLine(spec, { ...ctx }));
  });

  it("keeps the field hint recognisable in every tone", () => {
    const hint = "Two or three sentences about what you build and why";
    for (const tone of TONES) {
      const spec = derivePet(profileWithTone(tone));
      const line = getRoadieLine(spec, { screen: "form", section: "About you", fieldKey: "bio", fieldHint: hint });
      expect(line).toContain(hint);
    }
  });

  it("never says 'this section' before a section is open", () => {
    for (const spec of specs) {
      const ctx: RoadieLineContext = { screen: "form", track: "hacker" };
      for (let variant = 0; variant < lineVariantCount(spec, ctx); variant += 1) {
        expect(getRoadieLine(spec, ctx, variant)).not.toContain("this section");
      }
    }
  });

  it("leads into an error with a full stop so a labelled error does not double the colon", () => {
    const error = "Skills: Pick at least one.";
    for (const spec of specs) {
      const ctx: RoadieLineContext = { screen: "form", section: "Skills", errors: [error] };
      for (let variant = 0; variant < lineVariantCount(spec, ctx); variant += 1) {
        const line = getRoadieLine(spec, ctx, variant);
        expect(line).toContain(error);
        expect(line).not.toMatch(/: [^:]*:/);
      }
    }
  });

  it("talks about the pet on the roadie page and looks happy doing it", () => {
    expect(moodForContext({ screen: "roadie" })).toBe("happy");
    for (const tone of TONES) {
      const spec = derivePet(profileWithTone(tone));
      const line = getRoadieLine(spec, { screen: "roadie" });
      expect(line).not.toBe(getRoadieLine(spec, { screen: "home", status: "submitted" }));
      expect(line).toMatch(/me|I /i);
    }
  });

  it("mentions the first error", () => {
    const spec = derivePet(baseProfile);
    const line = getRoadieLine(spec, {
      screen: "form",
      section: "Links",
      errors: ["GitHub link must be a URL", "Portfolio is required"],
    });
    expect(line).toContain("GitHub link must be a URL");
    expect(line).not.toContain("Portfolio");
  });

  it("names the top artist at most once per line", () => {
    for (const spec of specs) {
      for (const ctx of contexts) {
        for (let variant = 0; variant < lineVariantCount(spec, ctx); variant += 1) {
          const line = getRoadieLine(spec, ctx, variant);
          const mentions = line.split(spec.music.topArtist).length - 1;
          expect(mentions).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("gives different lines for different tones and for cycled variants", () => {
    const ctx: RoadieContext = { screen: "home" };
    const lines = new Set(TONES.map((tone) => getRoadieLine(derivePet(profileWithTone(tone)), ctx)));
    expect(lines.size).toBe(TONES.length);
    const spec = derivePet(baseProfile);
    expect(getRoadieLine(spec, ctx, 0)).not.toBe(getRoadieLine(spec, ctx, 1));
  });

  it("clips an overlong hint instead of exceeding the cap", () => {
    const spec = derivePet({ ...baseProfile, hoursPerDay: "over6" });
    const line = getRoadieLine(spec, {
      screen: "form",
      section: "About you",
      fieldKey: "bio",
      fieldHint: "word ".repeat(60).trim(),
    });
    expect(line.length).toBeLessThan(MAX_LINE_LENGTH);
  });

  it("covers every era and discovery style without throwing", () => {
    for (const era of ERAS) {
      for (const discovery of DISCOVERY) {
        const spec = derivePet({ ...baseProfile, era, discovery });
        expect(getRoadieLine(spec, { screen: "home", status: "draft" }).length).toBeGreaterThan(0);
      }
    }
  });
});

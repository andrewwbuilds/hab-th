import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PetSprite } from "@/components/pet/PetSprite";
import { RoadieCard } from "@/components/pet/RoadieCard";
import { RoadieHatch } from "@/components/pet/RoadieHatch";
import { RoadieQuiz } from "@/components/pet/RoadieQuiz";
import { derivePet, SPECIES_LABEL, STAGE_THRESHOLDS } from "@/lib/pet/engine";
import { GENRES, type MusicProfile, type PetSpec } from "@/lib/types";

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

function specFor(genre: MusicProfile["genres"][number], xp = 0): PetSpec {
  return { ...derivePet({ ...baseProfile, genres: [genre] }), xp };
}

const SAMPLE_SPECS: PetSpec[] = [
  specFor("indie"),
  specFor("metal", STAGE_THRESHOLDS.hatchling),
  specFor("rnb", STAGE_THRESHOLDS.grown),
];

describe("PetSprite", () => {
  it("renders an svg with the pet name for every species", () => {
    for (const genre of GENRES) {
      const spec = specFor(genre, STAGE_THRESHOLDS.grown);
      const html = renderToStaticMarkup(createElement(PetSprite, { spec }));
      expect(html).toContain("<svg");
      expect(html).toContain(`aria-label="${spec.name}, a ${SPECIES_LABEL[spec.species].toLowerCase()} (grown)"`);
    }
  });

  it("changes with stage", () => {
    const egg = renderToStaticMarkup(createElement(PetSprite, { spec: specFor("rock", 0) }));
    const hatchling = renderToStaticMarkup(
      createElement(PetSprite, { spec: specFor("rock", STAGE_THRESHOLDS.hatchling) }),
    );
    const grown = renderToStaticMarkup(createElement(PetSprite, { spec: specFor("rock", STAGE_THRESHOLDS.grown) }));
    expect(egg).not.toEqual(hatchling);
    expect(hatchling).not.toEqual(grown);
    expect(egg).toContain("(egg)");
    expect(grown).toContain("(grown)");
  });

  it("marks the requested mood on the stage group", () => {
    const html = renderToStaticMarkup(createElement(PetSprite, { spec: specFor("pop"), mood: "celebrate" }));
    expect(html).toContain('data-mood="celebrate"');
  });
});

describe("RoadieCard", () => {
  it.each(SAMPLE_SPECS)("shows the sprite, name, species and music for $name", (spec) => {
    const html = renderToStaticMarkup(createElement(RoadieCard, { spec }));
    expect(html).toContain("<svg");
    expect(html).toContain(spec.name);
    expect(html).toContain(SPECIES_LABEL[spec.species]);
    expect(html).toContain(baseProfile.topArtist);
    expect(html).toContain(baseProfile.anthem);
    expect(html).toContain('role="progressbar"');
  });

  it("omits the anthem row when the anthem is blank", () => {
    const spec: PetSpec = { ...specFor("jazz"), music: { ...baseProfile, genres: ["jazz"], anthem: "  " } };
    const html = renderToStaticMarkup(createElement(RoadieCard, { spec }));
    expect(html).not.toContain("Anthem");
  });

  it("drops the xp bar in compact mode", () => {
    const html = renderToStaticMarkup(createElement(RoadieCard, { spec: specFor("lofi"), compact: true }));
    expect(html).toContain("<svg");
    expect(html).not.toContain('role="progressbar"');
  });

  it("labels the progress toward the next stage", () => {
    const egg = renderToStaticMarkup(createElement(RoadieCard, { spec: specFor("country", 25) }));
    expect(egg).toContain("Egg, 25 xp to hatchling");
    const grown = renderToStaticMarkup(createElement(RoadieCard, { spec: specFor("country", 200) }));
    expect(grown).toContain("Grown, 200 xp");
  });
});

describe("RoadieQuiz", () => {
  it("renders the genre step first with a progress bar and disabled back", () => {
    const html = renderToStaticMarkup(createElement(RoadieQuiz, { onComplete: () => undefined }));
    expect(html).toContain("Step 1 of 8");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("What do you listen to?");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Back/);
    expect(html).not.toContain("Hatch my Roadie");
  });
});

describe("RoadieHatch", () => {
  it("starts on the egg with the name hidden", () => {
    const spec = specFor("electronic", STAGE_THRESHOLDS.grown);
    const html = renderToStaticMarkup(createElement(RoadieHatch, { spec, onDone: () => undefined }));
    expect(html).toContain('data-phase="egg"');
    expect(html).toContain("(egg)");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(spec.name);
  });
});

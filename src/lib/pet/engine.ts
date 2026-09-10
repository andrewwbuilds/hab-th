import type {
  Accessory,
  Chattiness,
  Era,
  Genre,
  HoursPerDay,
  MusicProfile,
  PetPalette,
  PetSpec,
  Species,
  Stage,
  Tone,
} from "@/lib/types";
import { suggestName } from "@/lib/pet/names";

export const SPECIES_LABEL: Record<Species, string> = {
  moth: "Synth moth",
  cat: "Boombox cat",
  fox: "Cardigan fox",
  bunny: "Glitter bunny",
  wolf: "Riff wolf",
  dragon: "Amp dragon",
  raccoon: "Velvet raccoon",
  owl: "Quill owl",
  swan: "Silk swan",
  deer: "Porch deer",
  sloth: "Tape sloth",
  parrot: "Clave parrot",
};

const SPECIES_BY_GENRE: Record<Genre, Species> = {
  electronic: "moth",
  hiphop: "cat",
  indie: "fox",
  pop: "bunny",
  rock: "wolf",
  metal: "dragon",
  jazz: "raccoon",
  classical: "owl",
  rnb: "swan",
  country: "deer",
  lofi: "sloth",
  latin: "parrot",
};

export function speciesFor(genre: Genre): Species {
  return SPECIES_BY_GENRE[genre];
}

export const XP_EVENTS = {
  petCreated: 25,
  firstDraft: 25,
  sectionComplete: 20,
  submitted: 60,
  decision: 20,
} as const;

export type XpEventKey = keyof typeof XP_EVENTS;

export const STAGE_THRESHOLDS: Record<Stage, number> = {
  egg: 0,
  hatchling: 50,
  grown: 150,
};

export const STAGE_LABEL: Record<Stage, string> = {
  egg: "Egg",
  hatchling: "Hatchling",
  grown: "Grown",
};

export const TONE_LABEL: Record<Tone, string> = {
  hype: "Hype",
  chill: "Chill",
  moody: "Moody",
  warm: "Warm",
};

export function stageFor(xp: number): Stage {
  if (xp >= STAGE_THRESHOLDS.grown) return "grown";
  if (xp >= STAGE_THRESHOLDS.hatchling) return "hatchling";
  return "egg";
}

/** XP needed to reach the next stage, or null once grown. */
export function nextStageXp(xp: number): number | null {
  const stage = stageFor(xp);
  if (stage === "egg") return STAGE_THRESHOLDS.hatchling;
  if (stage === "hatchling") return STAGE_THRESHOLDS.grown;
  return null;
}

const HUE_BY_MOOD: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 258,
  2: 222,
  3: 188,
  4: 14,
  5: 40,
};

const HUE_NUDGE_BY_GENRE: Record<Genre, number> = {
  electronic: 12,
  hiphop: -8,
  indie: 6,
  pop: 10,
  rock: -6,
  metal: -12,
  jazz: 4,
  classical: -4,
  rnb: 8,
  country: -10,
  lofi: 2,
  latin: 14,
};

const DARK_BG_LUMINANCE = relativeLuminance("#08090a");
const MIN_LUMINANCE = 3 * (DARK_BG_LUMINANCE + 0.05) - 0.05;
const MAX_LUMINANCE = 1.05 / 2 - 0.05;

function clampHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = clampHue(h) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = light - c / 2;
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Walks lightness until the colour sits between the dark app background and
 * a white card. Luminance is monotonic in HSL lightness, so a step search
 * converges.
 */
function legibleHex(h: number, s: number, startL: number): string {
  let l = startL;
  for (let i = 0; i < 80; i += 1) {
    const hex = toHex(hslToRgb(h, s, l));
    const lum = relativeLuminance(hex);
    if (lum > MAX_LUMINANCE && l > 1) l -= 1;
    else if (lum < MIN_LUMINANCE && l < 99) l += 1;
    else return hex;
  }
  return toHex(hslToRgb(h, s, l));
}

export function paletteFor(profile: MusicProfile): PetPalette {
  const baseHue = HUE_BY_MOOD[profile.mood];
  const secondaryGenre = profile.genres[1];
  const nudge = secondaryGenre ? HUE_NUDGE_BY_GENRE[secondaryGenre] : 0;
  const hue = clampHue(baseHue + nudge);
  const saturation = 48 + profile.energy * 9;
  return {
    primary: legibleHex(hue, saturation, 56),
    secondary: legibleHex(hue + 28, Math.max(30, saturation - 18), 66),
    accent: legibleHex(hue + 160, Math.min(95, saturation + 6), 58),
  };
}

export function toneFor(profile: MusicProfile): Tone {
  if (profile.energy >= 4 && profile.mood >= 4) return "hype";
  if (profile.energy <= 2) return "chill";
  if (profile.mood <= 2) return "moody";
  return "warm";
}

const CHATTINESS_BY_HOURS: Record<HoursPerDay, Chattiness> = {
  under1: "terse",
  "1to3": "normal",
  "3to6": "normal",
  over6: "talkative",
};

const ACCESSORY_BY_ERA: Record<Era, Accessory> = {
  "70s": "vinyl",
  "80s": "cassette",
  "90s": "cassette",
  "00s": "ipod",
  "10s": "headphones",
  "20s": "headphones",
};

export function accessoryFor(era: Era): Accessory {
  return ACCESSORY_BY_ERA[era];
}

export function derivePet(profile: MusicProfile, name?: string): PetSpec {
  const primaryGenre = profile.genres[0] ?? "pop";
  const trimmed = name?.trim();
  return {
    name: trimmed && trimmed.length > 0 ? trimmed : suggestName(profile),
    species: speciesFor(primaryGenre),
    palette: paletteFor(profile),
    traits: {
      tone: toneFor(profile),
      chattiness: CHATTINESS_BY_HOURS[profile.hoursPerDay],
      accessory: accessoryFor(profile.era),
      discoveryStyle: profile.discovery,
      xpEvents: [],
    },
    music: profile,
    xp: 0,
  };
}

/**
 * Awards XP once per stored event key. Pass a qualifier for events that can
 * happen more than once with different subjects, e.g. sectionComplete with
 * "hacker/about".
 */
export function applyXp(spec: PetSpec, eventKey: XpEventKey, qualifier?: string): PetSpec {
  const storedKey = qualifier ? `${eventKey}:${qualifier}` : eventKey;
  const seen = spec.traits.xpEvents ?? [];
  if (seen.includes(storedKey)) return spec;
  return {
    ...spec,
    xp: spec.xp + XP_EVENTS[eventKey],
    traits: { ...spec.traits, xpEvents: [...seen, storedKey] },
  };
}

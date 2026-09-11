import { z } from "zod";
import { DISCOVERY, ERAS, GENRES, HOURS, SPECIES, type PetSpec } from "@/lib/types";
import type { Json } from "@/lib/database.types";
import type { PetRow } from "@/lib/data/types";

const scale5 = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const musicProfileSchema = z.object({
  genres: z.array(z.enum(GENRES)).min(1, "Pick at least one genre").max(3, "Pick up to three genres"),
  energy: scale5,
  mood: scale5,
  era: z.enum(ERAS),
  hoursPerDay: z.enum(HOURS),
  discovery: z.enum(DISCOVERY),
  topArtist: z.string().trim().min(1, "Name an artist").max(80),
  anthem: z.string().trim().max(120).default(""),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const paletteSchema = z.object({ primary: hex, secondary: hex, accent: hex });

export const guideSchema = z.object({
  kind: z.enum(["eddy", "gary", "eric", "drawing", "photo", "portrait"]),
  image: z.string().max(400_000).regex(/^(\/guides\/(eddy|gary|eric)\.png|data:image\/png;base64,[A-Za-z0-9+/=]+)$/),
}).refine((guide) => ["drawing", "photo", "portrait"].includes(guide.kind)
  ? guide.image.startsWith("data:image/png;base64,")
  : guide.image === `/guides/${guide.kind}.png`, "Invalid guide image");

export const traitsSchema = z.object({
  guide: guideSchema.optional(),
  tone: z.enum(["hype", "chill", "moody", "warm"]),
  chattiness: z.enum(["terse", "normal", "talkative"]),
  accessory: z.enum(["headphones", "cassette", "vinyl", "ipod"]),
  discoveryStyle: z.enum(DISCOVERY),
  xpEvents: z.array(z.string()).optional(),
});

export function petFromRow(row: PetRow): PetSpec {
  return {
    name: row.name,
    species: z.enum(SPECIES).parse(row.species),
    palette: paletteSchema.parse(row.palette),
    traits: traitsSchema.parse(row.traits),
    music: musicProfileSchema.parse(row.music),
    xp: row.xp,
  };
}

export function petToRow(spec: PetSpec): {
  name: string;
  species: string;
  palette: Json;
  traits: Json;
  music: Json;
  xp: number;
} {
  return {
    name: spec.name,
    species: spec.species,
    palette: { ...spec.palette },
    traits: { ...spec.traits, xpEvents: spec.traits.xpEvents ?? [] },
    music: { ...spec.music, genres: [...spec.music.genres] },
    xp: spec.xp,
  };
}

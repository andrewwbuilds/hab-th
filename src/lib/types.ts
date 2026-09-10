export const ROLES = ["applicant", "organizer"] as const;
export type Role = (typeof ROLES)[number];

export const TRACKS = ["hacker", "judge", "mentor", "volunteer"] as const;
export type Track = (typeof TRACKS)[number];

export const STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
] as const;
export type Status = (typeof STATUSES)[number];

export const DECISIONS = ["accepted", "waitlisted", "rejected"] as const;
export type Decision = (typeof DECISIONS)[number];

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

export const TRACK_LABEL: Record<Track, string> = {
  hacker: "Hacker",
  judge: "Judge",
  mentor: "Mentor",
  volunteer: "Volunteer",
};

export function isTrack(value: string): value is Track {
  return (TRACKS as readonly string[]).includes(value);
}

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Answers to the music quiz. Feeds derivePet(). */
export const GENRES = [
  "electronic",
  "hiphop",
  "indie",
  "pop",
  "rock",
  "metal",
  "jazz",
  "classical",
  "rnb",
  "country",
  "lofi",
  "latin",
] as const;
export type Genre = (typeof GENRES)[number];

export const ERAS = ["70s", "80s", "90s", "00s", "10s", "20s"] as const;
export type Era = (typeof ERAS)[number];

export const HOURS = ["under1", "1to3", "3to6", "over6"] as const;
export type HoursPerDay = (typeof HOURS)[number];

export const DISCOVERY = ["playlists", "albums", "friends", "live"] as const;
export type Discovery = (typeof DISCOVERY)[number];

export type Scale5 = 1 | 2 | 3 | 4 | 5;

export interface MusicProfile {
  genres: Genre[];
  energy: Scale5;
  mood: Scale5;
  era: Era;
  hoursPerDay: HoursPerDay;
  discovery: Discovery;
  topArtist: string;
  anthem: string;
}

export const SPECIES = [
  "moth",
  "cat",
  "fox",
  "bunny",
  "wolf",
  "dragon",
  "raccoon",
  "owl",
  "swan",
  "deer",
  "sloth",
  "parrot",
] as const;
export type Species = (typeof SPECIES)[number];

export type Tone = "hype" | "chill" | "moody" | "warm";
export type Chattiness = "terse" | "normal" | "talkative";
export type Accessory = "headphones" | "cassette" | "vinyl" | "ipod";
export type Stage = "egg" | "hatchling" | "grown";
export type PetMood = "idle" | "happy" | "worried" | "celebrate";

export interface PetPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface PetTraits {
  tone: Tone;
  chattiness: Chattiness;
  accessory: Accessory;
  discoveryStyle: Discovery;
  xpEvents?: string[];
}

/** Everything needed to render and voice a Roadie. Stored across pets.* columns. */
export interface PetSpec {
  name: string;
  species: Species;
  palette: PetPalette;
  traits: PetTraits;
  music: MusicProfile;
  xp: number;
}

export interface RoadieContext {
  screen: "home" | "form" | "status";
  track?: Track;
  section?: string;
  fieldKey?: string;
  fieldHint?: string;
  completion?: number;
  errors?: string[];
  status?: Status;
}

import type { Discovery, Era, Genre, HoursPerDay } from "@/lib/types";

export const GENRE_LABEL: Record<Genre, string> = {
  electronic: "Electronic",
  hiphop: "Hip-hop",
  indie: "Indie",
  pop: "Pop",
  rock: "Rock",
  metal: "Metal",
  jazz: "Jazz",
  classical: "Classical",
  rnb: "R&B",
  country: "Country",
  lofi: "Lo-fi",
  latin: "Latin",
};

export const ERA_LABEL: Record<Era, string> = {
  "70s": "1970s",
  "80s": "1980s",
  "90s": "1990s",
  "00s": "2000s",
  "10s": "2010s",
  "20s": "2020s",
};

export const HOURS_LABEL: Record<HoursPerDay, string> = {
  under1: "Under an hour",
  "1to3": "1 to 3 hours",
  "3to6": "3 to 6 hours",
  over6: "Over 6 hours",
};

export const DISCOVERY_LABEL: Record<Discovery, string> = {
  playlists: "Playlists",
  albums: "Full albums",
  friends: "Friends",
  live: "Live shows",
};

export const DISCOVERY_HINT: Record<Discovery, string> = {
  playlists: "Algorithms and curated mixes",
  albums: "Front to back, in order",
  friends: "Someone sends a link",
  live: "Openers at shows",
};

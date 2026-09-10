import type { Genre, MusicProfile } from "@/lib/types";

interface SyllableBank {
  first: readonly string[];
  second: readonly string[];
}

const SYLLABLES: Record<Genre, SyllableBank> = {
  electronic: {
    first: ["Zyn", "Vex", "Neo", "Kilo", "Pix", "Arp"],
    second: ["tro", "byte", "lux", "ko", "mir", "zi"],
  },
  hiphop: {
    first: ["Bam", "Dre", "Kay", "Rox", "Tre", "Jaz"],
    second: ["bo", "zee", "lo", "ski", "vee", "dan"],
  },
  indie: {
    first: ["Wil", "Fen", "Mo", "Cly", "Hazel", "Juni"],
    second: ["low", "wick", "by", "ver", "lo", "per"],
  },
  pop: {
    first: ["Bub", "Kiki", "Pop", "Lulu", "Sky", "Mimi"],
    second: ["bly", "pop", "star", "bee", "la", "jo"],
  },
  rock: {
    first: ["Axl", "Rip", "Zed", "Jet", "Bru", "Vic"],
    second: ["ton", "riff", "no", "ko", "dar", "ley"],
  },
  metal: {
    first: ["Grim", "Thor", "Vul", "Dra", "Kron", "Ash"],
    second: ["gar", "nax", "kor", "thor", "vok", "den"],
  },
  jazz: {
    first: ["Duke", "Sax", "Mon", "Dizzy", "Bea", "Nola"],
    second: ["ley", "bop", "tro", "roo", "nie", "vel"],
  },
  classical: {
    first: ["Aria", "Cello", "Otto", "Vio", "Cle", "Bach"],
    second: ["dor", "line", "ric", "nus", "mo", "tta"],
  },
  rnb: {
    first: ["Vel", "Sil", "Ro", "Mel", "Jade", "Ivy"],
    second: ["vet", "ky", "mi", "sa", "lin", "ra"],
  },
  country: {
    first: ["Dolly", "Hank", "Jo", "Wren", "Daisy", "Tex"],
    second: ["bell", "bo", "june", "lee", "ray", "ton"],
  },
  lofi: {
    first: ["Nap", "Mo", "Dusty", "Pil", "Fuzz", "Tape"],
    second: ["po", "chi", "mo", "sy", "lo", "ki"],
  },
  latin: {
    first: ["Rumba", "Sol", "Pepe", "Lola", "Chico", "Rio"],
    second: ["ro", "ita", "cha", "nito", "sa", "mba"],
  },
};

const MIN_LENGTH = 4;
const MAX_LENGTH = 9;

/** FNV-1a, 32-bit. Stable across runtimes; good enough to seed picks. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length];
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function suggestName(profile: MusicProfile): string {
  const primary = profile.genres[0] ?? "pop";
  const secondary = profile.genres[1] ?? primary;
  const seed = hashString(`${profile.topArtist.trim().toLowerCase()}|${profile.genres.join(",")}`);
  const firstBank = SYLLABLES[primary].first;
  const secondBank = SYLLABLES[secondary].second;
  for (let attempt = 0; attempt < firstBank.length * secondBank.length; attempt += 1) {
    const s = seed + attempt * 7;
    const name = capitalize(pick(firstBank, s) + pick(secondBank, s >>> 3));
    if (name.length >= MIN_LENGTH && name.length <= MAX_LENGTH) return name;
  }
  return capitalize(firstBank[0] + secondBank[0]).slice(0, MAX_LENGTH);
}

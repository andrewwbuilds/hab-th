import { isTrack, type Track } from "@/lib/types";

/** Accepts only a same-origin path: one leading slash, no protocol-relative or backslash tricks. */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

export function trackFromParam(raw: string | string[] | undefined, fallback: Track = "hacker"): Track {
  return typeof raw === "string" && isTrack(raw) ? raw : fallback;
}

export function applyPath(track: Track): string {
  return `/app/apply/${track}`;
}

export function roadiePath(next?: string | null): string {
  const safe = safeInternalPath(next);
  return safe ? `/app/roadie?next=${encodeURIComponent(safe)}` : "/app/roadie";
}

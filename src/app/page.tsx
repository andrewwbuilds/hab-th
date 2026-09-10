import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Code2, Gavel, GraduationCap, Handshake, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { Wordmark } from "@/components/shell";
import { PetSprite } from "@/components/pet";
import { derivePet, SPECIES_LABEL, STAGE_THRESHOLDS, TONE_LABEL } from "@/lib/pet/engine";
import { getCurrentUser, HOME_BY_ROLE } from "@/lib/data/profiles";
import { TRACK_LABEL, type MusicProfile, type Track } from "@/lib/types";

export const metadata: Metadata = {
  title: "Encore",
  description: "Apply to the hackathon as a hacker, judge, mentor, or volunteer, with a Roadie by your side.",
};

const TRACK_ROWS: Array<{ track: Track; icon: LucideIcon; blurb: string; color: string }> = [
  { track: "hacker", icon: Code2, blurb: "Build something over the weekend, solo or on a team.", color: "text-track-hacker" },
  { track: "judge", icon: Gavel, blurb: "Score final projects against the rubric on demo day.", color: "text-track-judge" },
  { track: "mentor", icon: GraduationCap, blurb: "Help teams get unstuck during the build.", color: "text-track-mentor" },
  { track: "volunteer", icon: Handshake, blurb: "Run check-in, logistics, and the venue floor.", color: "text-track-volunteer" },
];

const EXAMPLE_PROFILES: MusicProfile[] = [
  {
    genres: ["electronic", "pop"],
    energy: 5,
    mood: 5,
    era: "20s",
    hoursPerDay: "3to6",
    discovery: "playlists",
    topArtist: "Jamie xx",
    anthem: "Loud places",
  },
  {
    genres: ["jazz", "rnb"],
    energy: 2,
    mood: 3,
    era: "70s",
    hoursPerDay: "1to3",
    discovery: "albums",
    topArtist: "Alice Coltrane",
    anthem: "Journey in Satchidananda",
  },
  {
    genres: ["indie", "rock"],
    energy: 3,
    mood: 2,
    era: "00s",
    hoursPerDay: "over6",
    discovery: "live",
    topArtist: "Phoebe Bridgers",
    anthem: "Motion sickness",
  },
];

const EXAMPLE_ROADIES = EXAMPLE_PROFILES.map((profile) => ({
  ...derivePet(profile),
  xp: STAGE_THRESHOLDS.grown,
}));

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1040px] items-center justify-between px-6 py-4">
        <Wordmark size="md" />
        <nav className="flex items-center gap-2">
          <Button href="/sign-in" variant="ghost">
            Sign in
          </Button>
          <Button href="/sign-up" variant="primary">
            Create account
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-16 px-6 pb-20 pt-16">
        <section className="flex max-w-[640px] flex-col gap-6">
          <p className="text-sm font-medium text-accent">Hackathon at Berkeley, fall 2026</p>
          <h1 className="text-hero font-semibold tracking-[-0.02em] text-fg">
            Apply to the hackathon with a Roadie by your side.
          </h1>
          <p className="max-w-[520px] text-md text-muted">
            Encore is where hackers, judges, mentors, and volunteers apply. Answer a short music quiz, hatch a
            Roadie built from your taste, and let it walk you through the application one question at a time.
          </p>
          <div className="flex items-center gap-2">
            <Button href="/sign-up" variant="primary" size="md">
              Create account
            </Button>
            <Button href="/sign-in" variant="secondary" size="md">
              Sign in
            </Button>
          </div>
        </section>

        <section className="grid gap-6 border-t border-border pt-10 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted">Four ways to take part</h2>
            <ul className="flex flex-col divide-y divide-border rounded-panel border border-border bg-panel">
              {TRACK_ROWS.map(({ track, icon: Icon, blurb, color }) => (
                <li
                  key={track}
                  className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[16px_80px_minmax(0,1fr)]"
                >
                  <Icon aria-hidden className={`size-4 ${color}`} />
                  <span className="font-medium text-fg">{TRACK_LABEL[track]}</span>
                  <span className="col-start-2 text-muted sm:col-start-3 sm:truncate">{blurb}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted">Every Roadie is different</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {EXAMPLE_ROADIES.map((spec) => (
                <figure
                  key={spec.species}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-panel border border-border bg-panel px-2 py-4 text-center sm:px-3"
                >
                  <PetSprite spec={spec} size={72} />
                  <figcaption className="flex flex-col gap-0.5">
                    <span className="font-medium text-fg">{SPECIES_LABEL[spec.species]}</span>
                    <span className="text-sm text-muted">
                      {TONE_LABEL[spec.traits.tone]}, into {spec.music.topArtist}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="text-sm text-dim">
              Species from your top genre, colors from your mood and energy, an accessory from your era.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between px-6 py-4">
          <Wordmark size="sm" className="text-muted" />
          <span className="text-sm text-dim">Hackathon at Berkeley</span>
        </div>
      </footer>
    </div>
  );
}

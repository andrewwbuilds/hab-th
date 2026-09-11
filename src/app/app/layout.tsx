import type { ReactNode } from "react";
import Link from "next/link";
import { PetSprite, RoadieDock, RoadieProvider } from "@/components/pet";
import type { Command, NavItem } from "@/components/shell";
import { requireRole } from "@/lib/data/profiles";
import type { MyApplication } from "@/lib/data/types";
import { STAGE_LABEL, stageFor } from "@/lib/pet/engine";
import { STATUS_LABEL, TRACKS, TRACK_LABEL, type PetSpec } from "@/lib/types";
import { ApplicantShell } from "./ApplicantShell";
import { loadApplicant } from "./applicant-data";
import { applicationsByTrack, TRACK_ACTION_LABEL, trackAction, trackHref, trackNavItems } from "./applicant-nav";

function RoadieMini({ pet }: { pet: PetSpec | null }) {
  const linkClass =
    "flex h-11 items-center gap-2.5 rounded-control border border-border bg-panel px-2 transition-colors duration-120 ease-out-quick hover:border-border-strong hover:bg-hover";
  if (!pet) {
    return (
      <Link href="/app/roadie" className={linkClass}>
        <span aria-hidden className="size-7 shrink-0 rounded-full border border-dashed border-border-strong" />
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-sm font-medium text-fg">No Roadie yet</span>
          <span className="text-xs text-dim">Choose yours to apply</span>
        </span>
      </Link>
    );
  }
  return (
    <Link href="/app/roadie" className={linkClass} aria-label={`${pet.name}, your Roadie`}>
      <PetSprite spec={pet} size={28} className="shrink-0" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-sm font-medium text-fg">{pet.name}</span>
        <span className="text-xs text-dim">
          {pet.traits.guide ? "Your guide" : STAGE_LABEL[stageFor(pet.xp)]}, {pet.xp} xp
        </span>
      </span>
    </Link>
  );
}

function commandsFor(pet: PetSpec | null, applications: MyApplication[]): Command[] {
  const byTrack = applicationsByTrack(applications);
  const trackCommands = TRACKS.map((track): Command => {
    const application = byTrack.get(track);
    const verb = TRACK_ACTION_LABEL[trackAction(application)];
    return {
      id: `track-${track}`,
      label: `${verb} ${TRACK_LABEL[track].toLowerCase()} application`,
      hint: application ? STATUS_LABEL[application.status] : "Not started",
      href: trackHref(track, application),
      group: "Applications",
    };
  });
  return [
    {
      id: "roadie",
      label: pet ? `Visit ${pet.name}` : "Choose your guide",
      hint: pet ? STAGE_LABEL[stageFor(pet.xp)] : "Takes two minutes",
      href: "/app/roadie",
      group: "Roadie",
    },
    ...trackCommands,
  ];
}

export default async function ApplicantLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("applicant");
  const [pet, applications] = await loadApplicant();

  const nav: NavItem[] = [
    { href: "/app", label: "Home", icon: "home", exact: true },
    { href: "/app/roadie", label: "Roadie", icon: "disc" },
    ...trackNavItems(applications),
  ];

  return (
    <RoadieProvider spec={pet}>
      <ApplicantShell
        nav={nav}
        commands={commandsFor(pet, applications)}
        user={{ name: user.full_name, email: user.email, role: user.role }}
        sidebarFooter={<RoadieMini pet={pet} />}
      >
        {children}
      </ApplicantShell>
      <RoadieDock />
    </RoadieProvider>
  );
}

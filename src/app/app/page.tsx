import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { RoadieCard } from "@/components/pet";
import { Button, Card, StatusIcon, cn } from "@/components/ui";
import { requireRole } from "@/lib/data/profiles";
import type { MyApplication } from "@/lib/data/types";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { STATUS_LABEL, TRACKS, TRACK_LABEL, type Track } from "@/lib/types";
import { RoadieScreen } from "./RoadieScreen";
import { firstApplication, onboardingPath } from "./focus";
import { loadApplicant } from "./applicant-data";
import {
  applicationsByTrack,
  headlineStatus,
  TRACK_ACTION_LABEL,
  trackAction,
  trackHref,
} from "./applicant-nav";
import { formatRelative } from "./format";

export const metadata: Metadata = { title: "Home" };

function TrackRow({
  track,
  application,
  disabled,
}: {
  track: Track;
  application: MyApplication | undefined;
  disabled: boolean;
}) {
  const definition = FORM_DEFINITIONS[track];
  const action = trackAction(application);
  const href = trackHref(track, application);
  const progress = application
    ? application.status === "draft"
      ? `${application.completion.percent}% complete`
      : STATUS_LABEL[application.status]
    : "Not started";

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 transition-colors duration-120 ease-out-quick",
        !disabled && "hover:bg-hover",
      )}
    >
      <StatusIcon status={application?.status ?? "draft"} className={cn(!application && "opacity-50")} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-medium text-fg">{TRACK_LABEL[track]}</span>
          <span className="text-sm text-dim">{progress}</span>
          {application && (
            <span className="text-sm tabular-nums text-dim">Updated {formatRelative(application.updated_at)}</span>
          )}
        </span>
        <span className="line-clamp-2 text-sm text-muted">{definition.blurb}</span>
      </div>
      <Button
        href={href}
        disabled={disabled}
        variant={action === "view" ? "secondary" : "primary"}
        className="w-[76px] shrink-0"
      >
        {TRACK_ACTION_LABEL[action]}
      </Button>
    </li>
  );
}

function TrackList({ applications, disabled }: { applications: MyApplication[]; disabled: boolean }) {
  const byTrack = applicationsByTrack(applications);
  return (
    <ul className={cn("divide-y divide-border rounded-panel border border-border bg-panel", disabled && "opacity-60")}>
      {TRACKS.map((track) => (
        <TrackRow key={track} track={track} application={byTrack.get(track)} disabled={disabled} />
      ))}
    </ul>
  );
}

export default async function ApplicantHomePage() {
  const user = await requireRole("applicant");
  const [pet, applications] = await loadApplicant();
  const first = firstApplication(applications);
  if (first) redirect(onboardingPath(pet, first.track));
  const firstName = user.full_name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-6 py-6 pb-28">
      <RoadieScreen context={{ screen: "home", status: headlineStatus(applications) }} />
      <header className="flex flex-col gap-0.5">
        <h1 className="text-lg font-medium text-fg">Home</h1>
        <p className="text-base text-muted">
          {pet ? `Welcome back, ${firstName}. ${pet.name} is ready when you are.` : `Welcome, ${firstName}.`}
        </p>
      </header>

      {pet ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <RoadieCard spec={pet} />
            <Link
              href="/app/roadie"
              className="inline-flex items-center gap-1 self-start px-1 text-sm text-muted transition-colors duration-120 ease-out-quick hover:text-fg"
            >
              Visit {pet.name}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-muted">Tracks</h2>
            <TrackList applications={applications} disabled={false} />
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-start gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-md font-medium text-fg">Choose your guide</h2>
              <p className="max-w-lg text-base text-muted">
                Optional. Pick Eddy, Gary, or Eric, draw your own character, or take a slightly pixelated selfie.
                Your guide talks you through each question in its own voice. You can start a track now and
                choose one whenever you like.
              </p>
            </div>
            <Button href="/app/roadie" variant="primary" size="md" icon={<ArrowRight />}>
              Choose your guide
            </Button>
          </Card>
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-muted">Tracks</h2>
            <TrackList applications={applications} disabled={false} />
          </section>
        </div>
      )}
    </div>
  );
}

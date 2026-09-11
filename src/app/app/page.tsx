import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { RoadieCard } from "@/components/pet";
import { Button, Card, StatusIcon } from "@/components/ui";
import { requireRole } from "@/lib/data/profiles";
import type { MyApplication } from "@/lib/data/types";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { STATUS_LABEL, TRACK_LABEL } from "@/lib/types";
import { RoadieScreen } from "./RoadieScreen";
import { firstApplication, onboardingPath } from "./focus";
import { loadApplicant } from "./applicant-data";
import { headlineStatus, TRACK_ACTION_LABEL, trackAction, trackHref } from "./applicant-nav";
import { formatRelative } from "./format";

export const metadata: Metadata = { title: "Home" };

function ApplicationCard({ application }: { application: MyApplication }) {
  const definition = FORM_DEFINITIONS[application.track];
  const action = trackAction(application);
  const href = trackHref(application.track, application);
  const progress =
    application.status === "draft" ? `${application.completion.percent}% complete` : STATUS_LABEL[application.status];

  return (
    <div className="flex items-center gap-3 rounded-panel border border-border bg-panel px-3 py-2.5">
      <StatusIcon status={application.status} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-medium text-fg">{TRACK_LABEL[application.track]} application</span>
          <span className="text-sm text-dim">{progress}</span>
          <span className="text-sm tabular-nums text-dim">Updated {formatRelative(application.updated_at)}</span>
        </span>
        <span className="line-clamp-2 text-sm text-muted">{definition.blurb}</span>
      </div>
      <Button href={href} variant={action === "view" ? "secondary" : "primary"} className="w-[76px] shrink-0">
        {TRACK_ACTION_LABEL[action]}
      </Button>
    </div>
  );
}

export default async function ApplicantHomePage() {
  const user = await requireRole("applicant");
  const [pet, applications] = await loadApplicant();
  const first = firstApplication(applications);
  if (first) redirect(onboardingPath(pet, first.track));
  const firstName = user.full_name.trim().split(/\s+/)[0] || "there";
  const application = applications[0];

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
          {application && <ApplicationCard application={application} />}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-start gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-md font-medium text-fg">Choose your guide</h2>
              <p className="max-w-lg text-base text-muted">
                Optional. Pick Eddy, Gary, or Eric, draw your own character, or take a selfie and add a little spice
                to it. Your guide talks you through each question in its own voice.
              </p>
            </div>
            <Button href="/app/roadie" variant="primary" size="md" icon={<ArrowRight />}>
              Choose your guide
            </Button>
          </Card>
          {application && <ApplicationCard application={application} />}
        </div>
      )}
    </div>
  );
}

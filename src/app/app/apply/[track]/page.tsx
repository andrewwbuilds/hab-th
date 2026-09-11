import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/data/profiles";
import { getFormDefinition } from "@/lib/forms/tracks";
import { applyPath, roadiePath } from "@/lib/navigation";
import { isTrack, TRACK_LABEL } from "@/lib/types";
import { loadApplicant } from "../../applicant-data";
import { applicationsByTrack } from "../../applicant-nav";
import { ApplicationForm } from "./ApplicationForm";

interface ApplyPageProps {
  params: Promise<{ track: string }>;
}

export async function generateMetadata({ params }: ApplyPageProps): Promise<Metadata> {
  const { track } = await params;
  return { title: isTrack(track) ? `${TRACK_LABEL[track]} application` : "Application" };
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { track } = await params;
  if (!isTrack(track)) notFound();
  await requireRole("applicant");

  const [pet, applications] = await loadApplicant();
  const definition = getFormDefinition(track);
  const application = applicationsByTrack(applications).get(track);
  if (application && application.status !== "draft") redirect(`/app/status/${track}`);

  return (
    <>
      {!pet && (
        <p className="mx-auto -mb-3 max-w-[1040px] px-6 pt-5 text-sm text-muted">
          <Link
            href={roadiePath(applyPath(track))}
            className="text-fg transition-colors duration-120 ease-out-quick hover:text-accent-hover"
          >
            Choose a guide
          </Link>{" "}
          so your Roadie can talk you through this.
        </p>
      )}
      <ApplicationForm
        key={track}
        track={track}
        definition={definition}
        initialAnswers={application?.answers ?? {}}
      />
    </>
  );
}

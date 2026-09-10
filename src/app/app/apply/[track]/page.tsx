import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/data/profiles";
import { getFormDefinition } from "@/lib/forms/tracks";
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
  if (!pet) redirect("/app/roadie");
  const definition = getFormDefinition(track);
  const application = applicationsByTrack(applications).get(track);
  if (application && application.status !== "draft") redirect(`/app/status/${track}`);

  return (
    <ApplicationForm
      key={track}
      track={track}
      definition={definition}
      initialAnswers={application?.answers ?? {}}
    />
  );
}

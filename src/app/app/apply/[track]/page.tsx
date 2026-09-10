import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMyApplication } from "@/lib/data/applications";
import { getMyPet } from "@/lib/data/pets";
import { requireRole } from "@/lib/data/profiles";
import { getFormDefinition } from "@/lib/forms/tracks";
import { isTrack, TRACK_LABEL } from "@/lib/types";
import { ApplicationForm } from "./ApplicationForm";
import { StartDraft } from "./StartDraft";

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

  const [pet, application] = await Promise.all([getMyPet(), getMyApplication(track)]);
  if (!pet) redirect("/app/roadie");
  if (!application) return <StartDraft track={track} />;
  if (application.status !== "draft") redirect(`/app/status/${track}`);

  return (
    <ApplicationForm
      key={application.id}
      track={track}
      definition={getFormDefinition(track)}
      initialAnswers={application.answers}
    />
  );
}

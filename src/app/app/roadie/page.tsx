import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/data/profiles";
import { safeInternalPath } from "@/lib/navigation";
import { RoadieScreen } from "../RoadieScreen";
import { loadApplicant } from "../applicant-data";
import { headlineStatus } from "../applicant-nav";
import { RoadieWorkspace } from "./RoadieWorkspace";

export const metadata: Metadata = { title: "Roadie" };

export default async function RoadiePage({ searchParams }: PageProps<"/app/roadie">) {
  await requireRole("applicant");
  const { next } = await searchParams;
  const returnTo = safeInternalPath(typeof next === "string" ? next : undefined);
  const [pet, applications] = await loadApplicant();
  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-6 py-6 pb-28">
      <RoadieScreen context={{ screen: "home", status: headlineStatus(applications) }} />
      <RoadieWorkspace pet={pet} returnTo={returnTo} />
      {!pet && returnTo && (
        <p className="text-sm text-muted">
          Not now?{" "}
          <Link href={returnTo} className="text-fg underline-offset-2 hover:underline">
            Skip for now
          </Link>{" "}
          and go straight to the application. You can pick a guide any time.
        </p>
      )}
    </div>
  );
}

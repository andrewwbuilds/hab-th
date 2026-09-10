import type { Metadata } from "next";
import { requireRole } from "@/lib/data/profiles";
import { RoadieScreen } from "../RoadieScreen";
import { loadApplicant } from "../applicant-data";
import { headlineStatus } from "../applicant-nav";
import { RoadieWorkspace } from "./RoadieWorkspace";

export const metadata: Metadata = { title: "Roadie" };

export default async function RoadiePage() {
  await requireRole("applicant");
  const [pet, applications] = await loadApplicant();
  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-6 py-6 pb-28">
      <RoadieScreen context={{ screen: "home", status: headlineStatus(applications) }} />
      <RoadieWorkspace pet={pet} />
    </div>
  );
}

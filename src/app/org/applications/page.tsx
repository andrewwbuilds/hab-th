import type { Metadata } from "next";
import { OrgPage } from "../_components/OrgPage";
import { dateTimeLabel, relativeTime, shortDate } from "../_lib/format";
import { ApplicationsTable, type ApplicationRow } from "./ApplicationsTable";
import { FiltersBar } from "./FiltersBar";
import { listOrgApplications, parseListQuery, type SearchParams } from "./_lib/query";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseListQuery(await searchParams);
  const items = await listOrgApplications(query);
  const rows: ApplicationRow[] = items.map((item) => ({
    id: item.id,
    name: item.applicant.full_name,
    email: item.applicant.email,
    track: item.track,
    status: item.status,
    submittedLabel: item.submitted_at ? relativeTime(item.submitted_at) : null,
    submittedTitle: item.submitted_at ? dateTimeLabel(item.submitted_at) : null,
    reviewCount: item.review_count,
    avgOverall: item.avg_overall,
    decidedLabel: item.decided_at ? shortDate(item.decided_at) : null,
  }));

  return (
    <OrgPage
      breadcrumbs={[{ label: "Applications" }]}
      actions={<FiltersBar query={query} count={rows.length} />}
    >
      <ApplicationsTable rows={rows} query={query} />
    </OrgPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Card, StatusIcon, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { getOrganizerStats } from "@/lib/data/applications";
import { DECISIONS, STATUSES, STATUS_LABEL, TRACKS, TRACK_LABEL, type Status } from "@/lib/types";
import type { OrganizerStats } from "@/lib/data/types";
import { OrgPage } from "./_components/OrgPage";
import { scoreLabel } from "./_lib/format";

export const metadata: Metadata = { title: "Overview" };

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const weekdayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

function decidedCount(byStatus: OrganizerStats["byStatus"]): number {
  return DECISIONS.reduce((sum, status) => sum + byStatus[status], 0);
}

function StatTile({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-xl font-medium tabular-nums text-fg">{value}</span>
      {hint && <span className="text-xs text-dim">{hint}</span>}
    </>
  );
  const className = "flex flex-col gap-0.5 rounded-panel border border-border bg-panel px-4 py-3";
  return href ? (
    <Link href={href} className={`${className} transition-colors duration-120 ease-out-quick hover:bg-hover`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function SubmissionsStrip({ days }: { days: OrganizerStats["submissionsPerDay"] }) {
  const peak = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-md font-medium text-fg">Submissions, last 14 days</h2>
        <span className="text-sm text-muted">{total} total</span>
      </div>
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`${total} submissions in the last 14 days`}>
        {days.map((day) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          const height = day.count === 0 ? 2 : Math.max(6, Math.round((day.count / peak) * 88));
          return (
            <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-xs tabular-nums text-dim opacity-0 transition-opacity duration-120 group-hover:opacity-100">
                {day.count}
              </span>
              <div
                title={`${dayLabel.format(date)}: ${day.count}`}
                className={day.count === 0 ? "w-full rounded-[2px] bg-border-strong" : "w-full rounded-[2px] bg-accent"}
                style={{ height }}
              />
              <span className="text-xs text-dim">{weekdayLabel.format(date)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CountsTable({ byTrack, byStatus }: Pick<OrganizerStats, "byTrack" | "byStatus">) {
  const cell = (count: number) => (count === 0 ? <span className="text-dim">0</span> : count);
  return (
    <Card padding="none" className="overflow-hidden">
      <Table>
        <THead>
          <TR>
            <TH>Track</TH>
            {STATUSES.map((status) => (
              <TH key={status} align="right">
                <span className="inline-flex items-center gap-1.5">
                  <StatusIcon status={status} size={12} />
                  {STATUS_LABEL[status]}
                </span>
              </TH>
            ))}
            <TH align="right">Total</TH>
          </TR>
        </THead>
        <TBody>
          {TRACKS.map((track) => {
            const counts = byTrack[track];
            const total = STATUSES.reduce((sum, status) => sum + counts[status], 0);
            return (
              <TR key={track}>
                <TD>
                  <Link href={`/org/applications?track=${track}`} className="hover:text-accent-hover">
                    {TRACK_LABEL[track]}
                  </Link>
                </TD>
                {STATUSES.map((status) => (
                  <TD key={status} align="right" className="tabular-nums">
                    {counts[status] === 0 ? (
                      cell(0)
                    ) : (
                      <Link
                        href={`/org/applications?track=${track}&status=${status}`}
                        className="hover:text-accent-hover"
                      >
                        {counts[status]}
                      </Link>
                    )}
                  </TD>
                ))}
                <TD align="right" className="tabular-nums font-medium">
                  {total}
                </TD>
              </TR>
            );
          })}
          <TR className="hover:bg-transparent">
            <TD muted>All tracks</TD>
            {STATUSES.map((status) => (
              <TD key={status} align="right" className="tabular-nums" muted>
                {cell(byStatus[status])}
              </TD>
            ))}
            <TD align="right" className="tabular-nums font-medium">
              {STATUSES.reduce((sum, status: Status) => sum + byStatus[status], 0)}
            </TD>
          </TR>
        </TBody>
      </Table>
    </Card>
  );
}

function ReviewerActivity({ reviewers, reviewCount }: Pick<OrganizerStats, "reviewCount"> & { reviewers: OrganizerStats["reviewsPerReviewer"] }) {
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-md font-medium text-fg">Reviewer activity</h2>
        <span className="text-sm text-muted">{reviewCount} reviews</span>
      </div>
      {reviewers.length === 0 ? (
        <p className="text-base text-muted">No reviews yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {reviewers.map((reviewer) => (
            <li key={reviewer.reviewerId} className="flex h-8 items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-fg">{reviewer.name}</span>
              <span className="text-sm tabular-nums text-muted">
                {reviewer.count} {reviewer.count === 1 ? "review" : "reviews"}
              </span>
              <span className="w-16 text-right text-sm tabular-nums text-muted">{scoreLabel(reviewer.avgOverall)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function OverviewPage() {
  const stats = await getOrganizerStats();
  const decided = decidedCount(stats.byStatus);

  return (
    <OrgPage breadcrumbs={[{ label: "Overview" }]}>
      <div className="mx-auto flex max-w-[1040px] flex-col gap-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Awaiting review"
            value={String(stats.byStatus.submitted)}
            hint="Submitted, not opened yet"
            href="/org/applications?status=submitted"
          />
          <StatTile
            label="In review"
            value={String(stats.byStatus.under_review)}
            hint="Opened by a reviewer"
            href="/org/applications?status=under_review"
          />
          <StatTile
            label="Decided"
            value={String(decided)}
            hint={`${stats.byStatus.accepted} accepted, ${stats.byStatus.waitlisted} waitlisted, ${stats.byStatus.rejected} rejected`}
            href="/org/applications?decided=1"
          />
          <StatTile
            label="Average score"
            value={scoreLabel(stats.avgOverall)}
            hint={stats.reviewCount === 0 ? "No reviews yet" : `Across ${stats.reviewCount} reviews`}
          />
        </div>
        <CountsTable byTrack={stats.byTrack} byStatus={stats.byStatus} />
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <SubmissionsStrip days={stats.submissionsPerDay} />
          <ReviewerActivity reviewers={stats.reviewsPerReviewer} reviewCount={stats.reviewCount} />
        </div>
      </div>
    </OrgPage>
  );
}

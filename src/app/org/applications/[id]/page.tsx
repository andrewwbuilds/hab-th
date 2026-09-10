import type { Metadata } from "next";
import { cache, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { RoadieCard } from "@/components/pet";
import { Badge, Meter, StatusPill } from "@/components/ui";
import { getApplication } from "@/lib/data/applications";
import type { Review } from "@/lib/data/types";
import { FORM_DEFINITIONS, type Criterion } from "@/lib/forms/tracks";
import { TRACK_LABEL } from "@/lib/types";
import { OrgPage } from "../../_components/OrgPage";
import { dateTimeLabel, relativeTime } from "../../_lib/format";
import { adjacentIn, listHref, listOrgApplications, parseListQuery, type SearchParams } from "../_lib/query";
import { AdjacentNav } from "./AdjacentNav";
import { AnswerSections } from "./Answers";
import { GradingForm } from "./GradingForm";
import { StatusPanel } from "./StatusPanel";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

const loadApplication = cache(getApplication);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const application = await loadApplication(id);
  return { title: application ? application.applicant.full_name || application.applicant.email : "Application" };
}

function ReviewCard({ review, rubric }: { review: Review; rubric: Criterion[] }) {
  return (
    <article className="flex flex-col gap-3 rounded-panel border border-border bg-panel p-4">
      <header className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-fg">{review.reviewer.full_name || review.reviewer.email}</span>
        <time dateTime={review.updated_at} title={dateTimeLabel(review.updated_at)} className="text-sm text-muted">
          {relativeTime(review.updated_at)}
        </time>
      </header>
      <dl className="grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-1.5">
        {rubric.map((criterion) => {
          const score = review.scores[criterion.key];
          return (
            <div key={criterion.key} className="contents">
              <dt className="text-sm text-muted">{criterion.label}</dt>
              <dd className="flex items-center gap-2">
                {score === undefined ? (
                  <span className="text-sm text-dim">Not scored</span>
                ) : (
                  <>
                    <Meter value={score} size="sm" label={`${criterion.label} ${score} of 5`} />
                    <span className="text-sm tabular-nums text-muted">{score}</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
        <dt className="text-sm font-medium text-fg">Overall</dt>
        <dd className="flex items-center gap-2">
          <Meter value={review.overall} size="sm" label={`Overall ${review.overall} of 5`} />
          <span className="text-sm tabular-nums text-fg">{review.overall}</span>
        </dd>
      </dl>
      {review.notes.trim() && <p className="whitespace-pre-wrap text-base text-fg">{review.notes}</p>}
    </article>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="text-base text-fg">{children}</div>
    </div>
  );
}

export default async function ApplicationPage({ params, searchParams }: PageProps) {
  const [{ id }, rawSearch] = await Promise.all([params, searchParams]);
  const query = parseListQuery(rawSearch);
  const [application, siblings] = await Promise.all([loadApplication(id), listOrgApplications(query)]);
  if (!application) notFound();

  const form = FORM_DEFINITIONS[application.track];
  const name = application.applicant.full_name || application.applicant.email;
  const school = application.answers.school;
  const isDraft = application.status === "draft";
  const adjacent = adjacentIn(siblings, application.id);

  return (
    <OrgPage
      breadcrumbs={[{ label: "Applications", href: listHref(query) }, { label: name }]}
      actions={<AdjacentNav adjacent={adjacent} query={query} />}
      className="overflow-hidden"
    >
      <div className="flex h-full">
        <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto flex max-w-[720px] flex-col gap-8">
            <header className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-medium text-fg">{name}</h1>
                <Badge variant={application.track}>{TRACK_LABEL[application.track]}</Badge>
                <StatusPill status={application.status} bordered />
              </div>
              <p className="text-sm text-muted">
                {application.submitted_at ? (
                  <>
                    Submitted{" "}
                    <time dateTime={application.submitted_at} title={dateTimeLabel(application.submitted_at)}>
                      {relativeTime(application.submitted_at)}
                    </time>
                  </>
                ) : (
                  <>Draft started {relativeTime(application.created_at)}, not submitted yet</>
                )}
              </p>
            </header>

            <AnswerSections sections={form.sections} answers={application.answers} />

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-md font-medium text-fg">Reviews</h2>
                <span className="text-sm text-muted">
                  {application.summary.review_count === 0
                    ? "None yet"
                    : `${application.summary.review_count} ${application.summary.review_count === 1 ? "review" : "reviews"}, average ${application.summary.avg_overall?.toFixed(1)}`}
                </span>
              </div>
              {application.reviews.length === 0 ? (
                <p className="rounded-panel border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  {isDraft ? "Reviews open once the applicant submits." : "No reviews yet. Yours can be the first."}
                </p>
              ) : (
                application.reviews.map((review) => <ReviewCard key={review.id} review={review} rubric={form.rubric} />)
              )}
            </section>
          </div>
        </div>

        <aside className="flex w-[280px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-border px-4 py-5">
          <Property label="Status">
            <StatusPanel applicationId={application.id} status={application.status} applicantName={name} />
          </Property>
          <Property label="Track">
            <Badge variant={application.track}>{TRACK_LABEL[application.track]}</Badge>
          </Property>
          <Property label="Applicant">
            <div className="flex flex-col">
              <span>{application.applicant.full_name || "No name"}</span>
              <a href={`mailto:${application.applicant.email}`} className="truncate text-sm text-muted hover:text-fg">
                {application.applicant.email}
              </a>
              {typeof school === "string" && school.trim() && <span className="text-sm text-muted">{school}</span>}
            </div>
          </Property>
          <Property label="Submitted">
            {application.submitted_at ? (
              <time dateTime={application.submitted_at}>{dateTimeLabel(application.submitted_at)}</time>
            ) : (
              <span className="text-dim">Not yet</span>
            )}
          </Property>
          <Property label="Decided">
            {application.decided_at ? (
              <time dateTime={application.decided_at}>{dateTimeLabel(application.decided_at)}</time>
            ) : (
              <span className="text-dim">Pending</span>
            )}
          </Property>
          <Property label="Roadie">
            {application.pet ? (
              <RoadieCard spec={application.pet} compact />
            ) : (
              <span className="text-dim">No Roadie yet</span>
            )}
          </Property>
          <Property label="Your review">
            <GradingForm
              applicationId={application.id}
              rubric={form.rubric}
              initial={
                application.myReview
                  ? {
                      scores: application.myReview.scores,
                      overall: application.myReview.overall,
                      notes: application.myReview.notes,
                    }
                  : null
              }
              savedLabel={application.myReview ? relativeTime(application.myReview.updated_at) : null}
              disabled={isDraft}
            />
          </Property>
        </aside>
      </div>
    </OrgPage>
  );
}

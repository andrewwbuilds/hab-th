import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card, StatusIcon, StatusPill, cn } from "@/components/ui";
import { getMyApplication } from "@/lib/data/applications";
import { requireRole } from "@/lib/data/profiles";
import type { MyApplication } from "@/lib/data/types";
import type { Answers, AnswerValue } from "@/lib/forms/schema";
import { getFormDefinition, type FieldDef } from "@/lib/forms/tracks";
import { isTrack, STATUS_LABEL, TRACK_LABEL, type Decision, type Status } from "@/lib/types";
import { RoadieScreen } from "../../RoadieScreen";
import { formatDateTime } from "../../format";

interface StatusPageProps {
  params: Promise<{ track: string }>;
}

export async function generateMetadata({ params }: StatusPageProps): Promise<Metadata> {
  const { track } = await params;
  return { title: isTrack(track) ? `${TRACK_LABEL[track]} status` : "Status" };
}

const DECISION_COPY: Record<Decision, { title: string; body: string; className: string }> = {
  accepted: {
    title: "You are in",
    body: "Your application was accepted. Watch your inbox for logistics, and start thinking about what to build.",
    className: "border-status-accepted/40 bg-[rgba(76,183,130,0.10)]",
  },
  waitlisted: {
    title: "You are on the waitlist",
    body: "Spots open up as people confirm or drop. We will email you the moment one is yours.",
    className: "border-status-waitlisted/40 bg-[rgba(242,153,74,0.10)]",
  },
  rejected: {
    title: "Not this time",
    body: "We could not offer you a spot this round. The application stays on file, and next year's form will be open to you first.",
    className: "border-status-rejected/40 bg-[rgba(235,87,87,0.10)]",
  },
};

function isDecision(status: Status): status is Decision {
  return status === "accepted" || status === "waitlisted" || status === "rejected";
}

interface TimelineStep {
  key: string;
  icon: Status;
  label: string;
  detail: string;
  reached: boolean;
}

function timelineFor(application: MyApplication): TimelineStep[] {
  const decided = isDecision(application.status);
  const reviewing = application.status === "under_review" || decided;
  return [
    {
      key: "created",
      icon: "draft",
      label: "Started",
      detail: formatDateTime(application.created_at),
      reached: true,
    },
    {
      key: "submitted",
      icon: "submitted",
      label: "Submitted",
      detail: application.submitted_at ? formatDateTime(application.submitted_at) : "",
      reached: application.submitted_at !== null,
    },
    {
      key: "review",
      icon: "under_review",
      label: "Under review",
      detail: reviewing ? "An organizer has opened it" : "Waiting for an organizer",
      reached: reviewing,
    },
    {
      key: "decision",
      icon: decided ? application.status : "accepted",
      label: decided ? STATUS_LABEL[application.status] : "Decision",
      detail: application.decided_at ? formatDateTime(application.decided_at) : "Not yet",
      reached: decided,
    },
  ];
}

function AnswerValueView({ field, value }: { field: FieldDef; value: AnswerValue | undefined }) {
  const empty = <span className="text-dim">Not answered</span>;
  switch (field.type) {
    case "checkbox":
      return <span>{value === true ? "Yes" : "No"}</span>;
    case "multiselect": {
      const selected = Array.isArray(value) ? value : [];
      if (selected.length === 0) return empty;
      const labels = selected.map(
        (item) => field.options?.find((option) => option.value === item)?.label ?? item,
      );
      return (
        <ul className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <li key={label} className="rounded-full border border-border-strong bg-panel px-2.5 text-sm leading-6 text-fg">
              {label}
            </li>
          ))}
        </ul>
      );
    }
    case "select": {
      if (typeof value !== "string" || value === "") return empty;
      return <span>{field.options?.find((option) => option.value === value)?.label ?? value}</span>;
    }
    case "url": {
      if (typeof value !== "string" || value === "") return empty;
      return (
        <a href={value} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">
          {value}
        </a>
      );
    }
    case "number":
      return typeof value === "number" ? <span className="tabular-nums">{value}</span> : empty;
    case "text":
    case "textarea": {
      if (typeof value !== "string" || value.trim() === "") return empty;
      return <span className="whitespace-pre-wrap">{value}</span>;
    }
  }
}

function AnswerList({ fields, answers }: { fields: FieldDef[]; answers: Answers }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[200px_1fr]">
      {fields.map((field) => (
        <div key={field.key} className="contents">
          <dt className="text-sm text-muted sm:pt-0.5">{field.label}</dt>
          <dd className="min-w-0 text-base text-fg">
            <AnswerValueView field={field} value={answers[field.key]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { track } = await params;
  if (!isTrack(track)) notFound();
  await requireRole("applicant");

  const application = await getMyApplication(track);
  if (!application || application.status === "draft") redirect(`/app/apply/${track}`);

  const definition = getFormDefinition(track);
  const decision = isDecision(application.status) ? DECISION_COPY[application.status] : null;

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-6 py-6 pb-28">
      <RoadieScreen context={{ screen: "status", track, status: application.status }} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-medium text-fg">{definition.title}</h1>
          <p className="text-base text-muted">
            {application.submitted_at
              ? `Submitted ${formatDateTime(application.submitted_at)}. Answers are locked.`
              : "Answers are locked."}
          </p>
        </div>
        <StatusPill status={application.status} bordered />
      </header>

      {decision && (
        <section
          role="status"
          className={cn("flex flex-col gap-1 rounded-panel border px-4 py-3", decision.className)}
        >
          <h2 className="text-md font-medium text-fg">{decision.title}</h2>
          <p className="max-w-2xl text-base text-muted">{decision.body}</p>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-4">
          {definition.sections.map((section) => (
            <Card key={section.key} className="flex flex-col gap-4">
              <h2 className="text-md font-medium text-fg">{section.title}</h2>
              <AnswerList fields={section.fields} answers={application.answers} />
            </Card>
          ))}
        </div>

        <Card className="flex flex-col gap-1 lg:sticky lg:top-6">
          <h2 className="mb-2 text-md font-medium text-fg">Timeline</h2>
          <ol className="flex flex-col">
            {timelineFor(application).map((step, index, steps) => (
              <li key={step.key} className={cn("relative flex gap-3 pb-4", !step.reached && "opacity-50")}>
                {index < steps.length - 1 && (
                  <span aria-hidden className="absolute left-[6.5px] top-5 h-[calc(100%-16px)] w-px bg-border" />
                )}
                <StatusIcon status={step.icon} className={cn("mt-[3px]", !step.reached && "grayscale")} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-base font-medium text-fg">{step.label}</span>
                  {step.detail && <span className="text-sm text-muted">{step.detail}</span>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

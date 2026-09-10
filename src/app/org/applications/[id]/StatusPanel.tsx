"use client";

import { useState, useTransition } from "react";
import { Button, Dialog, Select, StatusPill, useToast } from "@/components/ui";
import { setStatus } from "@/lib/data/applications";
import { DECISIONS, STATUSES, STATUS_LABEL, type Decision, type Status } from "@/lib/types";

interface StatusPanelProps {
  applicationId: string;
  status: Status;
  applicantName: string;
}

const DECISION_COPY: Record<Decision, { verb: string; description: string }> = {
  accepted: { verb: "Accept", description: "They get a spot. The status page updates for them right away." },
  waitlisted: { verb: "Waitlist", description: "They stay in the pool. You can still accept or reject later." },
  rejected: { verb: "Reject", description: "They are out for this track. You can still change this later." },
};

const organizerStatuses = STATUSES.filter((status) => status !== "draft").map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

export function StatusPanel({ applicationId, status, applicantName }: StatusPanelProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Decision | null>(null);
  const isDraft = status === "draft";

  function change(next: Status) {
    if (next === status) return;
    startTransition(async () => {
      const result = await setStatus(applicationId, next);
      if (result.ok) {
        toast({ title: `Marked as ${STATUS_LABEL[next].toLowerCase()}`, variant: "success" });
      } else {
        toast({ title: "Could not update the status", description: result.error, variant: "error" });
      }
      setConfirming(null);
    });
  }

  const copy = confirming ? DECISION_COPY[confirming] : null;

  return (
    <div className="flex flex-col gap-2">
      {isDraft ? (
        <>
          <StatusPill status="draft" />
          <p className="text-sm text-muted">The applicant has not submitted yet. Nothing to review.</p>
        </>
      ) : (
        <>
          <Select
            aria-label="Status"
            value={status}
            options={organizerStatuses}
            disabled={pending}
            onChange={(event) => change(event.target.value as Status)}
          />
          {status === "submitted" && (
            <Button variant="primary" loading={pending} onClick={() => change("under_review")}>
              Start review
            </Button>
          )}
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {DECISIONS.map((decision) => (
              <Button
                key={decision}
                variant={decision === "rejected" ? "danger" : "secondary"}
                disabled={pending || status === decision}
                onClick={() => setConfirming(decision)}
              >
                {DECISION_COPY[decision].verb}
              </Button>
            ))}
          </div>
        </>
      )}
      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        size="sm"
        title={copy ? `${copy.verb} ${applicantName}?` : ""}
        description={copy?.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={confirming === "rejected" ? "danger" : "primary"}
              loading={pending}
              onClick={() => confirming && change(confirming)}
            >
              Set decision
            </Button>
          </>
        }
      />
    </div>
  );
}

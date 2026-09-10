import type { Status } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { cn } from "./cn";

export interface StatusIconProps {
  status: Status;
  size?: number;
  className?: string;
}

const colorClass: Record<Status, string> = {
  draft: "text-status-draft",
  submitted: "text-status-submitted",
  under_review: "text-status-under-review",
  accepted: "text-status-accepted",
  waitlisted: "text-status-waitlisted",
  rejected: "text-status-rejected",
};

function Glyph({ status }: { status: Status }) {
  switch (status) {
    case "draft":
      return (
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.8" />
      );
    case "submitted":
      return <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />;
    case "under_review":
      return (
        <>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
        </>
      );
    case "accepted":
      return (
        <>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path
            d="M4.4 7.2l1.8 1.8 3.4-3.6"
            stroke="#08090a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );
    case "waitlisted":
      return (
        <>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 4.2V7l1.9 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </>
      );
    case "rejected":
      return (
        <>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path
            d="M4.9 4.9l4.2 4.2M9.1 4.9l-4.2 4.2"
            stroke="#08090a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      );
  }
}

export function StatusIcon({ status, size = 14, className }: StatusIconProps) {
  return (
    <svg
      role="img"
      aria-label={STATUS_LABEL[status]}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={cn("shrink-0", colorClass[status], className)}
    >
      <Glyph status={status} />
    </svg>
  );
}

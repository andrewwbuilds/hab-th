import type { Status } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { cn } from "./cn";
import { StatusIcon } from "./StatusIcon";

export interface StatusPillProps {
  status: Status;
  label?: string;
  bordered?: boolean;
  className?: string;
}

export function StatusPill({ status, label, bordered, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap text-base text-fg",
        bordered && "rounded-full border border-border-strong bg-panel pl-1.5 pr-2.5",
        className,
      )}
    >
      <StatusIcon status={status} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

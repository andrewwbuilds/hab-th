import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {icon && (
        <span className="mb-1 flex size-9 items-center justify-center rounded-panel border border-border bg-panel text-muted [&_svg]:size-4">
          {icon}
        </span>
      )}
      <p className="text-md font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-base text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

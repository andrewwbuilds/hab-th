import type { ReactNode } from "react";
import { cn } from "./cn";

export interface TooltipProps {
  content: ReactNode;
  side?: "top" | "bottom";
  className?: string;
  children: ReactNode;
}

export function Tooltip({ content, side = "top", className, children }: TooltipProps) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-40 w-max max-w-64 -translate-x-1/2 rounded-control border border-border-strong bg-panel px-2 py-1 text-sm text-fg opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-opacity duration-120 ease-out-quick group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {content}
      </span>
    </span>
  );
}

import type { ReactNode } from "react";
import { cn } from "./cn";

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border-strong bg-panel px-1 font-sans text-xs text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

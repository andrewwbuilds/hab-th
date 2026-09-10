import type { ReactNode } from "react";
import type { Track } from "@/lib/types";
import { cn } from "./cn";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger" | Track;

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  neutral: "border-border-strong bg-panel text-muted",
  accent: "border-transparent bg-accent-soft text-[#a4abf5]",
  success: "border-transparent bg-[rgba(76,183,130,0.14)] text-status-accepted",
  warning: "border-transparent bg-[rgba(242,153,74,0.14)] text-status-waitlisted",
  danger: "border-transparent bg-[rgba(235,87,87,0.14)] text-status-rejected",
  hacker: "border-transparent bg-[rgba(108,118,224,0.16)] text-track-hacker",
  judge: "border-transparent bg-[rgba(181,124,240,0.16)] text-track-judge",
  mentor: "border-transparent bg-[rgba(58,168,184,0.16)] text-track-mentor",
  volunteer: "border-transparent bg-[rgba(214,122,99,0.16)] text-track-volunteer",
};

export function Badge({ variant = "neutral", dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-1.5 text-xs font-medium leading-none",
        variantClass[variant],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

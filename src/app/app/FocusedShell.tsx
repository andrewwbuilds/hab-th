"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { PetSprite } from "@/components/pet";
import { Wordmark } from "@/components/shell";
import { Avatar, ToastProvider, cn } from "@/components/ui";
import { applyPath, roadiePath } from "@/lib/navigation";
import { TRACK_LABEL, type PetSpec, type Track } from "@/lib/types";

export interface FocusedShellProps {
  track: Track;
  pet: PetSpec | null;
  user: { name: string; email: string };
  children: ReactNode;
}

interface Step {
  label: string;
  href: string;
  active: boolean;
  done: boolean;
}

function StepRail({ steps }: { steps: Step[] }) {
  return (
    <ol aria-label="Progress" className="hidden items-center gap-1 sm:flex">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden className="mx-1 h-px w-5 bg-border-strong" />}
          <Link
            href={step.href}
            aria-current={step.active ? "step" : undefined}
            className={cn(
              "inline-flex h-7 items-center gap-2 rounded-control px-2 text-sm transition-colors duration-120 ease-out-quick hover:bg-hover",
              step.active ? "text-fg" : "text-dim hover:text-fg",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "inline-flex size-4 items-center justify-center rounded-full border text-[10px] tabular-nums",
                step.done
                  ? "border-accent bg-accent text-white"
                  : step.active
                    ? "border-accent text-accent"
                    : "border-border-strong text-dim",
              )}
            >
              {step.done ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
            </span>
            {step.label}
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function FocusedShell({ track, pet, user, children }: FocusedShellProps) {
  const pathname = usePathname();
  const formHref = applyPath(track);
  const guideHref = roadiePath(formHref);
  const onGuide = pathname.startsWith("/app/roadie");
  const steps: Step[] = [
    { label: "Pick a guide", href: guideHref, active: onGuide, done: pet !== null && !onGuide },
    { label: `${TRACK_LABEL[track]} application`, href: formHref, active: !onGuide, done: false },
  ];

  return (
    <ToastProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
        <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark size="sm" />
            <span aria-hidden className="hidden h-4 w-px bg-border-strong sm:block" />
            <span className="hidden truncate text-sm text-muted sm:inline">Hackathon at Berkeley</span>
          </div>
          <StepRail steps={steps} />
          <div className="flex min-w-0 items-center justify-end gap-2">
            {pet ? (
              <Link
                href={guideHref}
                aria-label={`${pet.name}, your guide`}
                className="inline-flex h-8 items-center gap-2 rounded-control border border-border bg-panel pl-1 pr-2.5 text-sm text-fg transition-colors duration-120 ease-out-quick hover:border-border-strong hover:bg-hover"
              >
                <PetSprite spec={pet} size={22} className="shrink-0" />
                <span className="truncate">{pet.name}</span>
              </Link>
            ) : (
              !onGuide && (
                <Link
                  href={guideHref}
                  className="inline-flex h-8 items-center rounded-control border border-dashed border-border-strong px-2.5 text-sm text-muted transition-colors duration-120 ease-out-quick hover:border-border-strong hover:bg-hover hover:text-fg"
                >
                  Choose a guide
                </Link>
              )
            )}
            <Avatar name={user.name || user.email} size="md" />
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="flex size-7 items-center justify-center rounded-control text-dim transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
              >
                <LogOut className="size-3.5" />
              </button>
            </form>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { CommandPaletteTrigger } from "./CommandPalette";
import { MobileNavTrigger } from "./MobileNav";
import type { Breadcrumb } from "./types";

export interface TopbarProps {
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

export function Topbar({ breadcrumbs = [], actions }: TopbarProps) {
  return (
    <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-1">
        <MobileNavTrigger />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-base">
          {breadcrumbs.map((crumb, index) => {
            const last = index === breadcrumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-dim" />}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="truncate rounded-control px-1 text-muted transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={last ? "min-w-0 px-1 font-medium text-fg" : "truncate px-1 text-muted"}
                  >
                    {crumb.label}
                  </span>
                )}
              </Fragment>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <CommandPaletteTrigger />
      </div>
    </header>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell, type Breadcrumb, type Command, type NavItem } from "@/components/shell";
import { isTrack, TRACK_LABEL, type Role } from "@/lib/types";

export interface ApplicantShellProps {
  nav: NavItem[];
  commands: Command[];
  user: { name: string; email: string; role: Role };
  sidebarFooter: ReactNode;
  children: ReactNode;
}

function breadcrumbsFor(pathname: string): Breadcrumb[] {
  const home: Breadcrumb = { label: "Home", href: "/app" };
  const [, , area, slug] = pathname.split("/");
  if (!area) return [{ label: "Home" }];
  if (area === "roadie") return [home, { label: "Roadie" }];
  if ((area === "apply" || area === "status") && slug && isTrack(slug)) {
    const application: Breadcrumb = { label: `${TRACK_LABEL[slug]} application`, href: `/app/${area}/${slug}` };
    return area === "apply" ? [home, { label: application.label }] : [home, application, { label: "Status" }];
  }
  return [home];
}

export function ApplicantShell({ nav, commands, user, sidebarFooter, children }: ApplicantShellProps) {
  const pathname = usePathname();
  return (
    <AppShell
      workspace={{ name: "CalHacks", hint: "Applicant" }}
      nav={nav}
      user={user}
      commands={commands}
      breadcrumbs={breadcrumbsFor(pathname)}
      sidebarFooter={sidebarFooter}
    >
      {children}
    </AppShell>
  );
}

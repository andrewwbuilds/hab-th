import type { ReactNode } from "react";
import { Topbar, type Breadcrumb } from "@/components/shell";
import { cn } from "@/components/ui";

interface OrgPageProps {
  breadcrumbs: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function OrgPage({ breadcrumbs, actions, className, children }: OrgPageProps) {
  return (
    <>
      <Topbar breadcrumbs={breadcrumbs} actions={actions} />
      <main className={cn("relative min-h-0 flex-1 overflow-y-auto", className)}>{children}</main>
    </>
  );
}

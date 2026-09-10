import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { Breadcrumb, Command, NavItem } from "./types";
import type { Role } from "@/lib/types";

export interface AppShellProps {
  workspace: { name: string; hint?: string };
  nav: NavItem[];
  user: { name: string; email: string; role: Role };
  sidebarFooter?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  commands?: Command[];
  children: ReactNode;
}

export function AppShell({
  workspace,
  nav,
  user,
  sidebarFooter,
  breadcrumbs,
  actions,
  commands,
  children,
}: AppShellProps) {
  return (
    <ToastProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg md:flex-row">
        <Sidebar workspace={workspace} nav={nav} user={user} footer={sidebarFooter} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar breadcrumbs={breadcrumbs} actions={actions} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <CommandPalette commands={commands} nav={nav} />
    </ToastProvider>
  );
}

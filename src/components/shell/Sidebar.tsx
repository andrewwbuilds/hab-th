import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SidebarNav } from "./SidebarNav";
import { Wordmark } from "./Wordmark";
import type { NavItem } from "./types";
import type { Role } from "@/lib/types";

export interface SidebarProps {
  workspace: { name: string; hint?: string };
  nav: NavItem[];
  user: { name: string; email: string; role: Role };
  footer?: ReactNode;
}

const roleLabel: Record<Role, string> = {
  applicant: "Applicant",
  organizer: "Organizer",
};

export function Sidebar({ workspace, nav, user, footer }: SidebarProps) {
  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-10 shrink-0 items-center px-4">
        <Wordmark size="sm" />
      </div>
      <div className="flex flex-col px-4 pb-3 pt-1">
        <span className="truncate text-base font-medium text-fg">{workspace.name}</span>
        {workspace.hint && <span className="truncate text-xs text-dim">{workspace.hint}</span>}
      </div>
      <SidebarNav items={nav} />
      <div className="flex min-h-0 flex-1 flex-col justify-end">
        {footer && <div className="px-2 pb-2">{footer}</div>}
        <div className="flex h-12 items-center gap-2 border-t border-border px-3">
          <Avatar name={user.name || user.email} size="md" />
          <div className="flex min-w-0 flex-1 flex-col leading-none">
            <span className="truncate text-sm font-medium text-fg">{user.name || user.email}</span>
            <span className="truncate text-xs text-dim">{roleLabel[user.role]}</span>
          </div>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex size-6 items-center justify-center rounded-control text-dim transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

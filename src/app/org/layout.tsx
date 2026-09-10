import type { ReactNode } from "react";
import { CommandPalette, Sidebar } from "@/components/shell";
import { ToastProvider } from "@/components/ui";
import { requireRole } from "@/lib/data/profiles";
import { ORG_COMMANDS, ORG_NAV, ORG_WORKSPACE } from "./_lib/nav";

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const organizer = await requireRole("organizer");
  const user = { name: organizer.full_name, email: organizer.email, role: organizer.role };

  return (
    <ToastProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-bg text-fg">
        <Sidebar workspace={ORG_WORKSPACE} nav={ORG_NAV} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <CommandPalette
        commands={ORG_COMMANDS}
        nav={ORG_NAV}
        search={{ label: "Search applicants for", href: "/org/applications?q={query}" }}
      />
    </ToastProvider>
  );
}

"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Menu } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { SidebarNav } from "./SidebarNav";
import type { NavItem } from "./types";

const OPEN_EVENT = "encore:mobile-nav";

export function openMobileNav() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function MobileNavTrigger() {
  return (
    <button
      type="button"
      onClick={openMobileNav}
      aria-label="Open navigation"
      className="flex size-7 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg md:hidden"
    >
      <Menu className="size-4" strokeWidth={1.75} />
    </button>
  );
}

export interface MobileNavProps {
  workspace: { name: string; hint?: string };
  nav: NavItem[];
}

export function MobileNav({ workspace, nav }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const closeOnNavigate = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title={workspace.name}
      description={workspace.hint}
      size="sm"
      className="md:hidden"
    >
      <div className="-mx-2" onClick={closeOnNavigate}>
        <SidebarNav items={nav} />
      </div>
    </Dialog>
  );
}

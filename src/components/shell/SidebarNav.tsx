"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { resolveIcon } from "./icons";
import type { NavItem } from "./types";

export function isNavActive(pathname: string, item: Pick<NavItem, "href" | "exact">): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-px px-2">
      {items.map((item) => {
        const Icon = resolveIcon(item.icon);
        const active = isNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-7 items-center gap-2 rounded-control px-2 text-base transition-colors duration-120 ease-out-quick",
              active ? "bg-active text-fg" : "text-muted hover:bg-hover hover:text-fg",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-fg" : "text-muted")} strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-[4px] bg-bg px-1.5 text-xs tabular-nums text-muted">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

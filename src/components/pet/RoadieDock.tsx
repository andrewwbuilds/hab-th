"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/components/ui";
import { PetSprite } from "./PetSprite";
import { useRoadie } from "./RoadieProvider";

const STORAGE_KEY = "roadie:collapsed";

const listeners = new Set<() => void>();
let fallbackCollapsed = false;

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return fallbackCollapsed;
  }
}

function writeCollapsed(value: boolean) {
  fallbackCollapsed = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Private mode or storage disabled: the in-memory fallback still drives this page view.
  }
  listeners.forEach((listener) => listener());
}

function subscribeCollapsed(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function serverCollapsed() {
  return false;
}

export interface RoadieDockProps {
  className?: string;
}

export function RoadieDock({ className }: RoadieDockProps) {
  const { spec, mood, line, nextVariant } = useRoadie();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, serverCollapsed);

  if (!spec) return null;

  const toggle = () => writeCollapsed(!collapsed);

  return (
    <div
      data-roadie-dock
      className={cn("fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5", className)}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Show what ${spec.name} is saying` : `Hide what ${spec.name} is saying`}
        className="inline-flex size-5 items-center justify-center rounded-full border border-border bg-panel text-dim transition-colors duration-120 ease-out-quick hover:border-border-strong hover:text-fg"
      >
        {collapsed ? <ChevronUp aria-hidden className="size-3" /> : <ChevronDown aria-hidden className="size-3" />}
      </button>
      <div className="flex items-end gap-2">
        <div aria-live="polite" aria-atomic="true" className={cn("relative", collapsed && "sr-only")}>
          {!collapsed && (
            <div className="relative max-w-[260px] rounded-panel border border-border bg-panel px-3 py-2 text-base text-fg">
              {line}
              <span
                aria-hidden
                className="absolute -right-[5px] bottom-4 size-2 rotate-45 border-r border-t border-border bg-panel"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={nextVariant}
          aria-label={`Ask ${spec.name} to say something else`}
          className="shrink-0 rounded-full transition-transform duration-120 ease-out-quick hover:scale-105 active:scale-95"
        >
          <PetSprite spec={spec} size={56} mood={mood} />
        </button>
      </div>
    </div>
  );
}

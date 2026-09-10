"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useKeyboardShortcuts, type ShortcutMap } from "@/components/shell";
import { Button, Kbd } from "@/components/ui";
import type { AdjacentIds } from "@/lib/data/types";
import { detailHref, type ListQuery } from "../_lib/query";

interface AdjacentNavProps {
  adjacent: AdjacentIds;
  query: ListQuery;
}

export function AdjacentNav({ adjacent, query }: AdjacentNavProps) {
  const router = useRouter();
  const prevHref = adjacent.prevId ? detailHref(adjacent.prevId, query) : null;
  const nextHref = adjacent.nextId ? detailHref(adjacent.nextId, query) : null;

  const shortcuts = useMemo<ShortcutMap>(
    () => ({
      "[": () => {
        if (prevHref) router.push(prevHref);
      },
      "]": () => {
        if (nextHref) router.push(nextHref);
      },
    }),
    [prevHref, nextHref, router],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex items-center gap-1">
      {adjacent.index >= 0 && (
        <span className="mr-1 text-sm tabular-nums text-muted">
          {adjacent.index + 1} of {adjacent.total}
        </span>
      )}
      <Button
        href={prevHref ?? "#"}
        disabled={!prevHref}
        variant="ghost"
        aria-label="Previous application"
        title="Previous application ["
        icon={<ChevronUp />}
      />
      <Button
        href={nextHref ?? "#"}
        disabled={!nextHref}
        variant="ghost"
        aria-label="Next application"
        title="Next application ]"
        icon={<ChevronDown />}
      />
      <span className="ml-1 hidden items-center gap-0.5 text-xs text-dim lg:inline-flex">
        <Kbd>[</Kbd>
        <Kbd>]</Kbd>
      </span>
    </div>
  );
}

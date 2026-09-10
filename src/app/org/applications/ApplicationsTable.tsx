"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { useKeyboardShortcuts, type ShortcutMap } from "@/components/shell";
import { Badge, Button, EmptyState, Kbd, Meter, StatusIcon, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { STATUSES, STATUS_LABEL, TRACK_LABEL, type Status, type Track } from "@/lib/types";
import { SEARCH_INPUT_ID } from "./FiltersBar";
import { detailHref, listHref, type ListQuery } from "./_lib/query";

export interface ApplicationRow {
  id: string;
  name: string;
  email: string;
  track: Track;
  status: Status;
  submittedLabel: string | null;
  submittedTitle: string | null;
  reviewCount: number;
  avgOverall: number | null;
  decidedLabel: string | null;
}

interface ApplicationsTableProps {
  rows: ApplicationRow[];
  query: ListQuery;
}

const COLUMNS = 7;

export function ApplicationsTable({ rows, query }: ApplicationsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const firstDraft = rows.findIndex((row) => row.status === "draft");

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLTableRowElement>(`[data-index="${selected}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const shortcuts = useMemo<ShortcutMap>(() => {
    const map: ShortcutMap = {
      j: () => setSelected((index) => Math.min(rows.length - 1, index + 1)),
      k: () => setSelected((index) => Math.max(0, index - 1)),
      enter: () => {
        const row = rows[selected];
        if (row) router.push(detailHref(row.id, query));
      },
      "/": () => document.getElementById(SEARCH_INPUT_ID)?.focus(),
      "0": () => router.push(listHref({ ...query, status: undefined, decided: false })),
    };
    STATUSES.forEach((status, index) => {
      map[String(index + 1)] = () => router.push(listHref({ ...query, status, decided: false }));
    });
    return map;
  }, [rows, selected, query, router]);
  useKeyboardShortcuts(shortcuts);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="No applications match"
        description="Try a different track, status or search."
        action={
          <Button href="/org/applications" variant="secondary">
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <div ref={listRef} className="flex flex-col">
      <Table>
        <THead>
          <TR>
            <TH className="w-36">Status</TH>
            <TH>Applicant</TH>
            <TH className="w-28">Track</TH>
            <TH className="w-32">Submitted</TH>
            <TH className="w-20" align="right">
              Reviews
            </TH>
            <TH className="w-36">Score</TH>
            <TH className="w-28">Decided</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row, index) => {
            const href = detailHref(row.id, query);
            return (
              <RowGroup key={row.id} showDivider={index === firstDraft && index > 0}>
                <TR
                  data-index={index}
                  interactive
                  selected={index === selected}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => router.push(href)}
                >
                  <TD>
                    <span className="inline-flex items-center gap-2">
                      <StatusIcon status={row.status} />
                      <span className={row.status === "draft" ? "text-muted" : undefined}>{STATUS_LABEL[row.status]}</span>
                    </span>
                  </TD>
                  <TD>
                    <Link
                      href={href}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex min-w-0 items-baseline gap-2"
                    >
                      <span className="truncate font-medium text-fg">{row.name || row.email}</span>
                      {row.name && <span className="truncate text-sm text-muted">{row.email}</span>}
                    </Link>
                  </TD>
                  <TD>
                    <Badge variant={row.track}>{TRACK_LABEL[row.track]}</Badge>
                  </TD>
                  <TD muted title={row.submittedTitle ?? undefined}>
                    {row.submittedLabel ?? <span className="text-dim">Not submitted</span>}
                  </TD>
                  <TD align="right" className="tabular-nums" muted>
                    {row.reviewCount}
                  </TD>
                  <TD>
                    {row.avgOverall === null ? (
                      <span className="text-dim">No scores</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Meter value={Math.round(row.avgOverall)} size="sm" label={`Average ${row.avgOverall.toFixed(1)} of 5`} />
                        <span className="text-sm tabular-nums text-muted">{row.avgOverall.toFixed(1)}</span>
                      </span>
                    )}
                  </TD>
                  <TD muted>
                    {row.decidedLabel ?? (row.status !== "draft" && <span className="text-dim">Pending</span>)}
                  </TD>
                </TR>
              </RowGroup>
            );
          })}
        </TBody>
      </Table>
      <div className="flex h-9 items-center gap-4 border-t border-border px-3 text-xs text-dim">
        <span className="inline-flex items-center gap-1">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd> move
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Enter</Kbd> open
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>1</Kbd>
          <span>to</span>
          <Kbd>6</Kbd> status, <Kbd>0</Kbd> all
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>/</Kbd> search
        </span>
      </div>
    </div>
  );
}

function RowGroup({ showDivider, children }: { showDivider: boolean; children: ReactNode }) {
  if (!showDivider) return children;
  return (
    <>
      <tr className="h-8 border-b border-border bg-sidebar">
        <td colSpan={COLUMNS} className="px-3 text-sm text-dim">
          Drafts
        </td>
      </tr>
      {children}
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as Cmdk } from "cmdk";
import { ArrowRight, Search } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";
import { resolveIcon } from "./icons";
import type { Command, NavItem } from "./types";

const OPEN_EVENT = "encore:command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="hidden h-7 items-center gap-2 rounded-control border border-border bg-transparent pl-2 pr-1.5 text-muted transition-colors duration-120 ease-out-quick hover:border-border-strong hover:bg-hover hover:text-fg sm:inline-flex"
    >
      <Search className="size-3.5" />
      <span className="text-sm">Search</span>
      <Kbd className="h-4 min-w-0 border-border bg-bg px-1 text-[10px]">⌘K</Kbd>
    </button>
  );
}

export interface CommandPaletteProps {
  commands?: Command[];
  nav?: NavItem[];
  /** Free-text search: label shown before the query, href with a {query} placeholder. */
  search?: { label: string; href: string };
}

export function CommandPalette({ commands = [], nav = [], search }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();

  const close = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const run = useCallback(
    (command: Command) => {
      close(false);
      if (command.onSelect) command.onSelect();
      if (command.href) router.push(command.href);
    },
    [close, router],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const command of commands) {
      const group = command.group ?? "Commands";
      map.set(group, [...(map.get(group) ?? []), command]);
    }
    return [...map.entries()];
  }, [commands]);

  return (
    <Cmdk.Dialog
      open={open}
      onOpenChange={close}
      label="Command palette"
      loop
      overlayClassName="fixed inset-0 z-50 bg-black/55"
      contentClassName="fixed left-1/2 top-[18vh] z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-panel border border-border-strong bg-panel text-fg shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
    >
      <div className="flex h-11 items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-muted" />
        <Cmdk.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Type a command or search"
          className="h-full min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-dim focus-visible:outline-0"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Cmdk.List className="max-h-[360px] overflow-y-auto p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-dim">
        <Cmdk.Empty className="px-2 py-8 text-center text-base text-muted">No results</Cmdk.Empty>
        {search && trimmedQuery && (
          <Cmdk.Group heading="Search">
            <Cmdk.Item
              value={`search ${trimmedQuery}`}
              onSelect={() =>
                run({
                  id: "search",
                  label: search.label,
                  href: search.href.replace("{query}", encodeURIComponent(trimmedQuery)),
                })
              }
              className={itemClass}
            >
              <Search className="size-4 shrink-0 text-muted" />
              <span className="flex-1 truncate">
                {search.label} <span className="text-muted">&quot;{trimmedQuery}&quot;</span>
              </span>
              <ArrowRight className="size-3.5 text-dim opacity-0 data-[selected=true]:opacity-100" />
            </Cmdk.Item>
          </Cmdk.Group>
        )}
        {nav.length > 0 && (
          <Cmdk.Group heading="Go to">
            {nav.map((item) => {
              const Icon = resolveIcon(item.icon);
              return (
                <Cmdk.Item
                  key={item.href}
                  value={`go ${item.label}`}
                  onSelect={() => run({ id: item.href, label: item.label, href: item.href })}
                  className={itemClass}
                >
                  <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="flex-1 truncate">{item.label}</span>
                  <ArrowRight className="size-3.5 text-dim opacity-0 data-[selected=true]:opacity-100" />
                </Cmdk.Item>
              );
            })}
          </Cmdk.Group>
        )}
        {groups.map(([group, items]) => (
          <Cmdk.Group key={group} heading={group}>
            {items.map((command) => (
              <Cmdk.Item
                key={command.id}
                value={`${command.label} ${command.hint ?? ""}`}
                onSelect={() => run(command)}
                className={itemClass}
              >
                <span className="flex-1 truncate">{command.label}</span>
                {command.hint && <span className="truncate text-sm text-dim">{command.hint}</span>}
                {command.shortcut && (
                  <span className="flex items-center gap-0.5">
                    {command.shortcut.split(" ").map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                )}
              </Cmdk.Item>
            ))}
          </Cmdk.Group>
        ))}
      </Cmdk.List>
    </Cmdk.Dialog>
  );
}

const itemClass =
  "flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-control px-2 text-base text-fg data-[selected=true]:bg-active data-[disabled=true]:opacity-50";

"use client";

import { useEffect } from "react";

export type ShortcutMap = Record<string, () => void>;

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return target.closest("[cmdk-root], [role='dialog']") !== null;
}

function matches(binding: string, event: KeyboardEvent): boolean {
  const parts = binding.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");
  const hasMod = event.metaKey || event.ctrlKey;
  if (wantMod !== hasMod) return false;
  if (wantAlt !== event.altKey) return false;
  if (wantShift && !event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}

export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (isEditableTarget(event.target)) return;
      for (const [binding, handler] of Object.entries(map)) {
        if (matches(binding, event)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [map, enabled]);
}

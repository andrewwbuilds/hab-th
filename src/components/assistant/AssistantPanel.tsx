"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Mic, MicOff, SendHorizontal, X } from "lucide-react";
import { PetSprite, useRoadie } from "@/components/pet";
import { Button, Kbd, Spinner, cn, controlClass, useToast } from "@/components/ui";
import type { GuideAction, GuideMessage, GuideResponse } from "@/lib/ai/guide";
import type { Answers, AnswerValue } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";
import { TRACK_LABEL, type Track } from "@/lib/types";
import { ASSISTANT_OPEN_ATTRIBUTE, ASSISTANT_OPEN_EVENT } from "./events";

const HIGHLIGHT_MS = 2000;
const HISTORY = 8;
const HIGHLIGHT_ATTRIBUTE = "data-assistant-highlight";

const STYLES = `
[${HIGHLIGHT_ATTRIBUTE}] {
  box-shadow: 0 0 0 1px var(--color-accent), 0 0 0 4px var(--color-accent-soft);
  animation: assistant-ring ${HIGHLIGHT_MS}ms ease-out 1;
}
@keyframes assistant-ring {
  0% { box-shadow: 0 0 0 1px var(--color-accent), 0 0 0 8px rgba(94, 106, 210, 0.35); }
  100% { box-shadow: 0 0 0 1px var(--color-accent), 0 0 0 4px var(--color-accent-soft); }
}
@media (prefers-reduced-motion: reduce) {
  [${HIGHLIGHT_ATTRIBUTE}] { animation: none; }
}
`;

export interface AssistantPanelProps {
  track: Track;
  definition: FormDefinition;
  answers: Answers;
  /** Read at send time so the panel taking focus never clears the form's focused field. */
  getFocusedFieldKey: () => string | undefined;
  setAnswer: (key: string, value: AnswerValue) => void;
  scrollToField: (key: string) => void;
  /** Opens the panel once per track with an introduction to the first open question. */
  walkthrough?: { fieldKey?: string };
}

interface ChatEntry extends GuideMessage {
  id: number;
  action?: GuideAction;
}

function fieldId(key: string): string {
  return `field-${key}`;
}

function findField(definition: FormDefinition, key: string | undefined): FieldDef | undefined {
  if (!key) return undefined;
  for (const section of definition.sections) {
    const field = section.fields.find((candidate) => candidate.key === key);
    if (field) return field;
  }
  return undefined;
}

function matchOption(field: FieldDef, text: string): string | undefined {
  const needle = text.trim().toLowerCase();
  if (!needle) return undefined;
  return field.options?.find(
    (option) => option.value.toLowerCase() === needle || option.label.toLowerCase() === needle,
  )?.value;
}

/** The value "Use this" writes for an example, or undefined when the example is display-only. */
export function fillValue(field: FieldDef, text: string): AnswerValue | undefined {
  switch (field.type) {
    case "text":
    case "textarea":
    case "url":
      return text;
    case "number": {
      const parsed = Number(text.trim());
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case "select":
      return matchOption(field, text);
    case "multiselect": {
      const values = text
        .split(/,|;|\n|\band\b/)
        .map((part) => matchOption(field, part))
        .filter((value): value is string => value !== undefined);
      return values.length > 0 ? [...new Set(values)] : undefined;
    }
    case "checkbox":
      return undefined;
  }
}

function greeting(name: string | undefined, field: FieldDef | undefined): string {
  const who = name ?? "Your Roadie";
  const about = field ? `"${field.label}"` : "anything on this form";
  return `${who} here. Ask me about ${about}. I can point to a field, give an example, or explain a question.`;
}

function walkthroughIntro(name: string | undefined, label: string, field: FieldDef | undefined, voice: boolean): string {
  const who = name ?? "Your Roadie";
  const ask = voice ? "Type here, or press the mic and just talk." : "Type here whenever you want.";
  const first = field ? ` First up: "${field.label}".` : "";
  return `${who} here. I'll walk you through the ${label} application one question at a time.${first} Ask me what a question means or what a good answer looks like. ${ask}`;
}

function walkthroughKey(track: Track): string {
  return `encore:walkthrough:${track}`;
}

function speechConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function AssistantPanel({
  track,
  definition,
  answers,
  getFocusedFieldKey,
  setAnswer,
  scrollToField,
  walkthrough,
}: AssistantPanelProps) {
  const { spec, mood } = useRoadie();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(() => speechConstructor() !== undefined);

  const panel = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const recognition = useRef<SpeechRecognition | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const nextId = useRef(1);

  const name = spec?.name;

  const highlight = useCallback(
    (key: string) => {
      scrollToField(key);
      setTimeout(() => {
        const element = document.getElementById(fieldId(key));
        if (!element) return;
        document.querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}]`).forEach((node) => node.removeAttribute(HIGHLIGHT_ATTRIBUTE));
        element.setAttribute(HIGHLIGHT_ATTRIBUTE, "");
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => element.removeAttribute(HIGHLIGHT_ATTRIBUTE), HIGHLIGHT_MS);
      }, 0);
    },
    [scrollToField],
  );

  const stopListening = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
    setListening(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    stopListening();
    const target = restoreFocus.current;
    const active = document.activeElement;
    const focusIsOurs = active === document.body || (panel.current?.contains(active) ?? false);
    if (target && document.contains(target) && focusIsOurs) target.focus({ preventScroll: true });
    restoreFocus.current = null;
  }, [stopListening]);

  const openPanel = useCallback(() => {
    const active = document.activeElement;
    restoreFocus.current = active instanceof HTMLElement ? active : null;
    const field = findField(definition, getFocusedFieldKey());
    setEntries((current) =>
      current.length > 0
        ? current
        : [{ id: nextId.current++, role: "assistant", content: greeting(name, field) }],
    );
    setOpen(true);
  }, [definition, getFocusedFieldKey, name]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.isContentEditable) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        if (document.querySelector("dialog[open]")) return;
        event.preventDefault();
        if (open) close();
        else openPanel();
        return;
      }
      if (event.key === "Escape" && open) {
        const inside = target instanceof Node && panel.current?.contains(target);
        const inDialog = target instanceof HTMLElement && target.closest("dialog[open], [role='dialog']") !== null;
        if (inside || !inDialog) {
          event.preventDefault();
          close();
        }
      }
    };
    const onOpen = () => openPanel();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpen);
    };
  }, [open, close, openPanel]);

  const walkthroughStarted = useRef(false);
  useEffect(() => {
    if (!walkthrough || walkthroughStarted.current) return;
    walkthroughStarted.current = true;
    try {
      if (window.sessionStorage.getItem(walkthroughKey(track))) return;
      window.sessionStorage.setItem(walkthroughKey(track), "1");
    } catch {
      // Storage unavailable: the walkthrough opens on every visit to the form instead of once.
    }
    const field = findField(definition, walkthrough.fieldKey);
    setEntries([
      {
        id: nextId.current++,
        role: "assistant",
        content: walkthroughIntro(name, TRACK_LABEL[track].toLowerCase(), field, speechSupported),
        action: field ? { type: "clarify", fieldKey: field.key, text: field.hint } : undefined,
      },
    ]);
    setOpen(true);
    if (field) highlight(field.key);
  }, [walkthrough, track, definition, name, speechSupported, highlight]);

  useEffect(() => {
    if (!open) return;
    document.body.setAttribute(ASSISTANT_OPEN_ATTRIBUTE, "");
    return () => document.body.removeAttribute(ASSISTANT_OPEN_ATTRIBUTE);
  }, [open]);

  useEffect(() => {
    if (open) textarea.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) listEnd.current?.scrollIntoView({ block: "end" });
  }, [open, entries, pending]);

  useEffect(
    () => () => {
      recognition.current?.abort();
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const applyAction = useCallback(
    (action: GuideAction | undefined) => {
      if (!action) return;
      if (action.type === "highlight" || action.type === "example") highlight(action.fieldKey);
      else if (action.fieldKey) highlight(action.fieldKey);
    },
    [highlight],
  );

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || pending) return;
      const userEntry: ChatEntry = { id: nextId.current++, role: "user", content };
      const history = [...entries, userEntry].slice(-HISTORY).map(({ role, content: text }) => ({ role, content: text }));
      setEntries((current) => [...current, userEntry]);
      setInput("");
      setPending(true);
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ track, fieldKey: getFocusedFieldKey(), answers, messages: history }),
        });
        if (!response.ok) throw new Error(`http ${response.status}`);
        const guide = (await response.json()) as GuideResponse;
        setEntries((current) => [
          ...current,
          { id: nextId.current++, role: "assistant", content: guide.message, action: guide.action },
        ]);
        applyAction(guide.action);
      } catch {
        toast({
          title: `Could not reach ${name ?? "your Roadie"}`,
          description: "Check your connection and try again.",
          variant: "error",
        });
      } finally {
        setPending(false);
      }
    },
    [answers, applyAction, entries, getFocusedFieldKey, name, pending, toast, track],
  );

  const startListening = useCallback(() => {
    const Recognition = speechConstructor();
    if (!Recognition) return;
    const instance = new Recognition();
    instance.continuous = false;
    instance.interimResults = true;
    instance.lang = navigator.language || "en-US";
    instance.onresult = (event) => {
      let transcript = "";
      let final = false;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        transcript += result[0]?.transcript ?? "";
        if (result.isFinal) final = true;
      }
      setInput(transcript);
      if (final) {
        stopListening();
        void send(transcript);
      }
    };
    instance.onerror = () => {
      stopListening();
      toast({ title: "Could not hear you", description: "Check the microphone permission and try again.", variant: "error" });
    };
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = instance;
    setListening(true);
    instance.start();
  }, [send, stopListening, toast]);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  };

  const useExample = (action: Extract<GuideAction, { type: "example" }>) => {
    const field = findField(definition, action.fieldKey);
    if (!field) return;
    const value = fillValue(field, action.text);
    if (value !== undefined) setAnswer(field.key, value);
    highlight(field.key);
  };

  if (!open) return null;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={`Ask ${name ?? "your Roadie"}`}
      className="fixed bottom-4 right-4 z-50 flex h-[460px] max-h-[calc(100vh-32px)] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-panel border border-border bg-panel text-base text-fg shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
    >
      <style>{STYLES}</style>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        {spec ? (
          <PetSprite spec={spec} size={26} mood={mood} className="shrink-0" />
        ) : (
          <span aria-hidden className="size-6 shrink-0 rounded-full border border-dashed border-border-strong" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{name ?? "Your Roadie"}</span>
        <Kbd>⌘J</Kbd>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="inline-flex size-6 items-center justify-center rounded-control text-muted transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3" aria-live="polite">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={cn("flex flex-col gap-1.5", entry.role === "user" ? "items-end" : "items-start")}
          >
            <p
              className={cn(
                "max-w-[90%] whitespace-pre-wrap rounded-panel px-2.5 py-1.5",
                entry.role === "user" ? "bg-active text-fg" : "text-fg",
              )}
            >
              {entry.content}
            </p>
            {entry.action && entry.action.type !== "highlight" && (
              <ActionCard
                action={entry.action}
                field={findField(definition, entry.action.fieldKey)}
                onUse={entry.action.type === "example" ? useExample : undefined}
                onShow={highlight}
              />
            )}
            {entry.action?.type === "highlight" && (
              <ShowFieldLink fieldKey={entry.action.fieldKey} definition={definition} onShow={highlight} />
            )}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-muted">
            <Spinner size={12} label="Thinking" />
            <span className="text-sm">{name ?? "Your Roadie"} is thinking</span>
          </div>
        )}
        <div ref={listEnd} />
      </div>

      <div className="flex shrink-0 items-end gap-1.5 border-t border-border p-2">
        <textarea
          ref={textarea}
          value={input}
          rows={1}
          placeholder={listening ? "Listening" : "Ask about a field"}
          aria-label="Message"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onInputKeyDown}
          className={cn(controlClass, "max-h-24 min-h-7 flex-1 resize-none px-2 py-1 leading-5 field-sizing-content")}
        />
        {speechSupported && (
          <Button
            variant={listening ? "primary" : "ghost"}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Speak"}
            onClick={listening ? stopListening : startListening}
            disabled={pending}
            icon={listening ? <MicOff /> : <Mic />}
          />
        )}
        <Button
          variant="primary"
          aria-label="Send"
          onClick={() => void send(input)}
          disabled={pending || input.trim() === ""}
          icon={<SendHorizontal />}
        />
      </div>
    </div>
  );
}

function ShowFieldLink({
  fieldKey,
  definition,
  onShow,
}: {
  fieldKey: string;
  definition: FormDefinition;
  onShow: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onShow(fieldKey)}
      className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline"
    >
      Show {findField(definition, fieldKey)?.label ?? "field"}
    </button>
  );
}

interface ActionCardProps {
  action: Extract<GuideAction, { type: "example" | "clarify" }>;
  field: FieldDef | undefined;
  onUse?: (action: Extract<GuideAction, { type: "example" }>) => void;
  onShow: (key: string) => void;
}

function ActionCard({ action, field, onUse, onShow }: ActionCardProps) {
  const usable = action.type === "example" && field !== undefined && fillValue(field, action.text) !== undefined;
  return (
    <div className="flex w-full max-w-[90%] flex-col gap-2 rounded-control border border-border bg-bg px-2.5 py-2">
      {field && (
        <span className="text-xs text-dim">
          {action.type === "example" ? "Example for" : "About"} {field.label}
        </span>
      )}
      <p className="whitespace-pre-wrap text-muted">{action.text}</p>
      {(usable || field) && (
        <div className="flex items-center gap-1.5">
          {usable && action.type === "example" && onUse && (
            <Button size="sm" onClick={() => onUse(action)}>
              Use this
            </Button>
          )}
          {field && (
            <Button size="sm" variant="ghost" onClick={() => onShow(field.key)}>
              Show field
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  AudioLines,
  Check,
  ChevronDown,
  ChevronRight,
  Mic,
  MicOff,
  PenLine,
  SendHorizontal,
  Square,
  Undo2,
  X,
} from "lucide-react";
import { PetSprite, useRoadie } from "@/components/pet";
import { Button, Kbd, Spinner, cn, controlClass, useToast } from "@/components/ui";
import { describeValue, emptyValue, fillIntro, fillableFields, isEssay } from "@/lib/ai/fill";
import type { GuideAction, GuideMessage, GuideResponse } from "@/lib/ai/guide";
import { isAnswered, type Answers, type AnswerValue } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition } from "@/lib/forms/tracks";
import { TRACK_LABEL, type Track } from "@/lib/types";
import { ASSISTANT_OPEN_ATTRIBUTE, ASSISTANT_OPEN_EVENT } from "./events";
import { useVoice } from "./useVoice";

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
@keyframes assistant-bar {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}
[data-assistant-bars] > span {
  animation: assistant-bar 900ms ease-in-out infinite;
  transform-origin: center;
}
[data-assistant-bars] > span:nth-child(2) { animation-delay: 150ms; }
[data-assistant-bars] > span:nth-child(3) { animation-delay: 300ms; }
[data-assistant-bars] > span:nth-child(4) { animation-delay: 450ms; }
@keyframes assistant-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
[data-assistant-entry] { animation: assistant-rise 160ms var(--ease-out-quick) both; }
@media (prefers-reduced-motion: reduce) {
  [${HIGHLIGHT_ATTRIBUTE}], [data-assistant-bars] > span, [data-assistant-entry] { animation: none; }
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

interface FillChange {
  fieldKey: string;
  value: AnswerValue;
  previous: AnswerValue | undefined;
}

interface ChatEntry extends GuideMessage {
  id: number;
  action?: GuideAction;
  /** What a fill action wrote, kept so Undo can put the old values back. */
  changes?: FillChange[];
  undone?: boolean;
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

/** The value "Use this" writes for an example, or undefined when the example is display-only. Essays never fill. */
export function fillValue(field: FieldDef, text: string): AnswerValue | undefined {
  if (isEssay(field)) return undefined;
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
  return `${who} here. Ask me about ${about}, or just start telling me about yourself.`;
}

function walkthroughIntro(name: string | undefined, label: string, field: FieldDef | undefined, voice: boolean): string {
  const who = name ?? "Your Roadie";
  const ask = voice ? "Type, tap the mic, or hit Talk live and we can just have a conversation." : "Type here whenever you want.";
  const first = field ? ` First up: "${field.label}".` : "";
  return `${who} here. I'll walk you through the ${label} application one question at a time.${first} ${ask}`;
}

function walkthroughKey(track: Track): string {
  return `encore:walkthrough:${track}`;
}

/** What gets read aloud in live mode: the message, plus coaching text when there is some. */
function spokenText(guide: GuideResponse): string {
  const extra = guide.action?.type === "clarify" ? ` ${guide.action.text}` : "";
  return `${guide.message}${extra}`;
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
  const [quickOpen, setQuickOpen] = useState(false);

  const panel = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const nextId = useRef(1);
  const entriesRef = useRef<ChatEntry[]>([]);
  const answersRef = useRef(answers);
  const pendingRef = useRef(false);
  const queued = useRef("");
  const sendRef = useRef<(raw: string) => Promise<void>>(async () => {});

  useEffect(() => {
    entriesRef.current = entries;
    answersRef.current = answers;
  }, [entries, answers]);

  const name = spec?.name;

  const voice = useVoice(
    {
      onTranscript: (text, final) => {
        if (!final) {
          setInput(text);
          return;
        }
        setInput("");
        if (pendingRef.current) {
          queued.current = `${queued.current} ${text}`.trim();
          return;
        }
        void sendRef.current(text);
      },
      onError: (message) => toast({ title: "Microphone trouble", description: message, variant: "error" }),
    },
    spec?.traits.tone,
  );

  const quick = useMemo(() => fillableFields(definition), [definition]);
  const quickDone = useMemo(() => quick.filter((field) => isAnswered(field, answers[field.key])).length, [quick, answers]);
  const userTurns = useMemo(() => entries.filter((entry) => entry.role === "user").length, [entries]);

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

  const close = useCallback(() => {
    setOpen(false);
    voice.stopLive();
    const target = restoreFocus.current;
    const active = document.activeElement;
    const focusIsOurs = active === document.body || (panel.current?.contains(active) ?? false);
    if (target && document.contains(target) && focusIsOurs) target.focus({ preventScroll: true });
    restoreFocus.current = null;
  }, [voice]);

  const openPanel = useCallback(() => {
    const active = document.activeElement;
    restoreFocus.current = active instanceof HTMLElement ? active : null;
    const field = findField(definition, getFocusedFieldKey());
    setEntries((current) =>
      current.length > 0
        ? current
        : [
            {
              id: nextId.current++,
              role: "assistant",
              content: `${greeting(name, field)} ${fillIntro(definition, answersRef.current)}`,
            },
          ],
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
        content: `${walkthroughIntro(name, TRACK_LABEL[track].toLowerCase(), field, voice.support.recognition)} ${fillIntro(definition, answersRef.current)}`,
        action: field ? { type: "clarify", fieldKey: field.key, text: field.hint } : undefined,
      },
    ]);
    setOpen(true);
    if (field) highlight(field.key);
  }, [walkthrough, track, definition, name, voice.support.recognition, highlight]);

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
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const applyFill = useCallback(
    (action: Extract<GuideAction, { type: "fill" }>): FillChange[] => {
      const changes: FillChange[] = [];
      for (const fill of action.fields) {
        const field = findField(definition, fill.fieldKey);
        if (!field || isEssay(field)) continue;
        changes.push({ fieldKey: field.key, value: fill.value, previous: answersRef.current[field.key] });
        setAnswer(field.key, fill.value);
      }
      const first = changes[0];
      if (first) highlight(first.fieldKey);
      return changes;
    },
    [definition, highlight, setAnswer],
  );

  const undoFill = (entry: ChatEntry) => {
    if (!entry.changes || entry.undone) return;
    for (const change of entry.changes) {
      const field = findField(definition, change.fieldKey);
      if (!field) continue;
      setAnswer(field.key, change.previous ?? emptyValue(field));
    }
    setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, undone: true } : item)));
  };

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || pendingRef.current) return;
      const userEntry: ChatEntry = { id: nextId.current++, role: "user", content };
      const history = [...entriesRef.current, userEntry]
        .slice(-HISTORY)
        .map(({ role, content: text }) => ({ role, content: text }));
      setEntries((current) => [...current, userEntry]);
      setInput("");
      pendingRef.current = true;
      setPending(true);
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ track, fieldKey: getFocusedFieldKey(), answers: answersRef.current, messages: history }),
        });
        if (!response.ok) throw new Error(`http ${response.status}`);
        const guide = (await response.json()) as GuideResponse;
        const action = guide.action;
        let changes: FillChange[] | undefined;
        if (action?.type === "fill") changes = applyFill(action);
        else if (action?.type === "highlight" || action?.type === "example") highlight(action.fieldKey);
        else if (action?.type === "clarify" && action.fieldKey) highlight(action.fieldKey);
        setEntries((current) => [
          ...current,
          { id: nextId.current++, role: "assistant", content: guide.message, action, changes },
        ]);
        if (voice.live) await voice.speak(spokenText(guide));
      } catch {
        toast({
          title: `Could not reach ${name ?? "your Roadie"}`,
          description: "Check your connection and try again.",
          variant: "error",
        });
      } finally {
        pendingRef.current = false;
        setPending(false);
        const next = queued.current;
        queued.current = "";
        if (next) void sendRef.current(next);
      }
    },
    [applyFill, getFocusedFieldKey, highlight, name, toast, track, voice],
  );
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

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

  const toggleLive = () => {
    if (voice.live) voice.stopLive();
    else voice.startLive();
  };

  const explainFocused = () => {
    const field = findField(definition, getFocusedFieldKey());
    void send(field ? `What is "${field.label}" asking for?` : "What should I do first?");
  };

  if (!open) return null;

  const status = voice.live
    ? voice.speaking
      ? "Speaking"
      : voice.listening
        ? "Listening"
        : "Opening the mic"
    : pending
      ? "Thinking"
      : "Talk to me, I fill the quick stuff";

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={`Ask ${name ?? "your Roadie"}`}
      className="fixed bottom-4 right-4 z-50 flex h-[600px] max-h-[calc(100vh-32px)] w-[392px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-panel border border-border bg-panel text-base text-fg shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
    >
      <style>{STYLES}</style>

      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-3">
        {spec ? (
          <PetSprite spec={spec} size={30} mood={voice.speaking ? "happy" : mood} className="shrink-0" />
        ) : (
          <span aria-hidden className="size-7 shrink-0 rounded-full border border-dashed border-border-strong" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium leading-4">{name ?? "Your Roadie"}</span>
          <span role="status" className="flex items-center gap-1.5 truncate text-xs leading-4 text-muted">
            {voice.live && voice.listening && <LiveBars />}
            {status}
          </span>
        </div>
        {voice.support.recognition && (
          <button
            type="button"
            onClick={toggleLive}
            aria-pressed={voice.live}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-control border px-2 text-sm font-medium transition-colors duration-120 ease-out-quick",
              voice.live
                ? "border-accent bg-accent text-white hover:bg-accent-hover"
                : "border-border-strong bg-panel text-muted hover:border-[#35363b] hover:text-fg",
            )}
          >
            {voice.live ? <Square className="size-3 fill-current" /> : <AudioLines className="size-3.5" />}
            {voice.live ? "End" : "Talk live"}
          </button>
        )}
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

      <QuickAnswers
        fields={quick}
        answers={answers}
        done={quickDone}
        open={quickOpen}
        onToggle={() => setQuickOpen((value) => !value)}
        onShow={highlight}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3" aria-live="polite">
        {entries.map((entry) =>
          entry.role === "user" ? (
            <div key={entry.id} data-assistant-entry className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-panel rounded-br-[3px] border border-accent/40 bg-accent-soft px-2.5 py-1.5 text-fg">
                {entry.content}
              </p>
            </div>
          ) : (
            <div key={entry.id} data-assistant-entry className="flex items-start gap-2">
              {spec ? (
                <PetSprite spec={spec} size={22} mood="idle" className="mt-0.5 shrink-0" />
              ) : (
                <span aria-hidden className="mt-0.5 size-[22px] shrink-0 rounded-full border border-dashed border-border-strong" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="whitespace-pre-wrap text-fg">{entry.content}</p>
                {entry.action?.type === "fill" && entry.changes && (
                  <FillCard entry={entry} definition={definition} onUndo={() => undoFill(entry)} onShow={highlight} />
                )}
                {entry.action && (entry.action.type === "example" || entry.action.type === "clarify") && (
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
            </div>
          ),
        )}
        {pending && (
          <div className="flex items-center gap-2 pl-[30px] text-muted">
            <Spinner size={12} label="Thinking" />
            <span className="text-sm">{name ?? "Your Roadie"} is thinking</span>
          </div>
        )}
        {userTurns === 0 && !pending && (
          <div className="flex flex-wrap gap-1.5 pl-[30px] pt-1">
            {voice.support.recognition && !voice.live && (
              <SuggestionChip icon={<AudioLines className="size-3.5" />} onClick={voice.startLive}>
                Talk it through
              </SuggestionChip>
            )}
            <SuggestionChip onClick={() => void send("What is still empty?")}>What is left?</SuggestionChip>
            <SuggestionChip onClick={explainFocused}>Explain this question</SuggestionChip>
          </div>
        )}
        <div ref={listEnd} />
      </div>

      <div
        className={cn(
          "flex shrink-0 items-end gap-1.5 border-t border-border p-2 transition-colors duration-120 ease-out-quick",
          voice.live && "bg-[rgba(94,106,210,0.06)]",
        )}
      >
        <textarea
          ref={textarea}
          value={input}
          rows={1}
          placeholder={
            voice.live
              ? voice.speaking
                ? "Wait for me to finish, or just type"
                : "Say something, I am listening"
              : voice.listening
                ? "Listening"
                : "Tell me about yourself or ask about a field"
          }
          aria-label="Message"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onInputKeyDown}
          className={cn(
            controlClass,
            "max-h-24 min-h-7 flex-1 resize-none px-2 py-1 leading-5 field-sizing-content",
            voice.live && !voice.speaking && "border-accent/50",
          )}
        />
        {voice.support.recognition && !voice.live && (
          <Button
            variant={voice.listening ? "primary" : "ghost"}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? "Stop listening" : "Speak one message"}
            onClick={voice.listening ? voice.stopListening : voice.pushToTalk}
            disabled={pending}
            icon={voice.listening ? <MicOff /> : <Mic />}
          />
        )}
        {voice.live && voice.speaking && (
          <Button variant="ghost" aria-label="Stop talking" onClick={voice.cancelSpeech} icon={<Square className="fill-current" />} />
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

function LiveBars() {
  return (
    <span data-assistant-bars aria-hidden className="inline-flex h-3 items-center gap-px">
      <span className="h-full w-[2px] rounded-full bg-accent" />
      <span className="h-full w-[2px] rounded-full bg-accent" />
      <span className="h-full w-[2px] rounded-full bg-accent" />
      <span className="h-full w-[2px] rounded-full bg-accent" />
    </span>
  );
}

function SuggestionChip({ icon, onClick, children }: { icon?: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-strong bg-bg px-2.5 text-sm text-muted transition-colors duration-120 ease-out-quick hover:border-accent hover:text-fg"
    >
      {icon}
      {children}
    </button>
  );
}

interface QuickAnswersProps {
  fields: FieldDef[];
  answers: Answers;
  done: number;
  open: boolean;
  onToggle: () => void;
  onShow: (key: string) => void;
}

/** The quick answers the Roadie can write, with the ones already in ticked off. */
function QuickAnswers({ fields, answers, done, open, onToggle, onShow }: QuickAnswersProps) {
  const total = fields.length;
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className="shrink-0 border-b border-border bg-bg/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 px-3 text-left text-sm text-muted transition-colors duration-120 ease-out-quick hover:text-fg"
      >
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        <span className="shrink-0">Quick answers I can fill</span>
        <span className="ml-auto shrink-0 tabular-nums text-dim">
          {done}/{total}
        </span>
        <span aria-hidden className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-border-strong">
          <span
            className="block h-full rounded-full bg-status-accepted transition-[width] duration-300 ease-out-quick"
            style={{ width: `${percent}%` }}
          />
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
          {fields.map((field) => {
            const answered = isAnswered(field, answers[field.key]);
            return (
              <button
                key={field.key}
                type="button"
                onClick={() => onShow(field.key)}
                title={answered ? describeValue(field, answers[field.key]) : field.hint}
                className={cn(
                  "inline-flex h-6 max-w-full items-center gap-1 rounded-control border px-1.5 text-xs transition-colors duration-120 ease-out-quick",
                  answered
                    ? "border-transparent bg-active text-muted line-through decoration-dim hover:text-fg"
                    : "border-border-strong bg-panel text-fg hover:border-accent",
                )}
              >
                {answered && <Check className="size-3 shrink-0 text-status-accepted" strokeWidth={2.5} />}
                <span className="truncate">{field.label}</span>
              </button>
            );
          })}
          <span className="inline-flex h-6 items-center gap-1 px-1 text-xs text-dim">
            <PenLine className="size-3" />
            Essays stay yours
          </span>
        </div>
      )}
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
      className="self-start text-sm text-muted underline-offset-2 hover:text-fg hover:underline"
    >
      Show {findField(definition, fieldKey)?.label ?? "field"}
    </button>
  );
}

interface FillCardProps {
  entry: ChatEntry;
  definition: FormDefinition;
  onUndo: () => void;
  onShow: (key: string) => void;
}

function FillCard({ entry, definition, onUndo, onShow }: FillCardProps) {
  const changes = entry.changes ?? [];
  const count = changes.length;
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-control border bg-bg",
        entry.undone ? "border-border" : "border-status-accepted/40",
      )}
    >
      <div className="flex h-8 items-center gap-1.5 border-b border-border px-2.5 text-xs">
        <Check className={cn("size-3.5", entry.undone ? "text-dim" : "text-status-accepted")} strokeWidth={2.5} />
        <span className={cn("font-medium", entry.undone ? "text-dim line-through" : "text-fg")}>
          Filled {count} {count === 1 ? "answer" : "answers"}
        </span>
        {entry.undone ? (
          <span className="ml-auto text-dim">Undone</span>
        ) : (
          <button
            type="button"
            onClick={onUndo}
            className="ml-auto inline-flex h-6 items-center gap-1 rounded-control px-1.5 text-muted transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
          >
            <Undo2 className="size-3" />
            Undo
          </button>
        )}
      </div>
      <ul className="flex flex-col">
        {changes.map((change) => {
          const field = findField(definition, change.fieldKey);
          if (!field) return null;
          return (
            <li key={change.fieldKey}>
              <button
                type="button"
                onClick={() => onShow(field.key)}
                className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-2 px-2.5 py-1 text-left text-sm transition-colors duration-120 ease-out-quick hover:bg-hover"
              >
                <span className="truncate text-muted">{field.label}</span>
                <span className={cn("truncate", entry.undone ? "text-dim line-through" : "text-fg")}>
                  {describeValue(field, change.value)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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
  const essay = field !== undefined && isEssay(field);
  return (
    <div className="flex w-full flex-col gap-2 rounded-control border border-border bg-bg px-2.5 py-2">
      {field && (
        <span className="flex items-center gap-1.5 text-xs text-dim">
          {action.type === "example" ? "Example for" : "About"} {field.label}
          {essay && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border-strong px-1.5 text-[10px] uppercase tracking-wide text-muted">
              <PenLine className="size-2.5" />
              Yours to write
            </span>
          )}
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

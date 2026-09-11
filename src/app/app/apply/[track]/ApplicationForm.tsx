"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, CircleCheck } from "lucide-react";
import { AssistantPanel } from "@/components/assistant";
import { useRoadie } from "@/components/pet";
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  ProgressBar,
  Select,
  Spinner,
  Textarea,
  cn,
  useToast,
} from "@/components/ui";
import { saveDraft, submitApplication } from "@/lib/data/applications";
import { completion as computeCompletion, type Answers, type AnswerValue } from "@/lib/forms/schema";
import type { FieldDef, FormDefinition, Section } from "@/lib/forms/tracks";
import type { RoadieContext, Track } from "@/lib/types";

const AUTOSAVE_DELAY_MS = 800;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  dirty: "Unsaved changes",
  saving: "Saving",
  saved: "Saved",
  error: "Not saved",
};

export interface ApplicationFormProps {
  track: Track;
  definition: FormDefinition;
  initialAnswers: Answers;
}

function textValue(value: AnswerValue | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function listValue(value: AnswerValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function fieldId(key: string): string {
  return `field-${key}`;
}

function numberValue(raw: string): AnswerValue {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : raw;
}

interface FieldControlProps {
  field: FieldDef;
  value: AnswerValue | undefined;
  error: string | undefined;
  onChange: (value: AnswerValue) => void;
  onFocus: () => void;
}

function FieldControl({ field, value, error, onChange, onFocus }: FieldControlProps) {
  const id = fieldId(field.key);
  const invalid = error !== undefined;
  switch (field.type) {
    case "text":
    case "url":
      return (
        <Input
          id={id}
          type={field.type === "url" ? "url" : "text"}
          value={textValue(value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          value={textValue(value)}
          placeholder={field.placeholder}
          invalid={invalid}
          onChange={(event) => onChange(numberValue(event.target.value))}
          onFocus={onFocus}
          className="w-32"
        />
      );
    case "textarea":
      return (
        <Textarea
          id={id}
          value={textValue(value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          minRows={4}
          invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
      );
    case "select":
      return (
        <Select
          id={id}
          value={textValue(value)}
          options={field.options}
          placeholder="Select one"
          invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          className="max-w-sm"
        />
      );
    case "multiselect": {
      const selected = listValue(value);
      return (
        <div
          id={id}
          role="group"
          aria-labelledby={`${id}-label`}
          className={cn(
            "flex flex-wrap gap-1.5 rounded-control",
            invalid && "outline outline-1 outline-offset-4 outline-danger",
          )}
        >
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onFocus={onFocus}
                onClick={() =>
                  onChange(
                    active ? selected.filter((item) => item !== option.value) : [...selected, option.value],
                  )
                }
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-base transition-colors duration-120 ease-out-quick",
                  active
                    ? "border-accent bg-accent-soft text-fg"
                    : "border-border-strong bg-panel text-muted hover:border-[#35363b] hover:text-fg",
                )}
              >
                {active && <Check className="size-3.5" />}
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }
    case "checkbox":
      return (
        <Checkbox
          id={id}
          checked={value === true}
          label={field.label}
          onChange={(event) => onChange(event.target.checked)}
          onFocus={onFocus}
        />
      );
  }
}

function SectionNav({
  sections,
  sectionsDone,
  percent,
  saveState,
}: {
  sections: Section[];
  sectionsDone: Set<string>;
  percent: number;
  saveState: SaveState;
}) {
  return (
    <aside className="sticky top-0 hidden w-[200px] shrink-0 flex-col gap-4 self-start pt-1 md:flex">
      <nav aria-label="Sections" className="flex flex-col gap-px">
        {sections.map((section) => {
          const done = sectionsDone.has(section.key);
          return (
            <a
              key={section.key}
              href={`#section-${section.key}`}
              className="flex h-7 items-center gap-2 rounded-control px-2 text-base text-muted transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
            >
              {done ? (
                <CircleCheck className="size-3.5 shrink-0 text-status-accepted" strokeWidth={2} />
              ) : (
                <Circle className="size-3.5 shrink-0 text-dim" strokeWidth={1.5} />
              )}
              <span className="truncate">{section.title}</span>
            </a>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 px-2">
        <ProgressBar value={percent} label="Required answers" showValue />
        <SaveIndicator state={saveState} />
      </div>
    </aside>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex h-5 items-center gap-1.5 text-sm",
        state === "error" ? "text-danger" : "text-dim",
      )}
    >
      {state === "saving" && <Spinner size={12} label="Saving" />}
      {state === "saved" && <Check className="size-3.5 text-status-accepted" />}
      {SAVE_LABEL[state]}
    </span>
  );
}

export function ApplicationForm({ track, definition, initialAnswers }: ApplicationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { setContext: setRoadieContext, setMood: setRoadieMood } = useRoadie();

  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, startSubmit] = useTransition();

  const latestAnswers = useRef(answers);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const focus = useRef<{ section: Section; field: FieldDef } | null>(null);

  const completion = useMemo(() => computeCompletion(track, answers), [track, answers]);
  const sectionsDone = useMemo(() => new Set(completion.sectionsDone), [completion.sectionsDone]);
  const orderedFields = useMemo(
    () => definition.sections.flatMap((section) => section.fields.map((field) => ({ section, field }))),
    [definition],
  );

  const contextFor = useCallback(
    (errors: string[] = []): RoadieContext => {
      const current = focus.current;
      return {
        screen: "form",
        track,
        section: current?.section.title,
        fieldKey: current?.field.key,
        fieldHint: current?.field.hint,
        completion: completion.percent,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
    [track, completion.percent],
  );

  const orderedErrors = useCallback(
    (errors: Record<string, string>) =>
      orderedFields
        .filter(({ field }) => field.key in errors)
        .map(({ field }) => `${field.label}: ${errors[field.key]}`),
    [orderedFields],
  );

  useEffect(() => {
    setRoadieContext(contextFor(orderedErrors(fieldErrors)));
  }, [setRoadieContext, contextFor, orderedErrors, fieldErrors]);

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return saveChain.current.then(() => true);
    dirty.current = false;
    const snapshot = latestAnswers.current;
    const run = saveChain.current.then(async () => {
      setSaveState("saving");
      const result = await saveDraft(track, snapshot);
      if (!result.ok) {
        dirty.current = true;
        setSaveState("error");
        return false;
      }
      setSaveState(dirty.current ? "dirty" : "saved");
      return true;
    });
    saveChain.current = run.catch(() => false);
    return run;
  }, [track]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const setAnswer = (key: string, value: AnswerValue) => {
    const next = { ...latestAnswers.current, [key]: value };
    latestAnswers.current = next;
    dirty.current = true;
    setAnswers(next);
    setSaveState("dirty");
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      return Object.fromEntries(Object.entries(current).filter(([errorKey]) => errorKey !== key));
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, AUTOSAVE_DELAY_MS);
  };

  const focusField = (section: Section, field: FieldDef) => {
    focus.current = { section, field };
    setRoadieContext(contextFor(orderedErrors(fieldErrors)));
  };

  const focusedFieldKey = () => focus.current?.field.key;

  const saveNow = () => {
    void flush().then((ok) => {
      if (!ok) toast({ title: "Could not save your draft", description: "Check your connection and try again.", variant: "error" });
    });
  };

  /** Deferred so the modal dialog has closed and returned focus before the field takes it. */
  const scrollToField = (key: string) => {
    setTimeout(() => {
      const element = document.getElementById(fieldId(key));
      if (!element) return;
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      const focusable = element.matches("input, textarea, select")
        ? element
        : element.querySelector<HTMLElement>("input, textarea, select, button");
      focusable?.focus({ preventScroll: true });
    }, 0);
  };

  const submit = () => {
    startSubmit(async () => {
      const saved = await flush();
      if (!saved) {
        setConfirmOpen(false);
        toast({ title: "Could not save before submitting", description: "Try again in a moment.", variant: "error" });
        return;
      }
      const result = await submitApplication(track);
      if (result.ok) {
        setRoadieMood("celebrate");
        router.push(`/app/status/${track}`);
        return;
      }
      setConfirmOpen(false);
      if (!result.fieldErrors) {
        toast({ title: "Could not submit", description: result.error, variant: "error" });
        return;
      }
      const errors = result.fieldErrors;
      const first = orderedFields.find(({ field }) => field.key in errors);
      if (first) focus.current = first;
      setFieldErrors(errors);
      setRoadieContext(contextFor(orderedErrors(errors)));
      setRoadieMood("worried");
      if (first) scrollToField(first.field.key);
    });
  };

  const missingCount = completion.requiredMissing.length;

  const showMissing = () => {
    setConfirmOpen(false);
    const first = orderedFields.find(({ field }) => completion.requiredMissing.includes(field.key));
    if (!first) return;
    focusField(first.section, first.field);
    scrollToField(first.field.key);
  };

  return (
    <div className="mx-auto flex max-w-[1040px] gap-8 px-6 py-6">
      <SectionNav
        sections={definition.sections}
        sectionsDone={sectionsDone}
        percent={completion.percent}
        saveState={saveState}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-8 pb-28">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-medium text-fg">{definition.title}</h1>
          <p className="max-w-2xl text-base text-muted">{definition.blurb}</p>
        </header>

        {definition.sections.map((section) => (
          <section
            key={section.key}
            id={`section-${section.key}`}
            aria-labelledby={`section-${section.key}-title`}
            className="flex scroll-mt-6 flex-col gap-5 border-t border-border pt-6"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 id={`section-${section.key}-title`} className="text-md font-medium text-fg">
                  {section.title}
                </h2>
                {sectionsDone.has(section.key) && (
                  <span className="inline-flex items-center gap-1 text-xs text-status-accepted">
                    <CircleCheck className="size-3.5" strokeWidth={2} />
                    Done
                  </span>
                )}
              </div>
              {section.description && <p className="text-base text-muted">{section.description}</p>}
            </div>
            <div className="flex flex-col gap-5">
              {section.fields.map((field) => {
                const checkbox = field.type === "checkbox";
                return (
                  <Field
                    key={field.key}
                    htmlFor={checkbox ? undefined : fieldId(field.key)}
                    label={
                      checkbox ? undefined : (
                        <span id={`${fieldId(field.key)}-label`}>{field.label}</span>
                      )
                    }
                    required={!checkbox && field.required}
                    optional={!checkbox && !field.required}
                    hint={field.hint}
                    error={fieldErrors[field.key]}
                    className="max-w-lg"
                  >
                    <FieldControl
                      field={field}
                      value={answers[field.key]}
                      error={fieldErrors[field.key]}
                      onChange={(value) => setAnswer(field.key, value)}
                      onFocus={() => focusField(section, field)}
                    />
                  </Field>
                );
              })}
            </div>
          </section>
        ))}

        <footer className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <div className="flex flex-col gap-0.5">
            <SaveIndicator state={saveState} />
            <span className="text-sm text-muted">
              {missingCount === 0
                ? "Every required answer is in. Submit when you are ready."
                : `${missingCount} required ${missingCount === 1 ? "answer" : "answers"} still missing.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="md" onClick={saveNow} disabled={saveState === "saving" || submitting}>
              Save draft
            </Button>
            <Button size="md" variant="primary" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              Submit application
            </Button>
          </div>
        </footer>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        title="Submit this application?"
        description="You will not be able to edit your answers after submitting. Organizers see it as soon as it lands."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Keep editing
            </Button>
            {missingCount > 0 ? (
              <Button variant="primary" onClick={showMissing}>
                Show what is missing
              </Button>
            ) : (
              <Button variant="primary" onClick={submit} loading={submitting}>
                Submit application
              </Button>
            )}
          </>
        }
      >
        {missingCount > 0 && (
          <p className="text-base text-muted">
            {missingCount} required {missingCount === 1 ? "answer is" : "answers are"} still missing.
          </p>
        )}
      </Dialog>

      <AssistantPanel
        track={track}
        definition={definition}
        answers={answers}
        getFocusedFieldKey={focusedFieldKey}
        setAnswer={setAnswer}
        scrollToField={scrollToField}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button, Field, Textarea, Tooltip, cn, useToast } from "@/components/ui";
import { upsertReview } from "@/lib/data/reviews";
import type { Criterion } from "@/lib/forms/tracks";
import { SCORE_MAX, SCORE_MIN } from "@/lib/forms/tracks";

interface GradingFormProps {
  applicationId: string;
  rubric: Criterion[];
  initial: { scores: Record<string, number>; overall: number; notes: string } | null;
  savedLabel: string | null;
  disabled?: boolean;
}

const SCORE_VALUES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, index) => SCORE_MIN + index);

interface ScoreInputProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function ScoreInput({ id, label, value, onChange, disabled }: ScoreInputProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      id={id}
      className="inline-flex shrink-0 overflow-hidden rounded-control border border-border-strong bg-panel"
      onKeyDown={(event) => {
        if (disabled) return;
        const current = value ?? SCORE_MIN - 1;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          onChange(Math.min(SCORE_MAX, current + 1));
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          onChange(Math.max(SCORE_MIN, current - 1));
        }
      }}
    >
      {SCORE_VALUES.map((score) => {
        const checked = value === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${score} of ${SCORE_MAX}`}
            disabled={disabled}
            tabIndex={checked || (value === undefined && score === SCORE_MIN) ? 0 : -1}
            onClick={() => onChange(score)}
            className={cn(
              "size-5 text-xs tabular-nums transition-colors duration-120 ease-out-quick focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
              score !== SCORE_MIN && "border-l border-border-strong",
              checked ? "bg-accent text-white" : "text-muted hover:bg-hover hover:text-fg",
            )}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}

interface ScoreRowProps extends ScoreInputProps {
  description: string;
  error?: string;
}

function ScoreRow({ id, label, description, error, ...input }: ScoreRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <Tooltip content={description} className="w-full">
        <div className="flex flex-1 items-center justify-between gap-3">
          <label htmlFor={id} className="truncate text-sm font-medium text-fg">
            {label}
          </label>
          <ScoreInput id={id} label={label} {...input} />
        </div>
      </Tooltip>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function GradingForm({ applicationId, rubric, initial, savedLabel, disabled }: GradingFormProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<string, number>>(initial?.scores ?? {});
  const [overall, setOverall] = useState<number | undefined>(initial?.overall);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const complete = rubric.every((criterion) => scores[criterion.key] !== undefined) && overall !== undefined;

  function submit() {
    if (overall === undefined) return;
    startTransition(async () => {
      const result = await upsertReview(applicationId, { scores, overall, notes });
      if (result.ok) {
        setErrors({});
        setDirty(false);
        toast({ title: initial ? "Review updated" : "Review saved", variant: "success" });
      } else {
        setErrors(result.fieldErrors ?? {});
        toast({ title: "Could not save the review", description: result.error, variant: "error" });
      }
    });
  }

  if (disabled) {
    return <p className="text-sm text-muted">Reviews open once the applicant submits.</p>;
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-2">
        {rubric.map((criterion) => (
          <ScoreRow
            key={criterion.key}
            id={`score-${criterion.key}`}
            label={criterion.label}
            description={criterion.description}
            error={errors[`scores.${criterion.key}`]}
            value={scores[criterion.key]}
            disabled={pending}
            onChange={(value) => {
              setScores((current) => ({ ...current, [criterion.key]: value }));
              setDirty(true);
            }}
          />
        ))}
        <ScoreRow
          id="score-overall"
          label="Overall"
          description="Your gut call, independent of the criteria."
          error={errors.overall}
          value={overall}
          disabled={pending}
          onChange={(value) => {
            setOverall(value);
            setDirty(true);
          }}
        />
      </div>
      <p className="text-xs text-dim">1 is weak, 5 is strong. Hover a criterion for what it measures.</p>
      <Field label="Notes" optional error={errors.notes} htmlFor="review-notes">
        <Textarea
          id="review-notes"
          value={notes}
          minRows={3}
          maxRows={10}
          maxLength={4000}
          disabled={pending}
          placeholder="What stood out, what to ask in an interview"
          onChange={(event) => {
            setNotes(event.target.value);
            setDirty(true);
          }}
        />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-dim">
          {dirty ? "Unsaved changes" : savedLabel ? `Saved ${savedLabel}` : "Not saved yet"}
        </span>
        <Button type="submit" variant="primary" loading={pending} disabled={!complete}>
          Save review
        </Button>
      </div>
    </form>
  );
}

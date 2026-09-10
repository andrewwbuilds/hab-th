"use client";

import { useState, useTransition } from "react";
import { Button, Field, Textarea, cn, useToast } from "@/components/ui";
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
      className="inline-flex h-7 items-center gap-1"
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
        const filled = value !== undefined && score <= value;
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
            className="group flex size-5 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={cn(
                "size-2.5 rounded-full transition-colors duration-120 ease-out-quick",
                filled ? "bg-accent group-hover:bg-accent-hover" : "bg-border-strong group-hover:bg-[#3a3b40]",
              )}
            />
          </button>
        );
      })}
      <span className="ml-1 w-3 text-right text-sm tabular-nums text-muted">{value ?? ""}</span>
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
      {rubric.map((criterion) => (
        <Field
          key={criterion.key}
          label={criterion.label}
          hint={criterion.description}
          error={errors[`scores.${criterion.key}`]}
          htmlFor={`score-${criterion.key}`}
        >
          <ScoreInput
            id={`score-${criterion.key}`}
            label={criterion.label}
            value={scores[criterion.key]}
            disabled={pending}
            onChange={(value) => {
              setScores((current) => ({ ...current, [criterion.key]: value }));
              setDirty(true);
            }}
          />
        </Field>
      ))}
      <Field label="Overall" hint="Your gut call, independent of the criteria." error={errors.overall} htmlFor="score-overall">
        <ScoreInput
          id="score-overall"
          label="Overall"
          value={overall}
          disabled={pending}
          onChange={(value) => {
            setOverall(value);
            setDirty(true);
          }}
        />
      </Field>
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

"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Field, Input, ProgressBar, RadioGroup, cn } from "@/components/ui";
import { derivePet, SPECIES_LABEL, STAGE_THRESHOLDS, TONE_LABEL } from "@/lib/pet/engine";
import { suggestName } from "@/lib/pet/names";
import { DISCOVERY, ERAS, GENRES, HOURS, type Genre, type MusicProfile, type Scale5 } from "@/lib/types";
import { PetSprite } from "./PetSprite";
import { DISCOVERY_HINT, DISCOVERY_LABEL, ERA_LABEL, GENRE_LABEL, HOURS_LABEL } from "./labels";

export interface RoadieQuizProps {
  onComplete: (profile: MusicProfile, name: string) => Promise<void> | void;
  submitting?: boolean;
  className?: string;
}

type StepKey = "genres" | "energy" | "mood" | "era" | "hours" | "discovery" | "artist" | "reveal";

interface StepDef {
  key: StepKey;
  title: string;
  description: string;
}

const STEPS: readonly StepDef[] = [
  {
    key: "genres",
    title: "What do you listen to?",
    description: "Pick up to three, favourite first. The first one decides what your Roadie is.",
  },
  {
    key: "energy",
    title: "How hard does it go?",
    description: "Think about the music you reach for most days, not the loudest thing you own.",
  },
  {
    key: "mood",
    title: "Where does it sit emotionally?",
    description: "This sets your Roadie's colours.",
  },
  {
    key: "era",
    title: "Which era sounds like home?",
    description: "Your Roadie carries something from it.",
  },
  {
    key: "hours",
    title: "How much do you listen in a day?",
    description: "Decides how much your Roadie talks.",
  },
  {
    key: "discovery",
    title: "How do you find new music?",
    description: "There is no wrong answer here.",
  },
  {
    key: "artist",
    title: "Who is on repeat?",
    description: "Your Roadie will bring them up now and then.",
  },
  {
    key: "reveal",
    title: "Meet your Roadie",
    description: "Change the name if it does not fit. Everything else comes from your answers.",
  },
];

const MAX_GENRES = 3;
const MAX_NAME_LENGTH = 40;
const SCALE: readonly Scale5[] = [1, 2, 3, 4, 5];

const INITIAL_PROFILE: MusicProfile = {
  genres: [],
  energy: 3,
  mood: 3,
  era: "10s",
  hoursPerDay: "1to3",
  discovery: "playlists",
  topArtist: "",
  anthem: "",
};

function pickFrom<T extends string>(list: readonly T[], value: string): T | undefined {
  return list.find((item) => item === value);
}

function stepError(key: StepKey, profile: MusicProfile, name: string): string | null {
  if (key === "genres" && profile.genres.length === 0) return "Pick at least one genre";
  if (key === "artist" && profile.topArtist.trim().length === 0) return "Tell us who you listen to most";
  if (key === "reveal" && name.trim().length === 0) return "Give your Roadie a name";
  return null;
}

interface ScaleControlProps {
  name: string;
  label: string;
  value: Scale5;
  low: string;
  high: string;
  onChange: (value: Scale5) => void;
}

function ScaleControl({ name, label, value, low, high, onChange }: ScaleControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label={label} className="flex">
        {SCALE.map((n) => (
          <label
            key={n}
            className={cn(
              "-ml-px flex h-8 flex-1 cursor-pointer select-none items-center justify-center border border-border-strong bg-panel text-base tabular-nums text-muted transition-colors duration-120 ease-out-quick",
              "first:ml-0 first:rounded-l-control last:rounded-r-control hover:z-10 hover:border-[#35363b] hover:text-fg",
              "has-checked:z-20 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-fg",
              "has-focus-visible:z-30 has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:-outline-offset-1",
            )}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </div>
      <div className="flex justify-between text-sm text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

interface GenrePickerProps {
  selected: Genre[];
  onToggle: (genre: Genre) => void;
}

function GenrePicker({ selected, onToggle }: GenrePickerProps) {
  const full = selected.length >= MAX_GENRES;
  return (
    <div role="group" aria-label="Genres" className="flex flex-wrap gap-1.5">
      {GENRES.map((genre) => {
        const index = selected.indexOf(genre);
        const isSelected = index >= 0;
        return (
          <button
            key={genre}
            type="button"
            aria-pressed={isSelected}
            disabled={!isSelected && full}
            onClick={() => onToggle(genre)}
            className={cn(
              "inline-flex h-7 select-none items-center gap-1.5 rounded-full border px-3 text-base transition-colors duration-120 ease-out-quick disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-accent bg-accent-soft text-fg"
                : "border-border-strong bg-panel text-muted hover:border-[#35363b] hover:text-fg disabled:hover:border-border-strong disabled:hover:text-muted",
            )}
          >
            {isSelected && (
              <span
                aria-hidden
                className="inline-flex size-4 items-center justify-center rounded-full bg-accent text-xs font-medium leading-none text-white"
              >
                {index + 1}
              </span>
            )}
            {GENRE_LABEL[genre]}
            {isSelected && <span className="sr-only">, choice {index + 1}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function RoadieQuiz({ onComplete, submitting = false, className }: RoadieQuizProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<MusicProfile>(INITIAL_PROFILE);
  const [customName, setCustomName] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(stepIndex);
  const ids = useId();

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const suggested = suggestName(profile);
  const name = customName ?? suggested;
  const error = attempted ? stepError(step.key, profile, name) : null;

  useEffect(() => {
    if (previousStep.current !== stepIndex) {
      previousStep.current = stepIndex;
      headingRef.current?.focus();
    }
  }, [stepIndex]);

  function update<K extends keyof MusicProfile>(key: K, value: MusicProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGenre(genre: Genre) {
    setProfile((prev) => {
      const selected = prev.genres.includes(genre);
      if (selected) return { ...prev, genres: prev.genres.filter((g) => g !== genre) };
      if (prev.genres.length >= MAX_GENRES) return prev;
      return { ...prev, genres: [...prev.genres, genre] };
    });
  }

  function back() {
    setAttempted(false);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (stepError(step.key, profile, name)) {
      setAttempted(true);
      return;
    }
    if (isLast) {
      void onComplete(
        { ...profile, topArtist: profile.topArtist.trim(), anthem: profile.anthem.trim() },
        name.trim(),
      );
      return;
    }
    setAttempted(false);
    setStepIndex((i) => i + 1);
  }

  let body;
  switch (step.key) {
    case "genres":
      body = (
        <Field error={error} hint={error ? undefined : `${profile.genres.length} of ${MAX_GENRES} picked`}>
          <GenrePicker selected={profile.genres} onToggle={toggleGenre} />
        </Field>
      );
      break;
    case "energy":
      body = (
        <ScaleControl
          name={`${ids}-energy`}
          label="Energy"
          value={profile.energy}
          low="Background"
          high="Wall of sound"
          onChange={(value) => update("energy", value)}
        />
      );
      break;
    case "mood":
      body = (
        <ScaleControl
          name={`${ids}-mood`}
          label="Mood"
          value={profile.mood}
          low="Melancholy"
          high="Euphoric"
          onChange={(value) => update("mood", value)}
        />
      );
      break;
    case "era":
      body = (
        <RadioGroup
          name={`${ids}-era`}
          aria-label="Era"
          columns={3}
          value={profile.era}
          options={ERAS.map((era) => ({ value: era, label: ERA_LABEL[era] }))}
          onChange={(value) => {
            const era = pickFrom(ERAS, value);
            if (era) update("era", era);
          }}
        />
      );
      break;
    case "hours":
      body = (
        <RadioGroup
          name={`${ids}-hours`}
          aria-label="Hours per day"
          columns={2}
          value={profile.hoursPerDay}
          options={HOURS.map((hours) => ({ value: hours, label: HOURS_LABEL[hours] }))}
          onChange={(value) => {
            const hours = pickFrom(HOURS, value);
            if (hours) update("hoursPerDay", hours);
          }}
        />
      );
      break;
    case "discovery":
      body = (
        <RadioGroup
          name={`${ids}-discovery`}
          aria-label="How you find music"
          columns={2}
          value={profile.discovery}
          options={DISCOVERY.map((discovery) => ({
            value: discovery,
            label: DISCOVERY_LABEL[discovery],
            hint: DISCOVERY_HINT[discovery],
          }))}
          onChange={(value) => {
            const discovery = pickFrom(DISCOVERY, value);
            if (discovery) update("discovery", discovery);
          }}
        />
      );
      break;
    case "artist":
      body = (
        <div className="flex flex-col gap-4">
          <Field
            label="Top artist"
            htmlFor={`${ids}-artist`}
            required
            error={error}
            hint="The one you would defend in an argument."
          >
            <Input
              id={`${ids}-artist`}
              value={profile.topArtist}
              maxLength={80}
              invalid={error !== null}
              placeholder="Phoebe Bridgers"
              onChange={(event) => update("topArtist", event.target.value)}
            />
          </Field>
          <Field label="Anthem" htmlFor={`${ids}-anthem`} optional hint="The song you would walk out to.">
            <Input
              id={`${ids}-anthem`}
              value={profile.anthem}
              maxLength={120}
              placeholder="Motion Sickness"
              onChange={(event) => update("anthem", event.target.value)}
            />
          </Field>
        </div>
      );
      break;
    case "reveal": {
      const preview = { ...derivePet(profile, name), xp: STAGE_THRESHOLDS.grown };
      body = (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-panel border border-border bg-bg p-4">
            <PetSprite spec={preview} size={96} mood="happy" className="shrink-0" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-md font-medium text-fg">{preview.name}</span>
              <span className="text-sm text-muted">
                {SPECIES_LABEL[preview.species]}, {TONE_LABEL[preview.traits.tone].toLowerCase()}
              </span>
              <span className="text-sm text-dim">Hatches as an egg and grows as you apply.</span>
            </div>
          </div>
          <Field
            label="Name"
            htmlFor={`${ids}-name`}
            error={error}
            hint={
              customName !== null && customName !== suggested ? (
                <button
                  type="button"
                  onClick={() => setCustomName(null)}
                  className="text-muted underline decoration-border-strong underline-offset-2 transition-colors duration-120 ease-out-quick hover:text-fg"
                >
                  Use the suggested name, {suggested}
                </button>
              ) : (
                "Suggested from your top artist and genres."
              )
            }
          >
            <Input
              id={`${ids}-name`}
              value={name}
              maxLength={MAX_NAME_LENGTH}
              invalid={error !== null}
              onChange={(event) => setCustomName(event.target.value)}
            />
          </Field>
        </div>
      );
      break;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting || undefined}
      className={cn("flex w-full max-w-[560px] flex-col gap-6", className)}
    >
      <ProgressBar value={stepIndex + 1} max={STEPS.length} label={`Step ${stepIndex + 1} of ${STEPS.length}`} />
      <div ref={headingRef} tabIndex={-1} className="flex flex-col gap-1 outline-none">
        <h2 className="text-lg font-medium text-fg">{step.title}</h2>
        <p className="text-base text-muted">{step.description}</p>
      </div>
      <div className="min-h-[160px]">{body}</div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="ghost" icon={<ChevronLeft aria-hidden />} onClick={back} disabled={stepIndex === 0 || submitting}>
          Back
        </Button>
        {isLast ? (
          <Button type="submit" variant="primary" loading={submitting}>
            Hatch my Roadie
          </Button>
        ) : (
          <Button type="submit" variant="primary">
            Next
            <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </form>
  );
}

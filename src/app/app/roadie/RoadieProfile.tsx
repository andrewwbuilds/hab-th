"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { DISCOVERY_LABEL, ERA_LABEL, GENRE_LABEL, HOURS_LABEL, PetSprite } from "@/components/pet";
import { Button, Card, Input, Meter, useToast } from "@/components/ui";
import { renamePet } from "@/lib/data/pets";
import {
  SPECIES_LABEL,
  STAGE_LABEL,
  STAGE_THRESHOLDS,
  stageFor,
  TONE_LABEL,
  XP_EVENTS,
  type XpEventKey,
} from "@/lib/pet/engine";
import { FORM_DEFINITIONS } from "@/lib/forms/tracks";
import { isTrack, TRACK_LABEL, type PetSpec, type Stage } from "@/lib/types";

const STAGES: Stage[] = ["egg", "hatchling", "grown"];
const XP_SCALE_MAX = 200;

function isXpEventKey(value: string): value is XpEventKey {
  return value in XP_EVENTS;
}

function describeXpEvent(stored: string): { label: string; xp: number } | null {
  const [eventKey, qualifier] = stored.split(":", 2);
  if (!isXpEventKey(eventKey)) return null;
  const xp = XP_EVENTS[eventKey];
  const [trackKey, sectionKey] = qualifier?.split("/") ?? [];
  const track = trackKey && isTrack(trackKey) ? TRACK_LABEL[trackKey] : null;
  switch (eventKey) {
    case "petCreated":
      return { label: "Hatched", xp };
    case "firstDraft":
      return { label: "Started a first draft", xp };
    case "sectionComplete": {
      const section =
        trackKey && isTrack(trackKey)
          ? FORM_DEFINITIONS[trackKey].sections.find((candidate) => candidate.key === sectionKey)
          : undefined;
      return {
        label:
          section && track
            ? `Finished ${section.title.toLowerCase()} on the ${track.toLowerCase()} form`
            : "Finished a section",
        xp,
      };
    }
    case "submitted":
      return { label: track ? `Submitted the ${track.toLowerCase()} application` : "Submitted an application", xp };
    case "decision":
      return { label: track ? `Got a decision on the ${track.toLowerCase()} application` : "Got a decision", xp };
  }
}

function RenameForm({ pet }: { pet: PetSpec }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    setName(pet.name);
    setEditing(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = name.trim();
    if (next === pet.name || next.length === 0) {
      cancel();
      return;
    }
    startTransition(async () => {
      const result = await renamePet(next);
      if (!result.ok) {
        toast({ title: "Could not rename", description: result.error, variant: "error" });
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <h1 className="text-xl font-medium text-fg">{pet.name}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Rename ${pet.name}`}
          className="flex size-6 items-center justify-center rounded-control text-dim transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <Input
        autoFocus
        aria-label="Roadie name"
        value={name}
        maxLength={40}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancel();
        }}
        className="h-8 w-56 text-md font-medium"
        disabled={pending}
      />
      <Button type="submit" variant="primary" loading={pending} icon={<Check />} aria-label="Save name" />
      <Button type="button" variant="ghost" onClick={cancel} disabled={pending} icon={<X />} aria-label="Cancel" />
    </form>
  );
}

function XpBar({ xp }: { xp: number }) {
  const stage = stageFor(xp);
  const percent = Math.min(100, (xp / XP_SCALE_MAX) * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{STAGE_LABEL[stage]}</span>
        <span className="tabular-nums text-muted">{xp} xp</span>
      </div>
      <div
        role="progressbar"
        aria-label="Experience"
        aria-valuemin={0}
        aria-valuemax={XP_SCALE_MAX}
        aria-valuenow={xp}
        className="relative h-1.5 w-full rounded-full bg-active"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        {STAGES.filter((candidate) => candidate !== "egg").map((candidate) => (
          <span
            key={candidate}
            aria-hidden
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg"
            style={{
              left: `${(STAGE_THRESHOLDS[candidate] / XP_SCALE_MAX) * 100}%`,
              background: xp >= STAGE_THRESHOLDS[candidate] ? "var(--color-accent)" : "var(--color-border-strong)",
            }}
          />
        ))}
      </div>
      <div className="relative h-4 text-xs text-dim">
        {STAGES.map((candidate) => (
          <span
            key={candidate}
            className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0"
            style={{ left: `${(STAGE_THRESHOLDS[candidate] / XP_SCALE_MAX) * 100}%` }}
          >
            {STAGE_LABEL[candidate]} {STAGE_THRESHOLDS[candidate]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RoadieProfile({ pet }: { pet: PetSpec }) {
  const { music, palette, traits } = pet;
  const events = (traits.xpEvents ?? []).map(describeXpEvent).filter((event) => event !== null);
  const swatches: { label: string; hex: string }[] = [
    { label: "Primary", hex: palette.primary },
    { label: "Secondary", hex: palette.secondary },
    { label: "Accent", hex: palette.accent },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex flex-col items-center gap-4">
        <PetSprite spec={pet} size={176} />
        <div className="flex w-full flex-col items-center gap-1 text-center">
          <RenameForm pet={pet} />
          <span className="text-base text-muted">{SPECIES_LABEL[pet.species]}</span>
          <span className="text-sm text-dim">{TONE_LABEL[traits.tone]} tone</span>
        </div>
        <ul className="flex items-center gap-3">
          {swatches.map((swatch) => (
            <li key={swatch.label} className="flex items-center gap-1.5" title={`${swatch.label} ${swatch.hex}`}>
              <span
                aria-hidden
                className="size-4 rounded-full border border-border-strong"
                style={{ background: swatch.hex }}
              />
              <span className="font-mono text-xs text-dim">{swatch.hex}</span>
            </li>
          ))}
        </ul>
        <div className="w-full border-t border-border pt-4">
          <XpBar xp={pet.xp} />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-md font-medium text-fg">Music</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-base">
            <dt className="text-muted">Genres</dt>
            <dd className="text-fg">{music.genres.map((genre) => GENRE_LABEL[genre]).join(", ")}</dd>
            <dt className="text-muted">Energy</dt>
            <dd className="flex items-center gap-2 text-fg">
              <Meter value={music.energy} label="Energy" size="sm" />
              <span className="text-sm text-dim">{music.energy} of 5</span>
            </dd>
            <dt className="text-muted">Mood</dt>
            <dd className="flex items-center gap-2 text-fg">
              <Meter value={music.mood} label="Mood" size="sm" />
              <span className="text-sm text-dim">{music.mood} of 5</span>
            </dd>
            <dt className="text-muted">Era</dt>
            <dd className="text-fg">{ERA_LABEL[music.era]}</dd>
            <dt className="text-muted">Listening</dt>
            <dd className="text-fg">{HOURS_LABEL[music.hoursPerDay]} a day</dd>
            <dt className="text-muted">Finds music via</dt>
            <dd className="text-fg">{DISCOVERY_LABEL[music.discovery]}</dd>
            <dt className="text-muted">Top artist</dt>
            <dd className="text-fg">{music.topArtist}</dd>
            {music.anthem.trim() && (
              <>
                <dt className="text-muted">Anthem</dt>
                <dd className="text-fg">{music.anthem}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-md font-medium text-fg">Experience</h2>
            <span className="text-sm text-dim">{pet.xp} xp total</span>
          </div>
          {events.length === 0 ? (
            <p className="text-base text-muted">Nothing yet. Start an application and the xp will follow.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-border">
              {events.map((event, index) => (
                <li key={`${event.label}-${index}`} className="flex h-8 items-center justify-between gap-3">
                  <span className="truncate text-base text-fg">{event.label}</span>
                  <span className="shrink-0 text-sm tabular-nums text-status-accepted">+{event.xp} xp</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

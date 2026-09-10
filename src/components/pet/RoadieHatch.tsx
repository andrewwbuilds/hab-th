"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/components/ui";
import { SPECIES_LABEL, STAGE_THRESHOLDS } from "@/lib/pet/engine";
import type { PetSpec } from "@/lib/types";
import { PetSprite } from "./PetSprite";

export interface RoadieHatchProps {
  spec: PetSpec;
  onDone: () => void;
  className?: string;
}

type Phase = "egg" | "crack" | "reveal";

const CRACK_AT_MS = 250;
const REVEAL_AT_MS = 900;
const DONE_AT_MS = 1500;
const REDUCED_MOTION_DONE_AT_MS = 600;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function readReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function serverReducedMotion() {
  return false;
}

const KEYFRAMES = `
@keyframes roadie-hatch-in {
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}
.roadie-hatch-reveal { animation: roadie-hatch-in 240ms cubic-bezier(0.2, 0, 0, 1) 1; }
@media (prefers-reduced-motion: reduce) {
  .roadie-hatch-reveal { animation: none; }
}
`;

export function RoadieHatch({ spec, onDone, className }: RoadieHatchProps) {
  const [timedPhase, setTimedPhase] = useState<Phase>("egg");
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverReducedMotion);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const finish = () => onDoneRef.current();
    if (reducedMotion) {
      const timer = window.setTimeout(finish, REDUCED_MOTION_DONE_AT_MS);
      return () => window.clearTimeout(timer);
    }
    const timers = [
      window.setTimeout(() => setTimedPhase("crack"), CRACK_AT_MS),
      window.setTimeout(() => setTimedPhase("reveal"), REVEAL_AT_MS),
      window.setTimeout(finish, DONE_AT_MS),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reducedMotion]);

  const phase: Phase = reducedMotion ? "reveal" : timedPhase;

  const eggSpec: PetSpec = { ...spec, xp: phase === "crack" ? STAGE_THRESHOLDS.hatchling / 2 : 0 };
  const revealSpec: PetSpec = { ...spec, xp: STAGE_THRESHOLDS.grown };
  const revealed = phase === "reveal";

  return (
    <div
      role="status"
      aria-live="polite"
      data-phase={phase}
      className={cn("flex flex-col items-center gap-3 text-center", className)}
    >
      <style>{KEYFRAMES}</style>
      {revealed ? (
        <div className="roadie-hatch-reveal">
          <PetSprite spec={revealSpec} size={96} mood="happy" />
        </div>
      ) : (
        <PetSprite spec={eggSpec} size={96} mood={phase === "crack" ? "celebrate" : "idle"} />
      )}
      <div
        aria-hidden={!revealed}
        className={cn(
          "flex flex-col gap-0.5 transition-opacity duration-200 ease-out-quick",
          revealed ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="text-lg font-medium text-fg">{spec.name}</span>
        <span className="text-sm text-muted">{SPECIES_LABEL[spec.species]}</span>
      </div>
    </div>
  );
}

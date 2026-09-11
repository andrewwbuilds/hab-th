import { Card, ProgressBar, cn } from "@/components/ui";
import { nextStageXp, SPECIES_LABEL, STAGE_LABEL, STAGE_THRESHOLDS, stageFor, TONE_LABEL } from "@/lib/pet/engine";
import type { PetSpec } from "@/lib/types";
import { PetSprite } from "./PetSprite";

export interface RoadieCardProps {
  spec: PetSpec;
  compact?: boolean;
  className?: string;
}

function stageProgress(xp: number): { value: number; max: number; label: string } {
  const stage = stageFor(xp);
  const target = nextStageXp(xp);
  if (target === null) {
    return { value: 1, max: 1, label: `${STAGE_LABEL[stage]}, ${xp} xp` };
  }
  const floor = STAGE_THRESHOLDS[stage];
  const nextStage = stageFor(target);
  return {
    value: xp - floor,
    max: target - floor,
    label: `${STAGE_LABEL[stage]}, ${target - xp} xp to ${STAGE_LABEL[nextStage].toLowerCase()}`,
  };
}

export function RoadieCard({ spec, compact = false, className }: RoadieCardProps) {
  const { music } = spec;
  const progress = stageProgress(spec.xp);
  const anthem = music.anthem.trim();

  return (
    <Card padding="sm" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start gap-3">
        <PetSprite spec={spec} size={48} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-md font-medium text-fg">{spec.name}</span>
            <span className="shrink-0 text-sm text-dim">{TONE_LABEL[spec.traits.tone]}</span>
          </div>
          <span className="text-sm text-muted">{spec.traits.guide ? "Your application guide" : SPECIES_LABEL[spec.species]}</span>
          {!spec.traits.guide && <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            <dt className="text-dim">Top artist</dt>
            <dd className="truncate text-fg">{music.topArtist}</dd>
            {anthem && (
              <>
                <dt className="text-dim">Anthem</dt>
                <dd className="truncate text-fg">{anthem}</dd>
              </>
            )}
          </dl>}
        </div>
      </div>
      {!compact && <ProgressBar value={progress.value} max={progress.max} label={spec.traits.guide ? `${spec.xp} xp earned together` : progress.label} />}
    </Card>
  );
}

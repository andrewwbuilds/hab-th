import { PixelPortrait } from "./PixelPortrait";
import type { CSSProperties, ReactNode } from "react";
import type { Accessory, PetMood, PetPalette, PetSpec, Species, Stage } from "@/lib/types";
import { SPECIES_LABEL, STAGE_THRESHOLDS, stageFor } from "@/lib/pet/engine";

export interface PetSpriteProps {
  spec: PetSpec;
  size?: number;
  mood?: PetMood;
  className?: string;
}

type EyeBand = "sleepy" | "neutral" | "sparkly";

const INK = "#141516";
const SCLERA = "#f4f4f5";
const SHELL_LINE = "#0f1011";

const KEYFRAMES = `
@keyframes roadie-bounce {
  0% { transform: translateY(0) scale(1, 1); }
  30% { transform: translateY(-7px) scale(1.05, 0.95); }
  60% { transform: translateY(0) scale(0.97, 1.03); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes roadie-tilt {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(-7deg); }
  100% { transform: rotate(-4deg); }
}
@keyframes roadie-perk {
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
}
.roadie-stage { transform-box: fill-box; transform-origin: 50% 100%; }
.roadie-stage[data-mood="celebrate"] { animation: roadie-bounce 480ms cubic-bezier(0.2, 0, 0, 1) 1; }
.roadie-stage[data-mood="worried"] { animation: roadie-tilt 240ms ease-out 1 forwards; }
.roadie-stage[data-mood="happy"] { animation: roadie-perk 240ms ease-out 1; }
@media (prefers-reduced-motion: reduce) {
  .roadie-stage[data-mood] { animation: none; }
}
`;

function eyeBand(mood: number): EyeBand {
  if (mood <= 2) return "sleepy";
  if (mood >= 4) return "sparkly";
  return "neutral";
}

interface EyeProps {
  cx: number;
  cy: number;
  r: number;
  band: EyeBand;
  mood: PetMood;
  lid: string;
  accent: string;
}

function Eye({ cx, cy, r, band, mood, lid, accent }: EyeProps) {
  if (mood === "happy") {
    return (
      <path
        d={`M ${cx - r} ${cy + r * 0.3} Q ${cx} ${cy - r} ${cx + r} ${cy + r * 0.3}`}
        fill="none"
        stroke={INK}
        strokeWidth={r * 0.55}
        strokeLinecap="round"
      />
    );
  }
  const pupil = r * 0.6;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={SCLERA} />
      <circle cx={cx} cy={cy + r * 0.1} r={pupil} fill={INK} />
      {band === "sparkly" ? (
        <>
          <circle cx={cx - pupil * 0.4} cy={cy - pupil * 0.4} r={pupil * 0.4} fill={SCLERA} />
          <path
            d={`M ${cx + r + 1.5} ${cy - r - 1} l 0.7 1.6 l 1.6 0.7 l -1.6 0.7 l -0.7 1.6 l -0.7 -1.6 l -1.6 -0.7 l 1.6 -0.7 Z`}
            fill={accent}
          />
        </>
      ) : null}
      {band === "sleepy" ? (
        <path d={`M ${cx - r - 0.3} ${cy} A ${r + 0.3} ${r + 0.3} 0 0 1 ${cx + r + 0.3} ${cy} Z`} fill={lid} />
      ) : null}
    </g>
  );
}

function Brows({ cx, cy, r, side }: { cx: number; cy: number; r: number; side: -1 | 1 }) {
  const outer = cx + side * r * 1.1;
  const inner = cx - side * r * 0.6;
  return (
    <path
      d={`M ${outer} ${cy - r * 1.9} L ${inner} ${cy - r * 1.35}`}
      stroke={INK}
      strokeWidth={r * 0.45}
      strokeLinecap="round"
    />
  );
}

interface SpeciesParts {
  behind?: (p: PetPalette) => ReactNode;
  head: (p: PetPalette, stage: Exclude<Stage, "egg">) => ReactNode;
  front?: (p: PetPalette) => ReactNode;
  grownEyes?: { left: [number, number]; right: [number, number]; r: number };
}

const HEAD_ON_HATCHLING = "translate(32 44) scale(0.72) translate(-32 -38)";

function scaled(stage: Exclude<Stage, "egg">, node: ReactNode) {
  return stage === "hatchling" ? <g transform={HEAD_ON_HATCHLING}>{node}</g> : node;
}

const PARTS: Record<Species, SpeciesParts> = {
  moth: {
    behind: (p) => (
      <g>
        <ellipse cx={16} cy={38} rx={10} ry={14} fill={p.secondary} />
        <ellipse cx={48} cy={38} rx={10} ry={14} fill={p.secondary} />
        <circle cx={15} cy={36} r={3} fill={p.accent} />
        <circle cx={49} cy={36} r={3} fill={p.accent} />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g stroke={p.accent} strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M 27 25 C 25 18 22 15 20 11" />
          <path d="M 37 25 C 39 18 42 15 44 11" />
          <circle cx={20} cy={10.5} r={2} fill={p.accent} stroke="none" />
          <circle cx={44} cy={10.5} r={2} fill={p.accent} stroke="none" />
        </g>,
      ),
  },
  cat: {
    behind: (p) => (
      <path d="M 45 46 C 54 44 58 34 54 26" fill="none" stroke={p.primary} strokeWidth={4} strokeLinecap="round" />
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <path d="M 20 30 L 21 14 L 31 24 Z" fill={p.primary} />
          <path d="M 44 30 L 43 14 L 33 24 Z" fill={p.primary} />
          <path d="M 22.5 27 L 23 18 L 29 24 Z" fill={p.secondary} />
          <path d="M 41.5 27 L 41 18 L 35 24 Z" fill={p.secondary} />
        </g>,
      ),
    front: (p) => (
      <g stroke={p.accent} strokeWidth={1} strokeLinecap="round">
        <path d="M 14 40 L 22 41" />
        <path d="M 14 44 L 22 43" />
        <path d="M 50 40 L 42 41" />
        <path d="M 50 44 L 42 43" />
      </g>
    ),
  },
  fox: {
    behind: (p) => (
      <g>
        <path d="M 44 48 C 54 50 60 42 58 34" fill="none" stroke={p.primary} strokeWidth={7} strokeLinecap="round" />
        <circle cx={58} cy={33} r={4} fill={p.secondary} />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <path d="M 21 29 L 19 9 L 31 23 Z" fill={p.primary} />
          <path d="M 43 29 L 45 9 L 33 23 Z" fill={p.primary} />
          <path d="M 23.5 26 L 22.5 15 L 29 23 Z" fill={p.secondary} />
          <path d="M 40.5 26 L 41.5 15 L 35 23 Z" fill={p.secondary} />
        </g>,
      ),
    front: (p) => (
      <g>
        <ellipse cx={32} cy={42} rx={6} ry={4.5} fill={p.secondary} />
        <circle cx={32} cy={40.5} r={1.6} fill={INK} />
      </g>
    ),
  },
  bunny: {
    behind: (p) => <circle cx={47} cy={47} r={4.5} fill={p.secondary} />,
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <ellipse cx={25} cy={15} rx={4.5} ry={11} fill={p.primary} transform="rotate(-8 25 15)" />
          <ellipse cx={39} cy={15} rx={4.5} ry={11} fill={p.primary} transform="rotate(8 39 15)" />
          <ellipse cx={25} cy={15} rx={2} ry={7.5} fill={p.secondary} transform="rotate(-8 25 15)" />
          <ellipse cx={39} cy={15} rx={2} ry={7.5} fill={p.secondary} transform="rotate(8 39 15)" />
        </g>,
      ),
    front: (p) => (
      <g>
        <circle cx={32} cy={41} r={1.4} fill={p.accent} />
        <path d="M 30 43 Q 32 45 34 43" fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />
      </g>
    ),
  },
  wolf: {
    behind: (p) => (
      <path d="M 45 46 C 52 50 56 56 55 60" fill="none" stroke={p.primary} strokeWidth={6} strokeLinecap="round" />
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <path d="M 18 31 L 18 13 L 31 24 Z" fill={p.primary} />
          <path d="M 46 31 L 46 13 L 33 24 Z" fill={p.primary} />
          <path d="M 21 28 L 21 18 L 28 24 Z" fill={p.secondary} />
          <path d="M 43 28 L 43 18 L 36 24 Z" fill={p.secondary} />
        </g>,
      ),
    front: (p) => (
      <g>
        <ellipse cx={32} cy={43} rx={7} ry={5} fill={p.secondary} />
        <circle cx={32} cy={41} r={1.8} fill={INK} />
        <path d="M 29 46 L 30 48.5 L 31 46 Z" fill={SCLERA} />
        <path d="M 33 46 L 34 48.5 L 35 46 Z" fill={SCLERA} />
      </g>
    ),
  },
  dragon: {
    behind: (p) => (
      <g>
        <path d="M 18 34 L 6 20 L 12 36 L 6 46 L 18 42 Z" fill={p.secondary} />
        <path d="M 46 34 L 58 20 L 52 36 L 58 46 L 46 42 Z" fill={p.secondary} />
        <path d="M 40 50 C 48 54 54 52 60 56" fill="none" stroke={p.primary} strokeWidth={5} strokeLinecap="round" />
        <path d="M 58 52 L 63 57 L 57 60 Z" fill={p.accent} />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g stroke={p.accent} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d="M 26 25 C 25 19 22 15 22 10" />
          <path d="M 38 25 C 39 19 42 15 42 10" />
        </g>,
      ),
    front: (p) => (
      <g stroke={p.accent} strokeWidth={1} opacity={0.7}>
        <path d="M 27 44 Q 32 47 37 44" fill="none" />
        <path d="M 28 48 Q 32 51 36 48" fill="none" />
      </g>
    ),
  },
  raccoon: {
    behind: (p) => (
      <path
        d="M 45 48 C 53 48 58 40 56 32"
        fill="none"
        stroke={p.primary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="4 3"
      />
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <circle cx={21} cy={25} r={5.5} fill={p.primary} />
          <circle cx={43} cy={25} r={5.5} fill={p.primary} />
          <circle cx={21} cy={25} r={3} fill={p.secondary} />
          <circle cx={43} cy={25} r={3} fill={p.secondary} />
        </g>,
      ),
    front: () => (
      <g>
        <ellipse cx={26} cy={34} rx={7} ry={4.5} fill="#1e1f22" opacity={0.85} />
        <ellipse cx={38} cy={34} rx={7} ry={4.5} fill="#1e1f22" opacity={0.85} />
      </g>
    ),
  },
  owl: {
    behind: (p) => (
      <g>
        <ellipse cx={19} cy={42} rx={5} ry={10} fill={p.secondary} />
        <ellipse cx={45} cy={42} rx={5} ry={10} fill={p.secondary} />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <path d="M 23 26 L 19 14 L 30 23 Z" fill={p.primary} />
          <path d="M 41 26 L 45 14 L 34 23 Z" fill={p.primary} />
        </g>,
      ),
    front: (p) => (
      <g>
        <circle cx={26} cy={34} r={6} fill={p.secondary} />
        <circle cx={38} cy={34} r={6} fill={p.secondary} />
        <path d="M 32 39 L 29.5 42 L 34.5 42 Z" fill={p.accent} transform="rotate(180 32 40.5)" />
        <path d="M 26 52 L 24 56 M 26 52 L 28 56 M 38 52 L 36 56 M 38 52 L 40 56" stroke={p.accent} strokeWidth={1.5} strokeLinecap="round" />
      </g>
    ),
  },
  swan: {
    behind: (p) => <ellipse cx={38} cy={44} rx={9} ry={6} fill={p.secondary} />,
    head: (p, stage) =>
      stage === "hatchling" ? (
        <path d="M 30 47 L 34 47 L 32 51 Z" fill={p.accent} />
      ) : (
        <g>
          <path d="M 23 44 C 12 40 12 24 21 20" fill="none" stroke={p.primary} strokeWidth={7} strokeLinecap="round" />
          <circle cx={22} cy={19} r={6} fill={p.primary} />
          <path d="M 17 18 L 9 20 L 17 22 Z" fill={p.accent} />
        </g>
      ),
    grownEyes: { left: [21, 18], right: [25, 18], r: 1.6 },
  },
  deer: {
    behind: (p) => (
      <g>
        <ellipse cx={17} cy={29} rx={6} ry={3} fill={p.primary} transform="rotate(-20 17 29)" />
        <ellipse cx={47} cy={29} rx={6} ry={3} fill={p.primary} transform="rotate(20 47 29)" />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g stroke={p.accent} strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M 25 25 L 22 12 M 22 16 L 17 12 M 22 12 L 26 8" />
          <path d="M 39 25 L 42 12 M 42 16 L 47 12 M 42 12 L 38 8" />
        </g>,
      ),
    front: (p) => (
      <g>
        <ellipse cx={32} cy={43} rx={5} ry={3.5} fill={p.secondary} />
        <circle cx={32} cy={41.5} r={1.4} fill={INK} />
        <circle cx={24} cy={48} r={1.2} fill={p.secondary} />
        <circle cx={40} cy={48} r={1.2} fill={p.secondary} />
        <circle cx={36} cy={51} r={1} fill={p.secondary} />
      </g>
    ),
  },
  sloth: {
    behind: (p) => (
      <g stroke={p.primary} strokeWidth={6} strokeLinecap="round" fill="none">
        <path d="M 20 40 C 14 46 13 52 14 60" />
        <path d="M 44 40 C 50 46 51 52 50 60" />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <ellipse cx={26} cy={34} rx={6.5} ry={3.5} fill={p.accent} opacity={0.6} transform="rotate(-12 26 34)" />
          <ellipse cx={38} cy={34} rx={6.5} ry={3.5} fill={p.accent} opacity={0.6} transform="rotate(12 38 34)" />
        </g>,
      ),
    front: () => (
      <path d="M 28 43 Q 32 46 36 43" fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
    ),
  },
  parrot: {
    behind: (p) => (
      <g>
        <ellipse cx={20} cy={54} rx={3} ry={9} fill={p.accent} transform="rotate(35 20 54)" />
        <ellipse cx={24} cy={56} rx={3} ry={9} fill={p.secondary} transform="rotate(20 24 56)" />
        <ellipse cx={44} cy={42} rx={4.5} ry={9} fill={p.secondary} transform="rotate(-15 44 42)" />
      </g>
    ),
    head: (p, stage) =>
      scaled(
        stage,
        <g>
          <ellipse cx={30} cy={18} rx={2.5} ry={7} fill={p.accent} transform="rotate(-25 30 18)" />
          <ellipse cx={34} cy={17} rx={2.5} ry={7} fill={p.secondary} transform="rotate(5 34 17)" />
          <ellipse cx={38} cy={19} rx={2.5} ry={6} fill={p.accent} transform="rotate(30 38 19)" />
        </g>,
      ),
    front: (p) => <path d="M 29 38 Q 36 37 35 46 Q 31 45 29 38 Z" fill={p.accent} />,
  },
};

function AccessoryPart({ accessory, palette }: { accessory: Accessory; palette: PetPalette }) {
  switch (accessory) {
    case "headphones":
      return (
        <g>
          <path d="M 17 32 C 17 18 47 18 47 32" fill="none" stroke={palette.accent} strokeWidth={2.5} />
          <rect x={14} y={30} width={6} height={9} rx={2} fill={palette.accent} />
          <rect x={44} y={30} width={6} height={9} rx={2} fill={palette.accent} />
        </g>
      );
    case "cassette":
      return (
        <g>
          <rect x={24} y={44} width={16} height={10} rx={1.5} fill={palette.accent} />
          <rect x={27} y={46.5} width={10} height={5} rx={1} fill={INK} opacity={0.7} />
          <circle cx={29} cy={49} r={1.4} fill={SCLERA} />
          <circle cx={35} cy={49} r={1.4} fill={SCLERA} />
        </g>
      );
    case "vinyl":
      return (
        <g>
          <circle cx={47} cy={50} r={7} fill={INK} stroke={palette.accent} strokeWidth={1.5} />
          <circle cx={47} cy={50} r={4} fill="none" stroke={palette.accent} strokeWidth={0.75} opacity={0.6} />
          <circle cx={47} cy={50} r={1.6} fill={palette.accent} />
        </g>
      );
    case "ipod":
      return (
        <g>
          <rect x={25} y={43} width={11} height={15} rx={2} fill="#e6e6e6" />
          <rect x={27} y={45} width={7} height={4.5} rx={0.8} fill={palette.accent} />
          <circle cx={30.5} cy={53.5} r={2.8} fill="#c4c4c8" />
          <circle cx={30.5} cy={53.5} r={1} fill="#e6e6e6" />
        </g>
      );
  }
}

function Egg({ palette, showCrack }: { palette: PetPalette; showCrack: boolean }) {
  return (
    <g>
      <path
        d="M 32 12 C 44 12 49 28 49 40 C 49 50 41 57 32 57 C 23 57 15 50 15 40 C 15 28 20 12 32 12 Z"
        fill={palette.primary}
      />
      <path d="M 17 36 L 22 32 L 27 36 L 32 32 L 37 36 L 42 32 L 47 36" fill="none" stroke={palette.secondary} strokeWidth={2.5} />
      <path d="M 17 43 L 22 39 L 27 43 L 32 39 L 37 43 L 42 39 L 47 43" fill="none" stroke={palette.secondary} strokeWidth={2.5} />
      <circle cx={26} cy={23} r={1.8} fill={palette.accent} />
      <circle cx={38} cy={25} r={1.8} fill={palette.accent} />
      <circle cx={32} cy={50} r={1.8} fill={palette.accent} />
      {showCrack ? (
        <path d="M 30 14 L 33 18 L 30 22 L 34 26" fill="none" stroke={SHELL_LINE} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </g>
  );
}

function Hatchling({ spec, mood, band }: { spec: PetSpec; mood: PetMood; band: EyeBand }) {
  const parts = PARTS[spec.species];
  const { palette } = spec;
  return (
    <g>
      <path d="M 24 57 C 22 51 42 51 40 57 Z" fill={palette.secondary} opacity={0.5} />
      <circle cx={32} cy={44} r={12} fill={palette.primary} />
      <ellipse cx={32} cy={49} rx={6} ry={4} fill={palette.secondary} opacity={0.8} />
      {parts.head(palette, "hatchling")}
      <Eye cx={27} cy={42} r={4} band={band} mood={mood} lid={palette.primary} accent={palette.accent} />
      <Eye cx={37} cy={42} r={4} band={band} mood={mood} lid={palette.primary} accent={palette.accent} />
      {mood === "worried" ? (
        <>
          <Brows cx={27} cy={42} r={3} side={-1} />
          <Brows cx={37} cy={42} r={3} side={1} />
        </>
      ) : null}
    </g>
  );
}

function Grown({ spec, mood, band }: { spec: PetSpec; mood: PetMood; band: EyeBand }) {
  const parts = PARTS[spec.species];
  const { palette } = spec;
  const eyes = parts.grownEyes ?? { left: [26, 34], right: [38, 34], r: 3 };
  return (
    <g>
      {parts.behind?.(palette)}
      <ellipse cx={32} cy={38} rx={15} ry={14} fill={palette.primary} />
      <ellipse cx={32} cy={44} rx={8} ry={6.5} fill={palette.secondary} opacity={0.8} />
      {parts.head(palette, "grown")}
      {parts.front?.(palette)}
      <Eye cx={eyes.left[0]} cy={eyes.left[1]} r={eyes.r} band={band} mood={mood} lid={palette.primary} accent={palette.accent} />
      <Eye cx={eyes.right[0]} cy={eyes.right[1]} r={eyes.r} band={band} mood={mood} lid={palette.primary} accent={palette.accent} />
      {mood === "worried" ? (
        <>
          <Brows cx={eyes.left[0]} cy={eyes.left[1]} r={eyes.r} side={-1} />
          <Brows cx={eyes.right[0]} cy={eyes.right[1]} r={eyes.r} side={1} />
        </>
      ) : null}
      <AccessoryPart accessory={spec.traits.accessory} palette={palette} />
    </g>
  );
}

const SVG_STYLE: CSSProperties = { display: "block", overflow: "visible" };

export function PetSprite({ spec, size = 56, mood = "idle", className }: PetSpriteProps) {
  if (spec.traits.guide) return <PixelPortrait src={spec.traits.guide.image} name={spec.name} size={size} className={className} />;
  const stage = stageFor(spec.xp);
  const band = eyeBand(spec.music.mood);
  const label = `${spec.name}, a ${SPECIES_LABEL[spec.species].toLowerCase()} (${stage})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
      className={className}
      style={SVG_STYLE}
    >
      <style>{KEYFRAMES}</style>
      <g key={mood} className="roadie-stage" data-mood={mood}>
        {stage === "egg" ? (
          <Egg palette={spec.palette} showCrack={spec.xp >= STAGE_THRESHOLDS.hatchling / 2} />
        ) : stage === "hatchling" ? (
          <Hatchling spec={spec} mood={mood} band={band} />
        ) : (
          <Grown spec={spec} mood={mood} band={band} />
        )}
      </g>
    </svg>
  );
}

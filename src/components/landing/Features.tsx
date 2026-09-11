import { Check, ListChecks, Mic, Save } from "lucide-react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import type { Status } from "@/lib/types";

const WAVE = [10, 18, 26, 14, 22, 28, 16, 24, 12, 20, 26, 14];

const STATUS_ROWS: { track: string; status: Status; label: string }[] = [
  { track: "Hacker", status: "accepted", label: "Accepted" },
  { track: "Mentor", status: "under_review", label: "Under review" },
  { track: "Volunteer", status: "submitted", label: "Submitted" },
];

function SaveArt() {
  return (
    <div className="mock-window mock-save">
      <div className="mock-save-bar">
        <span>Hacker application</span>
        <span className="mock-saved">
          <Check aria-hidden size={12} /> Saved
        </span>
      </div>
      <div className="mock-progress">
        <i style={{ width: "64%" }} />
      </div>
      <span className="mock-line" style={{ width: "92%" }} />
      <span className="mock-line" style={{ width: "74%" }} />
      <span className="mock-line" style={{ width: "83%" }} />
    </div>
  );
}

function VoiceArt() {
  return (
    <div className="mock-voice">
      <span className="mock-mic">
        <Mic aria-hidden size={20} />
      </span>
      <span className="mock-wave">
        {WAVE.map((height, index) => (
          <i key={index} style={{ height, animationDelay: `${index * -0.13}s` }} />
        ))}
      </span>
      <span className="mock-transcript">“Is a class project okay for this one?”</span>
    </div>
  );
}

function StatusArt() {
  return (
    <div className="mock-window mock-status">
      {STATUS_ROWS.map((row) => (
        <div key={row.track} className="mock-status-row">
          <StatusIcon status={row.status} />
          <span>{row.track}</span>
          <em>{row.label}</em>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    key: "save",
    icon: Save,
    title: "Saves as you type",
    body: "Drafts save on every change, so closing the laptop at 2am never costs you an answer.",
    art: SaveArt,
  },
  {
    key: "voice",
    icon: Mic,
    title: "Talk it through",
    body: "Hold the mic and ask out loud. Your guide listens, then points, explains, or shows an example.",
    art: VoiceArt,
  },
  {
    key: "status",
    icon: ListChecks,
    title: "Know where you stand",
    body: "Every track you applied to sits on one status page, and decisions show up the moment they are made.",
    art: StatusArt,
  },
] as const;

export function Features() {
  return (
    <div className="encore-feature-grid">
      {FEATURES.map(({ key, icon: Icon, title, body, art: Art }) => (
        <article key={key} className="encore-feature">
          <div className="encore-feature-art" aria-hidden>
            <Art />
          </div>
          <h3>
            <Icon aria-hidden />
            {title}
          </h3>
          <p>{body}</p>
        </article>
      ))}
    </div>
  );
}

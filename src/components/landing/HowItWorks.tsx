"use client";

import { useEffect, useRef, useState } from "react";
import { HalftoneSkyline } from "@/components/landing/HalftoneSkyline";
import { PixelPortrait } from "@/components/pet/PixelPortrait";
import { GUIDES } from "@/lib/pet/guides";

const STEPS = [
  {
    key: "track",
    light: "Pick the part",
    strong: "you want to play",
    body: "Hacker, judge, mentor, or volunteer. One account covers every track, with one application for each.",
  },
  {
    key: "guide",
    light: "Bring a guide",
    strong: "you actually like",
    body: "Choose Eddy, Gary, or Eric, draw your own character, or turn a selfie into pixels. It is optional, and it makes the form feel a lot less lonely.",
  },
  {
    key: "ask",
    light: "Ask as you go,",
    strong: "out loud if you want",
    body: "Press ⌘J (Ctrl+J on Windows) on any question. Your guide points to the right field, shows a short example, or explains what the question is really asking.",
  },
] as const;

const TRACK_CHOICES = [
  { name: "Hacker", color: "#8b93ea", note: "36 hours, teams of four" },
  { name: "Judge", color: "#c79af5", note: "Score the final demos" },
  { name: "Mentor", color: "#5cc3d1", note: "Unblock stuck teams" },
  { name: "Volunteer", color: "#e6957f", note: "Run the weekend" },
];

function TrackVisual() {
  return (
    <div className="mock-window">
      <p className="mock-label">What are you applying for?</p>
      <div className="mock-track-grid">
        {TRACK_CHOICES.map((track, index) => (
          <div key={track.name} className="mock-track" data-selected={index === 0}>
            <strong>
              <i style={{ background: track.color }} />
              {track.name}
            </strong>
            <span>{track.note}</span>
          </div>
        ))}
      </div>
      <div className="mock-button">Create account</div>
    </div>
  );
}

function GuideVisual() {
  return (
    <div className="mock-guides">
      {GUIDES.map((guide) => (
        <div key={guide.id} className="mock-guide" data-selected={guide.id === "gary"}>
          <PixelPortrait src={guide.image} name={guide.name} size={84} />
          {guide.name}
        </div>
      ))}
      <div className="mock-guide">
        <span className="mock-guide-draw">✎</span>
        Your own
      </div>
    </div>
  );
}

function AskVisual() {
  const gary = GUIDES[1];
  return (
    <div className="mock-ask">
      <div className="mock-window">
        <div className="mock-field">
          <p className="mock-label">Project name</p>
          <div className="mock-input">Tidepool</div>
        </div>
        <div className="mock-field" data-highlight="true">
          <p className="mock-label">Tell us about something you built</p>
          <div className="mock-input mock-input-tall" />
        </div>
      </div>
      <div className="mock-panel">
        <header>
          <PixelPortrait src={gary.image} name={gary.name} size={22} />
          Ask {gary.name}
          <kbd>⌘J</kbd>
        </header>
        <p className="mock-msg mock-msg-user">What should I write here?</p>
        <p className="mock-msg mock-msg-guide">
          One project, what it does, and the part you built. Two or three sentences is plenty.
          <span className="mock-chip">Show me an example</span>
        </p>
      </div>
    </div>
  );
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) return <TrackVisual />;
  if (index === 1) return <GuideVisual />;
  return <AskVisual />;
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((step) => step && observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="encore-how">
      <ol className="encore-how-steps">
        {STEPS.map((step, index) => (
          <li
            key={step.key}
            ref={(element) => {
              steps.current[index] = element;
            }}
            data-index={index}
            data-active={active === index}
            className="encore-how-step"
          >
            <span className="encore-how-index">0{index + 1}</span>
            <div>
              <h3>
                <span className="encore-serif">{step.light}</span> {step.strong}
              </h3>
              <p>{step.body}</p>
              <div className="encore-how-inline" aria-hidden>
                <HalftoneSkyline className="encore-how-halftone" seed={70 + index} rise={0.5} />
                <StepVisual index={index} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="encore-how-stage" aria-hidden>
        {STEPS.map((step, index) => (
          <div key={step.key} className="encore-how-frame" data-active={active === index}>
            <HalftoneSkyline className="encore-how-halftone" seed={70 + index} rise={0.5} />
            <StepVisual index={index} />
          </div>
        ))}
      </div>
    </div>
  );
}

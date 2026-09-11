"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const LINES = [
  { person: "eddy", name: "Eddy", line: "Your idea deserves a weekend. Come build with us." },
  { person: "gary", name: "Gary", line: "You should apply. I’m already rooting for you." },
  { person: "eric", name: "Eric", line: "One question at a time. I’ll help you through it." },
  { person: "gary", name: "Gary", line: "Also… Andrew should really be a director." },
];

export function EncoreScene() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % LINES.length), 5200);
    return () => window.clearInterval(timer);
  }, [reduced]);
  const line = LINES[active];
  return <div className="encore-scene-shell">
    <div className="encore-scene" data-paused={reduced}>
      <Image src="/art/encore-palace.png" alt="Eddy, Gary, and Eric building together beside the lagoon at the Palace of Fine Arts, illustrated in indigo and lavender pixel art." fill priority sizes="(max-width: 1200px) 100vw, 1200px" className="encore-scene-art" />
      <div className="encore-scene-atmosphere" aria-hidden="true" />
      <div className="encore-sparks" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ left: `${9 + i * 9}%`, top: `${26 + (i * 17) % 51}%`, animationDelay: `${i * -1.7}s` }} />)}</div>
      <div className={`scene-speech scene-speech-${line.person}`} key={active} role="status" aria-live={reduced ? "polite" : "off"}><span>{line.name}{line.person === "eddy" && <small> / Edward</small>}</span><p>{line.line}</p></div>
      <span className="encore-scene-location">37.8029° N · 122.4484° W<br /><strong>Palace of Fine Arts, San Francisco</strong></span>
    </div>
  </div>;
}

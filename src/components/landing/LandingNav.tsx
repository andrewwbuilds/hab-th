"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/shell/Wordmark";

export function LandingNav() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="encore-nav-sentinel" />
      <header className="encore-header" data-compact={compact}>
        <div className="encore-nav">
          <Link href="/" aria-label="Encore home" className="encore-nav-brand">
            <Wordmark size="lg" />
          </Link>
          <nav aria-label="Main navigation">
            <div className="encore-nav-links">
              <a href="#how-it-works">How it works</a>
              <a href="#your-guides">Guides</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="encore-nav-actions">
              <Link href="/sign-in" className="encore-button encore-button-small encore-button-outline">
                Sign in
              </Link>
              <Link href="/sign-up" className="encore-button encore-button-small">
                Apply
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}

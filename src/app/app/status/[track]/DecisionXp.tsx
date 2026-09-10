"use client";

import { useEffect } from "react";
import { awardXp } from "@/lib/data/pets";
import type { Track } from "@/lib/types";

/** A decision is the one xp event the applicant does not trigger, so it lands when they first see it. */
export function DecisionXp({ track }: { track: Track }) {
  useEffect(() => {
    void awardXp("decision", track);
  }, [track]);
  return null;
}

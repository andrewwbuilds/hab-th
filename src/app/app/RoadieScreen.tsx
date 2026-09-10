"use client";

import { useEffect } from "react";
import { useRoadie } from "@/components/pet";
import type { RoadieContext } from "@/lib/types";

/** Tells the Roadie which screen it is on. Render once per page. */
export function RoadieScreen({ context }: { context: RoadieContext }) {
  const { setContext } = useRoadie();
  useEffect(() => {
    setContext(context);
  }, [context, setContext]);
  return null;
}

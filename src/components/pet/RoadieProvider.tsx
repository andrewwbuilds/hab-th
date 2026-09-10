"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { PetMood, PetSpec } from "@/lib/types";
import { getRoadieLine, lineVariantCount, moodForContext, type RoadieLineContext } from "@/lib/pet/voice";

export interface RoadieState {
  spec: PetSpec | null;
  context: RoadieLineContext;
  setContext: (ctx: RoadieLineContext) => void;
  mood: PetMood;
  setMood: (mood: PetMood) => void;
  line: string;
  variant: number;
  nextVariant: () => void;
}

export interface RoadieProviderProps {
  spec: PetSpec | null;
  initialContext?: RoadieLineContext;
  children: ReactNode;
}

const DEFAULT_CONTEXT: RoadieLineContext = { screen: "home" };

function noop() {}

const FALLBACK: RoadieState = {
  spec: null,
  context: DEFAULT_CONTEXT,
  setContext: noop,
  mood: "idle",
  setMood: noop,
  line: "",
  variant: 0,
  nextVariant: noop,
};

const RoadieCtx = createContext<RoadieState>(FALLBACK);

function sameContext(a: RoadieLineContext, b: RoadieLineContext): boolean {
  return (
    a.screen === b.screen &&
    a.track === b.track &&
    a.section === b.section &&
    a.fieldKey === b.fieldKey &&
    a.fieldHint === b.fieldHint &&
    a.completion === b.completion &&
    a.status === b.status &&
    (a.errors ?? []).join("\n") === (b.errors ?? []).join("\n")
  );
}

interface InnerState {
  context: RoadieLineContext;
  variant: number;
  override: PetMood | null;
}

export function RoadieProvider({ spec, initialContext = DEFAULT_CONTEXT, children }: RoadieProviderProps) {
  const [state, setState] = useState<InnerState>({ context: initialContext, variant: 0, override: null });

  const setContext = useCallback((ctx: RoadieLineContext) => {
    setState((prev) => (sameContext(prev.context, ctx) ? prev : { context: ctx, variant: 0, override: null }));
  }, []);

  const setMood = useCallback((mood: PetMood) => {
    setState((prev) => (prev.override === mood ? prev : { ...prev, override: mood }));
  }, []);

  const nextVariant = useCallback(() => {
    setState((prev) => {
      if (!spec) return prev;
      const count = lineVariantCount(spec, prev.context);
      return { ...prev, variant: (prev.variant + 1) % Math.max(1, count) };
    });
  }, [spec]);

  const value = useMemo<RoadieState>(() => {
    if (!spec) return FALLBACK;
    return {
      spec,
      context: state.context,
      setContext,
      mood: state.override ?? moodForContext(state.context),
      setMood,
      line: getRoadieLine(spec, state.context, state.variant),
      variant: state.variant,
      nextVariant,
    };
  }, [spec, state, setContext, setMood, nextVariant]);

  return <RoadieCtx.Provider value={value}>{children}</RoadieCtx.Provider>;
}

/** Falls back to an inert state (spec null) when no provider is mounted. */
export function useRoadie(): RoadieState {
  return useContext(RoadieCtx);
}

"use client";
import { GuidePicker } from "@/components/pet/GuidePicker";
import type { PetSpec } from "@/lib/types";
export function RoadieWorkspace({ pet }: { pet: PetSpec | null }) {
  return <GuidePicker pet={pet} />;
}

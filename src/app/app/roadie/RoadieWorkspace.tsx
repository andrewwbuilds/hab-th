"use client";
import { GuidePicker } from "@/components/pet/GuidePicker";
import type { PetSpec } from "@/lib/types";
export function RoadieWorkspace({ pet, returnTo }: { pet: PetSpec | null; returnTo: string | null }) {
  return <GuidePicker pet={pet} returnTo={returnTo} />;
}

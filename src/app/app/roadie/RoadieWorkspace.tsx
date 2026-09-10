"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoadieHatch, RoadieQuiz } from "@/components/pet";
import { Button, useToast } from "@/components/ui";
import { createPet } from "@/lib/data/pets";
import type { MusicProfile, PetSpec } from "@/lib/types";
import { RoadieProfile } from "./RoadieProfile";

type HatchPhase = { spec: PetSpec; done: boolean };

export function RoadieWorkspace({ pet }: { pet: PetSpec | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [hatch, setHatch] = useState<HatchPhase | null>(null);
  const [submitting, startSubmit] = useTransition();

  const handleComplete = (profile: MusicProfile, name: string) =>
    new Promise<void>((resolve) => {
      startSubmit(async () => {
        const result = await createPet(profile, name);
        if (result.ok) {
          setHatch({ spec: result.data, done: false });
        } else {
          toast({ title: "Could not create your Roadie", description: result.error, variant: "error" });
        }
        resolve();
      });
    });

  if (hatch) {
    return (
      <section className="flex flex-col items-center gap-6 py-10">
        <RoadieHatch
          spec={hatch.spec}
          onDone={() => {
            setHatch((current) => (current ? { ...current, done: true } : current));
            router.refresh();
          }}
        />
        <div
          className="flex flex-col items-center gap-3 text-center transition-opacity duration-200 ease-out-quick"
          style={{ opacity: hatch.done ? 1 : 0 }}
          aria-hidden={!hatch.done}
        >
          <p className="max-w-sm text-base text-muted">
            {hatch.spec.name} starts as an egg and grows as you fill in applications. Every section you finish adds
            xp.
          </p>
          <div className="flex items-center gap-2">
            <Button href="/app" variant="primary" size="md" disabled={!hatch.done}>
              Go home
            </Button>
            <Button size="md" disabled={!hatch.done} onClick={() => setHatch(null)}>
              See {hatch.spec.name}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (pet) return <RoadieProfile pet={pet} />;

  return (
    <>
      <header className="flex flex-col gap-0.5">
        <h1 className="text-lg font-medium text-fg">Build your Roadie</h1>
        <p className="text-base text-muted">
          Eight quick questions about what you listen to. Your answers decide what hatches.
        </p>
      </header>
      <RoadieQuiz onComplete={handleComplete} submitting={submitting} className="max-w-2xl" />
    </>
  );
}

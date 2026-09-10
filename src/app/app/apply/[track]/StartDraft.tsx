"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Spinner } from "@/components/ui";
import { createDraft } from "@/lib/data/applications";
import { TRACK_LABEL, type Track } from "@/lib/types";

/** Creates the draft on first visit; the server page cannot call the action during render. */
export function StartDraft({ track }: { track: Track }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    createDraft(track).then((result) => {
      if (cancelled) return;
      if (result.ok) router.refresh();
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [track, router, attempt]);

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-6 py-6">
      <Card className="flex items-center gap-3">
        {error ? (
          <>
            <span className="flex-1 text-base text-danger">{error}</span>
            <Button
              onClick={() => {
                setError(null);
                setAttempt((current) => current + 1);
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <>
            <Spinner />
            <span className="text-base text-muted">Starting your {TRACK_LABEL[track].toLowerCase()} application</span>
          </>
        )}
      </Card>
    </div>
  );
}

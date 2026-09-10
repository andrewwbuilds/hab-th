"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { Wordmark } from "@/components/shell";

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-[360px] max-w-full flex-col gap-4">
        <Wordmark size="md" className="self-center" />
        <div className="flex flex-col gap-4 rounded-panel border border-border bg-panel p-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-medium text-fg">Something went wrong</h1>
            <p className="text-base text-muted">
              The page hit an error it could not recover from. Try again, or head back to the start.
            </p>
            {error.digest && <p className="font-mono text-xs text-dim">Reference {error.digest}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => retry()}>
              Try again
            </Button>
            <Button href="/" variant="secondary">
              Go home
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

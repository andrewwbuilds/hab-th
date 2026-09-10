import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { Wordmark } from "@/components/shell";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-[360px] max-w-full flex-col gap-4">
        <Wordmark size="md" className="self-center" />
        <div className="flex flex-col gap-4 rounded-panel border border-border bg-panel p-5">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs text-dim">404</p>
            <h1 className="text-lg font-medium text-fg">Page not found</h1>
            <p className="text-base text-muted">
              Nothing lives at this address. It may have moved, or the link may be wrong.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button href="/" variant="primary">
              Go home
            </Button>
            <Button href="/sign-in" variant="secondary">
              Sign in
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

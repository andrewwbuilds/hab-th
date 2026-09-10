import Link from "next/link";
import { Wordmark } from "@/components/shell";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-[360px] max-w-full flex-col gap-4">
        <Link href="/" className="self-center rounded-control">
          <Wordmark size="md" />
        </Link>
        <div className="rounded-panel border border-border bg-panel p-5">{children}</div>
      </div>
    </main>
  );
}

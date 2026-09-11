import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/shell";
import { ToastProvider } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider placement="bottom-right">
      <main className="grid min-h-screen flex-1 lg:h-screen lg:grid-cols-2 lg:grid-rows-1 lg:overflow-hidden">
        <div className="flex min-h-screen flex-col px-6 py-6 [scrollbar-width:thin] sm:px-10 lg:min-h-0 lg:overflow-y-auto lg:px-14 lg:py-4">
          <Link href="/" className="self-start rounded-control">
            <Wordmark size="md" />
          </Link>
          <div className="flex flex-1 items-center justify-center py-8 lg:py-[clamp(0.25rem,2.5dvh,1.5rem)]">
            <div className="w-full max-w-[480px]">{children}</div>
          </div>
          <p className="text-sm text-dim">CalHacks · Fall 2026</p>
        </div>

        <div className="relative hidden lg:flex lg:h-screen lg:items-center lg:justify-center lg:py-3 lg:pl-3 lg:pr-12">
          <figure className="relative h-full w-full overflow-hidden rounded-panel border border-border bg-[#171b32]">
            <Image
              src="/art/encore-palace.png"
              alt="Eddy, Gary, and Eric building a project together on the steps of the Palace of Fine Arts, drawn in pixel art."
              fill
              priority
              sizes="50vw"
              className="object-cover [image-rendering:pixelated]"
              style={{ objectPosition: "80% 62%" }}
            />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-[#08090a]/90 via-[#08090a]/10 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-8 [@media(max-height:760px)]:p-6">
              <span className="font-mono text-xs tracking-wide text-muted">Palace of Fine Arts, San Francisco</span>
            </figcaption>
          </figure>
        </div>
      </main>
    </ToastProvider>
  );
}

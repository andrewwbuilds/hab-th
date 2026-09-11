import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/shell";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-screen flex-1 lg:h-screen lg:grid-cols-2 lg:grid-rows-1 lg:overflow-hidden">
      <div className="flex min-h-screen flex-col px-6 py-6 [scrollbar-width:thin] sm:px-10 lg:min-h-0 lg:overflow-y-auto lg:px-14 lg:py-5">
        <Link href="/" className="self-start rounded-control">
          <Wordmark size="md" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-12 lg:py-[clamp(0.5rem,4dvh,2rem)]">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
        <p className="text-sm text-dim">Hackathon at Berkeley · Fall 2026</p>
      </div>

      <div className="relative hidden lg:block lg:h-screen lg:py-3 lg:pr-3">
        <figure className="relative h-full overflow-hidden rounded-panel border border-border bg-[#171b32]">
          <div className="absolute inset-x-0 top-0 h-[88%] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
            <Image
              src="/art/encore-palace.png"
              alt="Eddy, Gary, and Eric building a project together on the steps of the Palace of Fine Arts, drawn in pixel art."
              fill
              priority
              sizes="50vw"
              className="object-cover [image-rendering:pixelated]"
              style={{ objectPosition: "66% 0%" }}
            />
          </div>
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-[#08090a]/90 via-[#08090a]/10 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 p-8 [@media(max-height:760px)]:gap-3 [@media(max-height:760px)]:p-6">
            <p className="max-w-[340px] rounded-panel border border-[#6b719a] bg-[#171923]/95 px-4 py-3 text-md text-fg">
              <span className="mb-1 block text-sm font-medium text-[#adb5ff]">Eric</span>
              One question at a time. I’ll help you through it.
            </p>
            <span className="font-mono text-xs tracking-wide text-muted">Palace of Fine Arts, San Francisco</span>
          </figcaption>
        </figure>
      </div>
    </main>
  );
}

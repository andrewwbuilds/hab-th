import { cn } from "@/components/ui/cn";

export interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const textClass: Record<NonNullable<WordmarkProps["size"]>, string> = {
  sm: "text-base",
  md: "text-md",
  lg: "text-xl",
};

const glyphSize: Record<NonNullable<WordmarkProps["size"]>, number> = {
  sm: 16,
  md: 18,
  lg: 24,
};

export function WordmarkGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={cn("shrink-0 text-accent", className)}
    >
      <rect x="1" y="1" width="14" height="14" rx="3.5" fill="currentColor" fillOpacity="0.18" />
      <rect x="4" y="6" width="2" height="4" rx="1" fill="currentColor" />
      <rect x="7" y="3.5" width="2" height="9" rx="1" fill="currentColor" />
      <rect x="10" y="5" width="2" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = "sm", className }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold tracking-[-0.01em] text-fg", textClass[size], className)}>
      <WordmarkGlyph size={glyphSize[size]} />
      Encore
    </span>
  );
}

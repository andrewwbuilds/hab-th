import { cn } from "./cn";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-5 text-[9px]",
  md: "size-6 text-[10px]",
  lg: "size-8 text-xs",
};

const HUES = [232, 262, 292, 190, 160, 20, 350, 40];

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function hueFor(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const hue = hueFor(name);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium leading-none",
        sizeClass[size],
        className,
      )}
      style={{ background: `hsl(${hue} 32% 26%)`, color: `hsl(${hue} 60% 86%)` }}
    >
      {initialsFor(name)}
    </span>
  );
}

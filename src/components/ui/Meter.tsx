import { cn } from "./cn";

export interface MeterProps {
  value: number;
  max?: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function Meter({ value, max = 5, label, size = "md", className }: MeterProps) {
  const dots = Array.from({ length: max }, (_, index) => index < value);
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("inline-flex items-center", size === "sm" ? "gap-0.5" : "gap-1", className)}
    >
      {dots.map((filled, index) => (
        <span
          key={index}
          className={cn(
            "rounded-full",
            size === "sm" ? "size-1.5" : "size-2",
            filled ? "bg-accent" : "bg-border-strong",
          )}
        />
      ))}
    </span>
  );
}

import { cn } from "./cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, showValue, className }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{label}</span>
          {showValue && <span className="tabular-nums text-muted">{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-1 w-full overflow-hidden rounded-full bg-active"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out-quick"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

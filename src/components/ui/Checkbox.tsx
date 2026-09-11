import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "./cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label?: ReactNode;
  hint?: ReactNode;
}

export function Checkbox({ label, hint, className, ...rest }: CheckboxProps) {
  return (
    <label
      className={cn(
        "group relative inline-flex items-start gap-2 cursor-pointer select-none",
        rest.disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input type="checkbox" {...rest} className="peer sr-only" />
      <span
        aria-hidden
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-panel text-white transition-colors duration-120 ease-out-quick group-hover:border-[#35363b] peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-1 [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      {(label || hint) && (
        <span className="flex flex-col">
          {label && <span className="text-base text-fg">{label}</span>}
          {hint && <span className="text-sm text-muted">{hint}</span>}
        </span>
      )}
    </label>
  );
}

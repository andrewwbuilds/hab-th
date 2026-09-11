import type { ReactNode } from "react";
import { cn } from "./cn";

export interface RadioOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  variant?: "cards" | "pills";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  columns?: 1 | 2 | 3 | 4;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const columnsClass: Record<NonNullable<RadioGroupProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function RadioGroup({
  name,
  options,
  variant = "cards",
  value,
  defaultValue,
  onChange,
  columns = 2,
  required,
  disabled,
  className,
  ...aria
}: RadioGroupProps) {
  const pills = variant === "pills";
  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      className={cn(pills ? "flex flex-wrap gap-1.5" : cn("grid gap-2", columnsClass[columns]), className)}
    >
      {options.map((option) => {
        const isDisabled = disabled || option.disabled;
        return (
          <label
            key={option.value}
            className={cn(
              "group relative cursor-pointer select-none border transition-colors duration-120 ease-out-quick has-checked:border-accent has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-1",
              pills
                ? "inline-flex h-7 items-center gap-1.5 rounded-control border-border-strong bg-panel px-3 text-base text-muted hover:border-[#35363b] hover:text-fg has-checked:bg-accent-soft has-checked:text-fg"
                : "flex items-start gap-2.5 rounded-control border-border bg-panel px-3 py-2.5 hover:border-border-strong has-checked:bg-accent-soft",
              isDisabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === undefined ? undefined : value === option.value}
              defaultChecked={defaultValue === undefined ? undefined : defaultValue === option.value}
              onChange={onChange ? () => onChange(option.value) : undefined}
              required={required}
              disabled={isDisabled}
              className="peer sr-only"
            />
            {!pills && (
              <span
                aria-hidden
                className="mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-transparent transition-colors duration-120 ease-out-quick peer-checked:border-accent [&>span]:opacity-0 peer-checked:[&>span]:opacity-100"
              >
                <span className="size-1.5 rounded-full bg-accent" />
              </span>
            )}
            {option.icon && <span className="shrink-0 text-muted [&_svg]:size-4">{option.icon}</span>}
            <span className="flex min-w-0 flex-col">
              <span className={cn("text-base", !pills && "font-medium text-fg")}>{option.label}</span>
              {option.hint && !pills && <span className="text-sm text-muted">{option.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

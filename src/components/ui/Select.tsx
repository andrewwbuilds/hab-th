import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { controlClass } from "./Input";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: "sm" | "md";
  invalid?: boolean;
  options?: SelectOption[];
  placeholder?: string;
}

export function Select({ size = "sm", invalid, options, placeholder, className, children, ...rest }: SelectProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <select
        {...rest}
        aria-invalid={invalid || rest["aria-invalid"] || undefined}
        className={cn(
          controlClass,
          "appearance-none pr-7 cursor-pointer",
          size === "sm" ? "h-7 pl-2" : "h-8 pl-2.5",
        )}
      >
        {placeholder !== undefined && (
          <option value="" disabled={rest.required}>
            {placeholder}
          </option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md";
  invalid?: boolean;
}

export const controlClass =
  "w-full appearance-none rounded-control border border-border-strong bg-panel text-base text-fg placeholder:text-dim transition-colors duration-120 ease-out-quick hover:border-[#35363b] focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-danger";

export function Input({ size = "sm", invalid, className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || rest["aria-invalid"] || undefined}
      className={cn(controlClass, size === "sm" ? "h-7 px-2" : "h-8 px-2.5", className)}
    />
  );
}

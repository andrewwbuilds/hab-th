import type { ReactNode } from "react";
import { cn } from "./cn";

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  inline?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, htmlFor, required, optional, inline, className, children }: FieldProps) {
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("flex", inline ? "items-center gap-3" : "flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className={cn("text-sm font-medium text-fg", inline && "w-40 shrink-0")}>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
          )}
          {optional && <span className="ml-1.5 font-normal text-dim">Optional</span>}
        </label>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {children}
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : (
          hint && <p className="text-sm text-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}

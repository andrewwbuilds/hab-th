"use client";

import { useCallback, useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { controlClass } from "./Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  minRows?: number;
  maxRows?: number;
}

const LINE_HEIGHT = 20;
const VERTICAL_PADDING = 12;

export function Textarea({ invalid, minRows = 3, maxRows = 16, className, onInput, ...rest }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const min = minRows * LINE_HEIGHT + VERTICAL_PADDING;
    const max = maxRows * LINE_HEIGHT + VERTICAL_PADDING;
    const next = Math.min(Math.max(el.scrollHeight, min), max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [minRows, maxRows]);

  useEffect(() => {
    resize();
  }, [resize, rest.value, rest.defaultValue]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      {...rest}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      aria-invalid={invalid || rest["aria-invalid"] || undefined}
      className={cn(controlClass, "resize-none px-2 py-1.5 leading-5", className)}
    />
  );
}

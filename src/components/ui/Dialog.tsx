"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}

const sizeClass: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "w-[400px]",
  md: "w-[520px]",
  lg: "w-[680px]",
};

export function Dialog({ open, onClose, title, description, footer, size = "md", className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-w-[calc(100vw-32px)] rounded-panel border border-border-strong bg-panel p-0 text-fg shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop:bg-black/60",
        sizeClass[size],
        className,
      )}
    >
      {open && (
        <div className="flex flex-col">
          <header className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium leading-[22px]">{title}</h2>
              {description && <p className="text-base text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 flex size-6 items-center justify-center rounded-control text-muted transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </header>
          {children && <div className="px-4 pb-4">{children}</div>}
          {footer && (
            <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}

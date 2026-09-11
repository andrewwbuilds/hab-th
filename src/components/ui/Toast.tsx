"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "./cn";

export type ToastVariant = "default" | "success" | "error";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3000;

const variantIcon: Record<ToastVariant, ReactNode> = {
  default: <Info className="size-4 text-muted" />,
  success: <CircleCheck className="size-4 text-success" />,
  error: <CircleAlert className="size-4 text-danger" />,
};

export type ToastPlacement = "bottom-left" | "bottom-right";

const placementClass: Record<ToastPlacement, string> = {
  "bottom-left": "left-4",
  "bottom-right": "right-4",
};

export function ToastProvider({
  children,
  placement = "bottom-left",
}: {
  children: ReactNode;
  placement?: ToastPlacement;
}) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...options, id }]);
      const duration = options.duration ?? DEFAULT_DURATION;
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed bottom-4 z-50 flex w-[320px] flex-col gap-2",
          placementClass[placement],
        )}
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-start gap-2.5 rounded-panel border border-border-strong bg-panel px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          >
            <span className="mt-0.5 shrink-0">{variantIcon[item.variant ?? "default"]}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-medium text-fg">{item.title}</span>
              {item.description && <span className="text-sm text-muted">{item.description}</span>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(item.id)}
              className={cn(
                "-mr-1 -mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-control text-dim transition-colors duration-120 ease-out-quick hover:bg-hover hover:text-fg",
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
  maxHeight?: string;
}

export function Table({ wrapperClassName, maxHeight, className, ...rest }: TableProps) {
  return (
    <div className={cn("relative w-full overflow-auto", wrapperClassName)} style={maxHeight ? { maxHeight } : undefined}>
      <table {...rest} className={cn("w-full border-collapse text-base text-fg", className)} />
    </div>
  );
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...rest} className={cn("sticky top-0 z-10 bg-bg", className)} />;
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...rest} className={className} />;
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  interactive?: boolean;
}

export function TR({ selected, interactive, className, ...rest }: TRProps) {
  return (
    <tr
      {...rest}
      data-selected={selected || undefined}
      className={cn(
        "h-8 border-b border-border transition-colors duration-120 ease-out-quick",
        "[thead_&]:hover:bg-transparent hover:bg-hover data-selected:bg-active",
        interactive && "cursor-pointer",
        className,
      )}
    />
  );
}

export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
}

export function TH({ align = "left", className, ...rest }: THProps) {
  return (
    <th
      scope="col"
      {...rest}
      className={cn(
        "h-8 whitespace-nowrap border-b border-border px-3 text-sm font-medium text-muted",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    />
  );
}

export interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  muted?: boolean;
}

export function TD({ align = "left", muted, className, ...rest }: TDProps) {
  return (
    <td
      {...rest}
      className={cn(
        "h-8 whitespace-nowrap px-3 py-0 align-middle",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        muted && "text-muted",
        className,
      )}
    />
  );
}

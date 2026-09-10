import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type NativeButtonProps = StyleProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type LinkButtonProps = StyleProps & {
  href: string;
  disabled?: boolean;
  target?: string;
  rel?: string;
  title?: string;
  "aria-label"?: string;
};

export type ButtonProps = NativeButtonProps | LinkButtonProps;

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border-accent hover:bg-accent-hover hover:border-accent-hover disabled:hover:bg-accent disabled:hover:border-accent",
  secondary:
    "bg-panel text-fg border-border-strong hover:bg-hover hover:border-[#35363b] disabled:hover:bg-panel disabled:hover:border-border-strong",
  ghost: "bg-transparent text-muted border-transparent hover:bg-hover hover:text-fg",
  danger:
    "bg-transparent text-danger border-border-strong hover:bg-[rgba(235,87,87,0.12)] hover:border-danger",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 gap-1.5",
  md: "h-8 px-3 gap-2",
};

const baseClass =
  "inline-flex items-center justify-center whitespace-nowrap rounded-control border text-base font-medium leading-none select-none transition-colors duration-120 ease-out-quick disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0";

function classesFor({ variant = "secondary", size = "sm", className }: StyleProps): string {
  return cn(baseClass, variantClass[variant], sizeClass[size], className);
}

function Content({ loading, icon, children }: Pick<StyleProps, "loading" | "icon" | "children">) {
  return (
    <>
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </>
  );
}

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { href, disabled, target, rel, title, loading, icon, children, ...style } = props;
    const inert = disabled || loading;
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        title={title}
        aria-label={props["aria-label"]}
        aria-disabled={inert || undefined}
        className={cn(classesFor(style), inert && "pointer-events-none opacity-50")}
      >
        <Content loading={loading} icon={icon}>
          {children}
        </Content>
      </Link>
    );
  }

  const { variant, size, className, loading, icon, children, type = "button", ...rest } = props;
  return (
    <button
      type={type}
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={classesFor({ variant, size, className })}
    >
      <Content loading={loading} icon={icon}>
        {children}
      </Content>
    </button>
  );
}

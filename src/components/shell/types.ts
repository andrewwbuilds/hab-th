import type { LucideIcon } from "lucide-react";
import type { IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName | LucideIcon;
  badge?: string | number;
  exact?: boolean;
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface Command {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  group?: string;
  href?: string;
  onSelect?: () => void;
}

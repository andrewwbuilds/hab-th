import type { Command, NavItem } from "@/components/shell";
import { TRACKS, TRACK_LABEL } from "@/lib/types";

export const ORG_WORKSPACE = { name: "Encore", hint: "Organizers" };

export const ORG_NAV: NavItem[] = [
  { href: "/org", label: "Overview", icon: "dashboard", exact: true },
  { href: "/org/applications", label: "Applications", icon: "inbox" },
  { href: "/org/applications?status=submitted", label: "Needs review", icon: "clock", exact: true },
  { href: "/org/applications?status=under_review", label: "In review", icon: "checklist", exact: true },
  { href: "/org/applications?decided=1", label: "Decided", icon: "award", exact: true },
  ...TRACKS.map(
    (track): NavItem => ({
      href: `/org/applications?track=${track}`,
      label: TRACK_LABEL[track],
      icon: "users",
      exact: true,
    }),
  ),
];

export const ORG_COMMANDS: Command[] = [
  { id: "view-needs-review", label: "Needs review", hint: "Submitted, nobody has opened it", group: "Views", href: "/org/applications?status=submitted" },
  { id: "view-in-review", label: "In review", hint: "Opened by a reviewer", group: "Views", href: "/org/applications?status=under_review" },
  { id: "view-decided", label: "Decided", hint: "Accepted, waitlisted or rejected", group: "Views", href: "/org/applications?decided=1" },
  { id: "view-drafts", label: "Drafts", hint: "Not submitted yet", group: "Views", href: "/org/applications?status=draft" },
  ...TRACKS.map(
    (track): Command => ({
      id: `track-${track}`,
      label: `${TRACK_LABEL[track]} applications`,
      group: "Tracks",
      href: `/org/applications?track=${track}`,
    }),
  ),
];

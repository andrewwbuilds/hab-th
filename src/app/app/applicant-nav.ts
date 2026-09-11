import type { IconName, NavItem } from "@/components/shell";
import type { MyApplication } from "@/lib/data/types";
import { STATUS_LABEL, TRACKS, TRACK_LABEL, type Status, type Track } from "@/lib/types";

export const TRACK_ICON: Record<Track, IconName> = {
  hacker: "sparkles",
  judge: "gavel",
  mentor: "graduation",
  volunteer: "handshake",
};

export type TrackAction = "start" | "continue" | "view";

export function trackHref(track: Track, application: MyApplication | undefined): string {
  return application && application.status !== "draft" ? `/app/status/${track}` : `/app/apply/${track}`;
}

export function trackAction(application: MyApplication | undefined): TrackAction {
  if (!application) return "start";
  return application.status === "draft" ? "continue" : "view";
}

export const TRACK_ACTION_LABEL: Record<TrackAction, string> = {
  start: "Start",
  continue: "Continue",
  view: "View",
};

export function applicationsByTrack(applications: MyApplication[]): Map<Track, MyApplication> {
  return new Map(applications.map((application) => [application.track, application]));
}

/** Only tracks the applicant has started. New tracks begin from the home page, not the sidebar. */
export function trackNavItems(applications: MyApplication[]): NavItem[] {
  const byTrack = applicationsByTrack(applications);
  return TRACKS.flatMap((track) => {
    const application = byTrack.get(track);
    if (!application) return [];
    return [
      {
        href: trackHref(track, application),
        label: `${TRACK_LABEL[track]} application`,
        icon: TRACK_ICON[track],
        badge: STATUS_LABEL[application.status],
      },
    ];
  });
}

const STATUS_PRIORITY: Status[] = ["accepted", "rejected", "waitlisted", "under_review", "submitted", "draft"];

/** The status the Roadie should react to on the home screen: decisions first, then anything in flight. */
export function headlineStatus(applications: MyApplication[]): Status | undefined {
  for (const status of STATUS_PRIORITY) {
    if (applications.some((application) => application.status === status)) return status;
  }
  return undefined;
}

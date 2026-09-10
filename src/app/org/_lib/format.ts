const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateWithYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function relativeTime(iso: string, now = Date.now()): string {
  let duration = (new Date(iso).getTime() - now) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relative.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return relative.format(Math.round(duration), "year");
}

export function shortDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() ? dateOnly.format(date) : dateWithYear.format(date);
}

export function dateTimeLabel(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function scoreLabel(value: number | null): string {
  return value === null ? "No scores" : `${value.toFixed(1)} / 5`;
}

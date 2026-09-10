import { listApplications } from "@/lib/data/applications";
import type { AdjacentIds, ApplicationFilters, ApplicationListItem, ApplicationSort } from "@/lib/data/types";
import { DECISIONS, isStatus, isTrack } from "@/lib/types";

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ListQuery extends ApplicationFilters {
  decided: boolean;
}

const SORTS: ApplicationSort[] = ["newest", "oldest", "name", "score", "status"];

export const SORT_LABEL: Record<ApplicationSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name",
  score: "Highest score",
  status: "Status",
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseListQuery(params: SearchParams): ListQuery {
  const track = first(params.track);
  const status = first(params.status);
  const sort = first(params.sort);
  const q = first(params.q).trim().slice(0, 100);
  return {
    track: isTrack(track) ? track : undefined,
    status: isStatus(status) ? status : undefined,
    sort: (SORTS as string[]).includes(sort) ? (sort as ApplicationSort) : undefined,
    q: q || undefined,
    decided: first(params.decided) === "1",
  };
}

export function listQueryString(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.track) params.set("track", query.track);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.sort) params.set("sort", query.sort);
  if (query.decided) params.set("decided", "1");
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function listHref(query: ListQuery): string {
  return `/org/applications${listQueryString(query)}`;
}

export function detailHref(id: string, query: ListQuery): string {
  return `/org/applications/${id}${listQueryString(query)}`;
}

/** Applications in display order: submitted work first, drafts at the bottom. */
export async function listOrgApplications(query: ListQuery): Promise<ApplicationListItem[]> {
  const { decided, ...filters } = query;
  const items = await listApplications(filters);
  const visible = decided ? items.filter((item) => (DECISIONS as readonly string[]).includes(item.status)) : items;
  return [...visible.filter((item) => item.status !== "draft"), ...visible.filter((item) => item.status === "draft")];
}

export function adjacentIn(items: ApplicationListItem[], id: string): AdjacentIds {
  const index = items.findIndex((item) => item.id === id);
  return {
    prevId: index > 0 ? items[index - 1].id : null,
    nextId: index >= 0 && index < items.length - 1 ? items[index + 1].id : null,
    index,
    total: items.length,
  };
}

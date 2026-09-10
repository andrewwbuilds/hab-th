"use client";

import { useRouter } from "next/navigation";
import { Input, Kbd, Select } from "@/components/ui";
import { STATUSES, STATUS_LABEL, TRACKS, TRACK_LABEL } from "@/lib/types";
import { listHref, SORT_LABEL, type ListQuery } from "./_lib/query";

export const SEARCH_INPUT_ID = "org-search";

interface FiltersBarProps {
  query: ListQuery;
  count: number;
}

const trackOptions = [{ value: "", label: "All tracks" }, ...TRACKS.map((track) => ({ value: track, label: TRACK_LABEL[track] }))];
const statusOptions = [
  { value: "", label: "All statuses" },
  ...STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
];
const sortOptions = (Object.keys(SORT_LABEL) as (keyof typeof SORT_LABEL)[]).map((sort) => ({
  value: sort,
  label: SORT_LABEL[sort],
}));

export function FiltersBar({ query, count }: FiltersBarProps) {
  const router = useRouter();

  function apply(next: Partial<ListQuery>) {
    router.push(listHref({ ...query, ...next }));
  }

  return (
    <form
      role="search"
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const q = String(form.get("q") ?? "").trim();
        apply({ q: q || undefined });
      }}
    >
      <span className="whitespace-nowrap text-sm tabular-nums text-muted">
        {count} {count === 1 ? "application" : "applications"}
      </span>
      <div className="relative">
        <Input
          id={SEARCH_INPUT_ID}
          name="q"
          type="search"
          defaultValue={query.q ?? ""}
          placeholder="Search"
          aria-label="Search applications"
          aria-keyshortcuts="/"
          autoComplete="off"
          className="peer w-[180px] pr-8"
          key={query.q ?? ""}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 right-1 peer-focus:hidden peer-not-placeholder-shown:hidden"
        >
          <Kbd>/</Kbd>
        </span>
      </div>
      <Select
        aria-label="Track"
        value={query.track ?? ""}
        options={trackOptions}
        className="w-32"
        onChange={(event) => apply({ track: (event.target.value || undefined) as ListQuery["track"] })}
      />
      <Select
        aria-label="Status"
        value={query.decided ? "" : (query.status ?? "")}
        options={statusOptions}
        className="w-36"
        onChange={(event) => apply({ status: (event.target.value || undefined) as ListQuery["status"], decided: false })}
      />
      <Select
        aria-label="Sort"
        value={query.sort ?? "newest"}
        options={sortOptions}
        className="w-36"
        onChange={(event) => {
          const sort = event.target.value as ListQuery["sort"];
          apply({ sort: sort === "newest" ? undefined : sort });
        }}
      />
    </form>
  );
}

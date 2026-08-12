export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

// Plain function, not a client component — needs to run on the server (in a
// page's data-fetching code) as well as the client (<Pagination>'s own
// href-building). Keeping it out of pagination.tsx matters: that file is
// "use client", and a server component can't call a plain function exported
// from a client module, only render components from it.
export function readPagination(params: Record<string, string | undefined>) {
  const perPageRaw = Number.parseInt(params.perPage ?? "", 10);
  const perPage = PAGE_SIZE_OPTIONS.includes(perPageRaw as (typeof PAGE_SIZE_OPTIONS)[number])
    ? perPageRaw
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return { page, perPage };
}

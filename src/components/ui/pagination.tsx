"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { Spinner } from "@/components/ui/spinner";

// Generic table-footer pagination: "X–Y of Z", a rows-per-page select, and
// prev/next. Reusable across any server-rendered list that reads page/perPage
// off the URL — Items is the first, Stock movements will be the next.
export function Pagination({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function go(nextPage: number, nextPerPage: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(nextPage));
    next.set("perPage", String(nextPerPage));
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline px-4.5 py-2.5">
      <div className="flex items-center gap-3 font-sans text-[13.5px] text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          {pending && <Spinner className="h-3 w-3" />}
          {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
        </span>
        <label className="flex items-center gap-1.5">
          Rows
          <select
            value={perPage}
            onChange={(e) => go(1, Number(e.target.value))}
            disabled={pending}
            className="rounded border border-input-border bg-card py-1.5 pl-1.5 pr-1 font-mono text-[16px] text-ink-secondary disabled:opacity-60 md:py-1 md:text-[12.5px]"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => go(page - 1, perPage)}
          disabled={pending || page <= 1}
          className="flex h-8 cursor-pointer items-center rounded border border-input-border px-2.5 font-sans text-[14px] text-ink-secondary hover:bg-row-hover disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Prev
        </button>
        <span className="min-w-[54px] text-center font-mono text-[12.5px] text-ink-faint">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1, perPage)}
          disabled={pending || page >= totalPages}
          className="flex h-8 cursor-pointer items-center rounded border border-input-border px-2.5 font-sans text-[14px] text-ink-secondary hover:bg-row-hover disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>
    </div>
  );
}

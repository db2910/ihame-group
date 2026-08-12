"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";

// The mock puts a search box in the Items header ("Search SKU or name…").
// Filtering happens server-side off the `q` query param — the catalogue is
// expected to run to a few thousand rows, so shipping it all to the client to
// filter locally would be the wrong trade.
export function ItemsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const applied = params.get("q") ?? "";
  const [value, setValue] = useState(applied);
  const [pending, startTransition] = useTransition();

  // Comparing against the URL rather than tracking "is this the first render"
  // keeps this idempotent: on mount, and on React's dev double-invocation of
  // effects, the typed value already equals what the URL says, so nothing
  // navigates. A ref-based first-render guard silently loses that second case
  // and fires a spurious replace().
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === applied) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      // A new search invalidates whatever page the manager was on — page 3 of
      // an unfiltered list is rarely page 3 of a filtered one.
      next.delete("page");
      const qs = next.toString();
      // Wrapped so `pending` reflects the actual re-render, not just the
      // debounce timer — a spinner while the new list is genuinely loading,
      // not while the manager is still typing.
      startTransition(() => {
        router.replace(qs ? `/items?${qs}` : "/items", { scroll: false });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, applied, params, router]);

  return (
    <div className="focus-ring-brand-within flex h-11 min-w-0 flex-1 items-center gap-2 rounded border border-input-border bg-card px-3.5 md:h-[34px] md:flex-none md:w-[220px]">
      {pending ? (
        <Spinner className="h-3.5 w-3.5 flex-none text-ink-faint" />
      ) : (
        <span aria-hidden="true" className="flex-none font-sans text-[16px] text-ink-faint">
          ⌕
        </span>
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search SKU or name…"
        aria-label="Search items by SKU or name"
        className="min-w-0 flex-1 bg-transparent font-sans text-[16px] text-ink outline-none placeholder:text-ink-faint md:text-[13px]"
      />
    </div>
  );
}

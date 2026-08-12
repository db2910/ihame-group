"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";

// Same debounced, URL-driven, server-refetch pattern as Items' search —
// the catalogue is expected to run to a few thousand rows, so this stays a
// server round trip rather than shipping everything to the client (unlike
// the Sale/POS screen's item grid, which needs zero-latency tap-to-cart and
// has no equivalent here since this screen has no cart).
export function StockLookupSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const applied = params.get("q") ?? "";
  const [value, setValue] = useState(applied);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === applied) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `/sale/stock-lookup?${qs}` : "/sale/stock-lookup", { scroll: false });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, applied, params, router]);

  return (
    <div className="focus-ring-brand-within flex h-11 flex-none items-center gap-2.5 rounded border border-input-border bg-card px-3.5 md:h-[34px]">
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
        placeholder="Search item, SKU or scan barcode…"
        aria-label="Search items by name, SKU or barcode"
        className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink outline-none placeholder:text-ink-faint md:text-[14px]"
      />
    </div>
  );
}

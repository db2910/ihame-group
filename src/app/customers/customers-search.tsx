"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";

// Same debounced, URL-driven, server-refetch pattern as Items' search — a
// customer base expected to run into the hundreds shouldn't be shipped to
// the client whole just to filter it locally.
export function CustomersSearch() {
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
        router.replace(qs ? `/customers?${qs}` : "/customers", { scroll: false });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, applied, params, router]);

  return (
    <div className="focus-ring-brand-within flex h-11 min-w-0 flex-1 items-center gap-2 rounded border border-input-border bg-card px-3.5 md:h-[34px] md:w-[240px] md:flex-none">
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
        placeholder="Search name, code, phone or email…"
        aria-label="Search customers by name, code, phone or email"
        className="min-w-0 flex-1 bg-transparent font-sans text-[16px] text-ink outline-none placeholder:text-ink-faint md:text-[13px]"
      />
    </div>
  );
}

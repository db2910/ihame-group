"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";

// URL-driven month stepper (?year=&month=), same shape as every other
// filter control in this app (e.g. AllOrdersFilters) — state lives in the
// URL so the export links and the page's own data fetch always agree on
// exactly which month is showing.
export function PeriodPicker({ year, month, label }: { year: number; month: number; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(deltaMonths: number) {
    const d = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
    const next = new URLSearchParams(params.toString());
    next.set("year", String(d.getUTCFullYear()));
    next.set("month", String(d.getUTCMonth() + 1));
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex h-11 flex-none items-center gap-1 rounded border border-input-border bg-card px-1.5 md:h-[34px]">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous month"
        className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded font-sans text-[15px] text-ink-secondary hover:bg-row-hover md:h-6 md:w-6"
      >
        ‹
      </button>
      <span className="flex min-w-[92px] flex-none items-center justify-center gap-1.5 font-sans text-[13px] text-ink">
        {pending && <Spinner className="h-3 w-3 text-ink-faint" />}
        {label}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next month"
        className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded font-sans text-[15px] text-ink-secondary hover:bg-row-hover md:h-6 md:w-6"
      >
        ›
      </button>
    </div>
  );
}

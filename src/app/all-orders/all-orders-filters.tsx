"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { STATUS_LABEL } from "@/app/orders/format";
import type { Destination, OrderStatus } from "@/generated/prisma/enums";

const STATUSES: (OrderStatus | "all")[] = [
  "all",
  "draft",
  "submitted",
  "in_transit",
  "arrived",
  "delivered",
  "cancelled",
];
const DESTINATIONS: Destination[] = ["kigali", "goma", "bukavu"];

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

// One component owns every filter (status/destination/staff/date range/
// search) so switching one never drops the others — the freight staff
// OrdersStatusBar/OrdersSearch pair does that (each only knows its own
// param), which is fine with one filter but compounds badly with five.
export function AllOrdersFilters({ staffOptions }: { staffOptions: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const appliedQ = params.get("q") ?? "";
  const [q, setQ] = useState(appliedQ);
  const status = params.get("status") ?? "all";
  const destination = params.get("dest") ?? "all";
  const staff = params.get("staff") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === appliedQ) return;
    const timer = setTimeout(() => setParam("q", trimmed), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-2.5 border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setParam("status", s)}
            className={`flex h-9 flex-none items-center rounded-full border px-3.5 font-sans text-[12.5px] font-medium md:h-[28px] md:px-3.5 ${
              status === s
                ? "border-brand bg-brand text-white"
                : "border-input-border bg-card text-ink-muted hover:bg-row-hover"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="focus-ring-brand-within flex h-11 min-w-0 flex-1 items-center gap-2 rounded border border-input-border bg-card px-3.5 md:h-[34px] md:w-[220px] md:flex-none">
          {pending ? (
            <Spinner className="h-3.5 w-3.5 flex-none text-ink-faint" />
          ) : (
            <span aria-hidden="true" className="flex-none font-sans text-[16px] text-ink-faint">
              ⌕
            </span>
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order no, customer or goods…"
            aria-label="Search all orders by order number, customer or goods"
            className="min-w-0 flex-1 bg-transparent font-sans text-[16px] text-ink outline-none placeholder:text-ink-faint md:text-[13px]"
          />
        </div>

        <select
          value={destination}
          onChange={(e) => setParam("dest", e.target.value)}
          aria-label="Filter by destination"
          className="h-11 flex-none rounded border border-input-border bg-card px-2.5 font-sans text-[14px] text-ink-secondary md:h-[34px] md:text-[13px]"
        >
          <option value="all">All destinations</option>
          {DESTINATIONS.map((d) => (
            <option key={d} value={d}>
              {titleCase(d)}
            </option>
          ))}
        </select>

        <select
          value={staff}
          onChange={(e) => setParam("staff", e.target.value)}
          aria-label="Filter by staff member"
          className="h-11 flex-none rounded border border-input-border bg-card px-2.5 font-sans text-[14px] text-ink-secondary md:h-[34px] md:text-[13px]"
        >
          <option value="all">All staff</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={(e) => setParam("from", e.target.value)}
            aria-label="Created from"
            className="h-11 flex-none rounded border border-input-border bg-card px-2.5 font-mono text-[13px] text-ink-secondary md:h-[34px]"
          />
          <span className="font-sans text-[12.5px] text-ink-faint">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setParam("to", e.target.value)}
            aria-label="Created to"
            className="h-11 flex-none rounded border border-input-border bg-card px-2.5 font-mono text-[13px] text-ink-secondary md:h-[34px]"
          />
        </div>
      </div>
    </div>
  );
}

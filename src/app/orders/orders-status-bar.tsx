import Link from "next/link";
import type { OrderStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL } from "./format";

export type OrdersStatusFilter = "all" | OrderStatus;

const FILTERS: OrdersStatusFilter[] = [
  "all",
  "draft",
  "submitted",
  "in_transit",
  "arrived",
  "delivered",
  "cancelled",
];

// Spec §6.9 "My orders — list, filter by status". Server-rendered: pure
// navigation via <Link>, same pattern as items' ItemsStatusBar.
export function OrdersStatusBar({ status }: { status: OrdersStatusFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
      {FILTERS.map((f) => (
        <Link
          key={f}
          href={f === "all" ? "/orders" : `/orders?status=${f}`}
          className={`flex h-9 flex-none items-center rounded-full border px-3.5 font-sans text-[12.5px] font-medium md:h-[28px] md:px-3.5 ${
            status === f
              ? "border-brand bg-brand text-white"
              : "border-input-border bg-card text-ink-muted hover:bg-row-hover"
          }`}
        >
          {f === "all" ? "All" : STATUS_LABEL[f]}
        </Link>
      ))}
    </div>
  );
}

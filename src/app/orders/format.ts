import type { OrderStatus } from "@/generated/prisma/enums";

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Compact form for the dark totals card, which shows whole figures
// ("$14,800") rather than 2-decimal accounting values.
export function formatMoneyShort(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_transit: "In transit",
  arrived: "Arrived",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Tinted pill per status, taken straight from the design mock's own `pill`
// map. The mock's hex values already match this project's theme tokens
// (brand #2875B4, warn #B45309, success #4C7A24, delivered #3D6B1F), so the
// foregrounds use the tokens and only the low-alpha backgrounds are literal.
// `cancelled` isn't in the mock — it follows the same construction against
// the existing alert token.
export const STATUS_PILL: Record<OrderStatus, string> = {
  draft: "bg-[#EEF0F2] text-ink-muted",
  submitted: "bg-brand/12 text-brand",
  in_transit: "bg-[#FDF0E0] text-warn",
  arrived: "bg-accent/16 text-success",
  delivered: "bg-[#E7F0E0] text-delivered",
  cancelled: "bg-warning-bg text-alert",
};

// Phase 5: manager-only forward lifecycle, one step at a time — "post-submit"
// per the backlog, so draft has no entry (that's the staff submit flow) and
// delivered/cancelled are terminal (no entry — nothing follows them). Shared
// between the server action (orders/actions.ts, which enforces it) and the
// status-control UI (which only ever offers what the action would accept) so
// the two can't drift apart.
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  submitted: "in_transit",
  in_transit: "arrived",
  arrived: "delivered",
};

// A cancellation past "arrived" would be reversing a shipment that already
// made it — cancel is for orders that didn't complete, not ones un-doing a
// delivered success.
export const CANCELLABLE_STATUSES: OrderStatus[] = ["submitted", "in_transit", "arrived"];

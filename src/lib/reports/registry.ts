// Single source of truth for the 12 reports (§6.5, as pixel-mocked in
// "IHAME Login and Dashboard.dc.html"'s `reportGroups`, and amended by the
// two scope decisions in backlog.md's Phase 6 section — the mock's own list
// is treated as ground truth over the spec prose backlog.md had transcribed
// before anyone had actually opened this part of the mock; the two lists
// disagreed on one entry ("Sales per staff member" duplicated under Shop).
// Used by both the landing page (the group grid's "OPEN →" links) and the
// report detail page (title/description lookup by key) so the two can't
// drift apart.

export type ReportGroupKey = "freight" | "shop" | "combined";

export type ReportKey =
  | "orders-per-month"
  | "outstanding-balances"
  | "orders-per-staff"
  | "avg-transit-time"
  | "top-customers"
  | "daily-monthly-sales"
  | "overall-profit"
  | "slow-movers"
  | "under-price-sales"
  | "monthly-summary"
  | "sales-per-staff"
  | "exchange-rate-impact";

export type ReportMeta = {
  key: ReportKey;
  group: ReportGroupKey;
  name: string;
  description: string;
  // Whether the report respects the page's month picker, or is inherently
  // point-in-time/all-time (e.g. "who currently owes us money" doesn't reset
  // every month) — the detail page uses this to decide whether to show the
  // period control at all.
  periodScoped: boolean;
};

export const REPORTS: ReportMeta[] = [
  { key: "orders-per-month", group: "freight", name: "Orders per month", description: "count and value", periodScoped: false },
  { key: "outstanding-balances", group: "freight", name: "Outstanding balances", description: "by customer", periodScoped: false },
  { key: "orders-per-staff", group: "freight", name: "Orders per staff member", description: "volume and value", periodScoped: true },
  { key: "avg-transit-time", group: "freight", name: "Average transit time", description: "departure → arrival, by destination", periodScoped: false },
  { key: "top-customers", group: "freight", name: "Top customers", description: "by order value", periodScoped: false },

  { key: "daily-monthly-sales", group: "shop", name: "Daily & monthly sales", description: "revenue and count", periodScoped: true },
  { key: "overall-profit", group: "shop", name: "Overall profit", description: "revenue − purchases, cash-basis", periodScoped: true },
  { key: "slow-movers", group: "shop", name: "Slow movers", description: "no sale in 60 days", periodScoped: false },
  { key: "under-price-sales", group: "shop", name: "Under-price sales", description: "sold below sell price", periodScoped: true },

  { key: "monthly-summary", group: "combined", name: "Monthly summary", description: "revenue per module, cash in, receivables", periodScoped: true },
  { key: "sales-per-staff", group: "combined", name: "Sales per staff member", description: "both modules", periodScoped: true },
  { key: "exchange-rate-impact", group: "combined", name: "Exchange rate impact", description: "per-payment recorded rates", periodScoped: true },
];

export const GROUP_LABEL: Record<ReportGroupKey, string> = { freight: "Freight", shop: "Shop", combined: "Combined" };

export function reportsByGroup(group: ReportGroupKey): ReportMeta[] {
  return REPORTS.filter((r) => r.group === group);
}

export function reportMeta(key: string): ReportMeta | undefined {
  return REPORTS.find((r) => r.key === key);
}

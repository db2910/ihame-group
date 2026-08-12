import Link from "next/link";

export type ItemsStatus = "all" | "low" | "inactive";

function buildHref(base: { q?: string; perPage: number }, status: ItemsStatus) {
  const qs = new URLSearchParams();
  if (base.q) qs.set("q", base.q);
  if (base.perPage !== 10) qs.set("perPage", String(base.perPage));
  if (status !== "all") qs.set("status", status);
  const s = qs.toString();
  return s ? `/items?${s}` : "/items";
}

// Spec doesn't call for either of these — added from the user's own mockup
// (quick status pills) plus a direct request ("a banner ... to show that is
// an emergency" for low stock). Both are server-rendered: pure navigation via
// <Link>, no client state needed.
export function ItemsStatusBar({
  status,
  query,
  perPage,
  lowCount,
}: {
  status: ItemsStatus;
  query?: string;
  perPage: number;
  lowCount: number;
}) {
  const base = { q: query, perPage };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-hairline-2 bg-card px-6.5 py-3">
      <Pill href={buildHref(base, "all")} active={status === "all"} tone="dark">
        All
      </Pill>
      <Pill href={buildHref(base, "low")} active={status === "low"} tone="alert">
        Low stock{lowCount > 0 ? ` · ${lowCount}` : ""}
      </Pill>
      <Pill href={buildHref(base, "inactive")} active={status === "inactive"} tone="neutral">
        Inactive
      </Pill>
    </div>
  );
}

function Pill({
  href,
  active,
  tone,
  children,
}: {
  href: string;
  active: boolean;
  tone: "dark" | "alert" | "neutral";
  children: React.ReactNode;
}) {
  const toneClass = active
    ? tone === "dark"
      ? "border-dark bg-dark text-white"
      : tone === "alert"
        ? "border-alert bg-alert text-white"
        : "border-ink-secondary bg-ink-secondary text-white"
    : tone === "alert"
      ? "border-warning-border text-alert hover:bg-warning-bg"
      : "border-input-border text-ink-secondary hover:bg-row-hover";

  return (
    <Link
      href={href}
      className={`flex h-9 flex-none items-center rounded-full border px-3.5 font-sans text-[13.5px] font-medium md:h-[26px] md:px-3 ${toneClass}`}
    >
      {children}
    </Link>
  );
}

// Prominent, separate from the pills above — the pill communicates "here's a
// filter you can apply"; this communicates "look at this now." Links to the
// same low-stock filter so tapping it doesn't just warn, it acts.
export function LowStockBanner({
  count,
  href,
}: {
  count: number;
  href: string;
}) {
  if (count === 0) return null;

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 border-b border-warning-border bg-warning-bg px-6.5 py-2.5 font-sans text-[14px] text-warning-text hover:bg-warning-bg-hover"
    >
      <span aria-hidden="true" className="flex-none font-semibold text-alert">
        ⚠
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-semibold">
          {count} item{count === 1 ? "" : "s"}
        </span>{" "}
        {count === 1 ? "is" : "are"} at or below reorder level.
      </span>
      <span className="flex-none font-medium text-alert underline decoration-1 underline-offset-2">
        Review
      </span>
    </Link>
  );
}

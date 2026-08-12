import type { ArrivalRow } from "@/lib/order-metrics";

// Month-first ("AUG 04"), matching the mock's arrivals card specifically —
// deliberately different from the order-detail history stamp's day-first
// format, which is what the mock itself does too.
const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

export function ArrivalsCard({ arrivals }: { arrivals: ArrivalRow[] }) {
  return (
    <div className="rounded-[5px] border border-border bg-card p-4.5">
      <div className="font-sans text-[13.5px] font-semibold text-ink">Arrivals · next 14 days</div>
      <div className="mt-3 flex flex-col gap-2.5">
        {arrivals.length === 0 && (
          <div className="font-sans text-[12.5px] text-ink-faint">Nothing due in the next 14 days.</div>
        )}
        {arrivals.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5">
            <div className="w-[46px] flex-none font-mono text-[11px] font-medium text-brand">
              {dayLabel.format(a.eta).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-sans text-[13px] leading-[1.3] text-ink">
                {a.description ?? "—"} · {a.orderNo}
              </div>
              <div className="truncate font-sans text-[11.5px] leading-[1.3] text-ink-faint">
                {a.destination ? titleCase(a.destination) : "—"}
                {a.containerNo ? ` · ${a.containerNo}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

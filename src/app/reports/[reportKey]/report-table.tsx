import type { ReportExportData } from "@/lib/reports/export";

// A generic read-only ledger table — same "dense grid, no per-row action, so
// no touch-target-driven mobile card layout" reasoning Stock movements and
// Audit log already use, since every report here is exactly that shape.
// overflow-x-auto keeps a wide report (Under-price sales' 8 columns) from
// forcing the whole page to scroll sideways on a phone — only the table
// itself scrolls.
export function ReportTable({ data }: { data: ReportExportData }) {
  const alignRight = new Set(data.alignRight ?? []);

  if (data.rows.length === 0) {
    return (
      <div className="flex flex-col rounded-[5px] border border-border bg-card">
        <div className="px-4.5 py-8 text-center font-sans text-[14px] text-ink-faint">Nothing to show for this period.</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[5px] border border-border bg-card">
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr className="border-b border-hairline-2 bg-row-hover">
            {data.columns.map((col, i) => (
              <th
                key={col}
                className={`whitespace-nowrap px-4 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint ${
                  alignRight.has(i) ? "text-right" : "text-left"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-hairline last:border-b-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`whitespace-nowrap px-4 py-2.75 font-sans text-[13px] text-ink ${
                    alignRight.has(ci) ? "text-right font-mono text-[12.5px]" : "text-left"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { requireRole } from "@/lib/auth/dal";
import { reviewQueue } from "@/lib/order-metrics";
import { toCsv } from "@/lib/csv";

// Exports the full awaiting-review queue (not just the 6 shown on the
// dashboard card) — the one tabular data set the dashboard actually has.
export async function GET() {
  await requireRole(["manager"]);

  const queue = await reviewQueue();
  const rows: (string | number)[][] = [
    ["Order", "Customer", "Destination", "Staff", "Currency", "Balance", "Submitted"],
    ...queue.map((r) => [
      r.orderNo,
      r.customerName,
      r.destination ? r.destination[0].toUpperCase() + r.destination.slice(1) : "",
      r.staffName,
      r.currency,
      r.balance.toFixed(2),
      r.submittedAt.toISOString().slice(0, 10),
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-awaiting-review-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

"use client";

import { listQueuedSales, removeQueuedSale, markQueuedSaleFailed } from "./sale-queue";

export type FlushResult = {
  synced: { clientRequestId: string; saleNo: string }[];
  failed: number;
  stopReason: "network" | "auth" | null;
};

// Called on mount, on the browser's `online` event, and on a periodic timer
// while the POS is open (src/app/sale/pos.tsx) — not the Background Sync
// API, which Chrome/Android support but Safari/iOS does not, so it can't be
// the only mechanism a shop counter actually depends on. Processes strictly
// in order and stops at the first network failure rather than skipping
// ahead, so a later sale is never confirmed before an earlier one still
// waiting to sync. A real rejection (e.g. insufficient stock) is different —
// not a connectivity problem — so that one sale is set aside as "failed"
// and the loop moves on to the next.
export async function flushQueue(): Promise<FlushResult> {
  const queued = await listQueuedSales();
  const synced: FlushResult["synced"] = [];
  let failed = 0;

  for (const sale of queued) {
    if (sale.status === "failed") continue;

    let res: Response;
    try {
      res = await fetch("/api/sale/complete-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRequestId: sale.clientRequestId, lines: sale.lines }),
      });
    } catch {
      // Network-level failure — fetch() itself never got a response, so
      // this is genuinely still offline (or the origin is unreachable).
      // Stop rather than trying the next queued sale, preserving order for
      // whenever connectivity actually returns.
      return { synced, failed, stopReason: "network" };
    }

    if (res.ok) {
      const body: { saleNo: string } = await res.json();
      await removeQueuedSale(sale.clientRequestId);
      synced.push({ clientRequestId: sale.clientRequestId, saleNo: body.saleNo });
      continue;
    }

    if (res.status === 401) {
      // Session expired mid-outage (30-minute idle timeout) — every other
      // queued sale would fail the same way, so stop instead of hammering
      // the rest of the queue with requests that can't succeed.
      return { synced, failed, stopReason: "auth" };
    }

    const body: { error?: string } = await res.json().catch(() => ({}));
    await markQueuedSaleFailed(sale.clientRequestId, body.error ?? "Could not sync this sale.");
    failed++;
  }

  return { synced, failed, stopReason: null };
}

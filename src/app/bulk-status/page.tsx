import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { queueForStatus } from "@/lib/order-metrics";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { STATUS_LABEL, formatMoneyShort } from "@/app/orders/format";
import type { OrderStatus } from "@/generated/prisma/enums";
import { BulkStatusList } from "./bulk-status-list";

// The three statuses a bulk action can actually move orders out of — draft
// isn't a manager action (see order detail's own canManage rule) and
// delivered/cancelled are terminal, so there's nothing to bulk-advance them
// to.
const BULK_STATUSES: OrderStatus[] = ["submitted", "in_transit", "arrived"];

export default async function BulkStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const status: OrderStatus = (BULK_STATUSES as string[]).includes(params.status ?? "")
    ? (params.status as OrderStatus)
    : "submitted";

  const rows = await queueForStatus(status);
  // Prisma's Decimal is a class instance, not a plain object — it can't
  // cross the Server->Client boundary (BulkStatusList is "use client" for
  // its checkbox/timer state), so it's formatted to a string here rather
  // than passed through raw, same as every other client-facing order row.
  const orders = rows.map((r) => ({
    id: r.id,
    orderNo: r.orderNo,
    customerName: r.customerName,
    destination: r.destination,
    balanceDisplay: formatMoneyShort(Number(r.balance), r.currency),
  }));

  return (
    <ManagerShellFrame active="bulk-status" user={manager}>
      <ContentHeader
        title="Bulk status update"
        subtitle={`${rows.length} order${rows.length === 1 ? "" : "s"} ${STATUS_LABEL[status].toLowerCase()} · tick and set`}
      />
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
        {BULK_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/bulk-status?status=${s}`}
            className={`flex h-9 flex-none items-center rounded-full border px-3.5 font-sans text-[12.5px] font-medium md:h-[28px] md:px-3.5 ${
              status === s
                ? "border-brand bg-brand text-white"
                : "border-input-border bg-card text-ink-muted hover:bg-row-hover"
            }`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      <BulkStatusList key={status} status={status} orders={orders} />
    </ManagerShellFrame>
  );
}

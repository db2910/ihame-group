import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { stockOnHandByItem } from "@/lib/stock";
import { Prisma } from "@/generated/prisma/client";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { SHOP_STAFF_TABS } from "@/components/shell/staff-tabs";
import { StockLookupSearch } from "./stock-lookup-search";

const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export default async function StockLookupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["shop_staff"]);
  const params = await searchParams;
  const query = params.q?.trim();

  const where = {
    isActive: true,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { sku: { contains: query, mode: "insensitive" as const } },
            { barcode: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, onHandByItem] = await Promise.all([
    db.item.findMany({ where, orderBy: { name: "asc" } }),
    stockOnHandByItem(),
  ]);

  const rows = items.map((item) => {
    const onHand = onHandByItem.get(item.id) ?? new Prisma.Decimal(0);
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      sellPrice: `RWF ${Number(item.sellPrice).toLocaleString("en-US")}`,
      stockDisplay: quantity.format(Number(onHand)),
      isOut: onHand.lessThanOrEqualTo(0),
      isLow: !onHand.lessThanOrEqualTo(0) && onHand.lessThanOrEqualTo(item.reorderLevel),
    };
  });

  return (
    <StaffTopBar role="shop_staff" user={user} tabs={SHOP_STAFF_TABS} active="stock-lookup">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-4 md:p-5.5">
        <div>
          <div className="font-sans text-[19px] font-semibold text-ink">Stock lookup</div>
          <div className="mt-0.5 font-sans text-[12.5px] text-ink-faint">
            Read-only · quantities from the ledger
          </div>
        </div>

        <StockLookupSearch />

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[5px] border border-border bg-card">
          {rows.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
              No items match this search.
            </div>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-hairline px-4.5 py-3.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[14px] font-medium text-ink">{r.name}</div>
                <div className="mt-0.5 truncate font-mono text-[11.5px] text-ink-faint">
                  {r.sku} · {r.sellPrice}
                </div>
              </div>
              <div className="flex-none text-right">
                <div
                  className={`font-mono text-[16px] font-semibold ${
                    r.isOut ? "text-alert" : r.isLow ? "text-warn" : "text-ink"
                  }`}
                >
                  {r.stockDisplay}
                </div>
                <div className="font-sans text-[10.5px] text-ink-faint">{r.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaffTopBar>
  );
}

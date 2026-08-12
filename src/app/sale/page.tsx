import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { stockOnHandByItem } from "@/lib/stock";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { SHOP_STAFF_TABS } from "@/components/shell/staff-tabs";
import { Pos, type PosItem } from "./pos";

export default async function SalePage() {
  const user = await requireRole(["shop_staff"]);

  // Whole active catalogue, not paginated — the counter needs instant,
  // no-network tap-to-add, which rules out the Items screen's server-search
  // pattern. Payload is a handful of fields per item (not the full Items
  // grid shape), so this stays cheap even at a few thousand rows.
  const [items, onHandByItem] = await Promise.all([
    db.item.findMany({
      where: { isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    stockOnHandByItem(),
  ]);

  const posItems: PosItem[] = items.map((item) => ({
    id: item.id,
    sku: item.sku,
    barcode: item.barcode,
    name: item.name,
    unit: item.unit,
    categoryName: item.category.name,
    sellPrice: Number(item.sellPrice),
    stock: Number(onHandByItem.get(item.id) ?? 0),
  }));

  return (
    <StaffTopBar role="shop_staff" user={user} tabs={SHOP_STAFF_TABS} active="sale">
      <Pos items={posItems} />
    </StaffTopBar>
  );
}

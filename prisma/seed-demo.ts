/**
 * Demo/mock data for exercising the shop module before real stock is loaded.
 *
 *   npx tsx --env-file=.env prisma/seed-demo.ts          # insert
 *   npx tsx --env-file=.env prisma/seed-demo.ts --reset  # remove every row it created
 *
 * The --env-file flag is required: src/lib/db.ts reads DATABASE_URL at import
 * time and a bare `tsx` run does not load .env the way `prisma db seed` does.
 *
 * Everything it writes is tagged so `--reset` can remove it precisely: demo
 * items all carry the DEMO_SKU_PREFIX, and categories/suppliers are matched by
 * the exact names below. Nothing else in the database is touched, and no real
 * item can collide with the prefix because the app's own generator uses
 * "ITM-".
 *
 * This is a development convenience, not part of the product. Delete the file
 * once real opening stock has been imported.
 */
import { db } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";

const DEMO_SKU_PREFIX = "DEMO-";

const CATEGORIES = ["Fasteners", "Plumbing", "Electrical", "Tools", "Paint & finishes", "Building materials"];
const SUPPLIERS = [
  { name: "Kigali Hardware Wholesalers", phone: "+250 788 112 233", email: "sales@khw.rw", address: "Gikondo Industrial Park, Kigali" },
  { name: "Rwanda Steel & Cement Ltd", phone: "+250 788 445 566", email: "orders@rsc.rw", address: "Masoro, Kigali" },
  { name: "Great Lakes Electricals", phone: "+243 991 778 899", email: "info@glelec.cd", address: "Goma, DRC" },
];

type Seed = {
  sku: string;
  name: string;
  category: string;
  unit: "piece" | "metre" | "kg" | "bag" | "litre" | "box";
  cost: string;
  sell: string;
  reorder: string;
  opening: string;
};

// Prices are RWF (Phase 0: shop trades in RWF). Deliberately mixed so the
// screen has something to show: a few items sitting under their reorder level,
// one at exactly zero, a couple of high-turnover lines.
const ITEMS: Seed[] = [
  { sku: "0001", name: "Galvanised nail 3in", category: "Fasteners", unit: "kg", cost: "1450", sell: "1800", reorder: "50", opening: "240" },
  { sku: "0002", name: "Wood screw 40mm (box 200)", category: "Fasteners", unit: "box", cost: "3200", sell: "4100", reorder: "20", opening: "64" },
  { sku: "0003", name: "Roofing nail 2.5in", category: "Fasteners", unit: "kg", cost: "1700", sell: "2150", reorder: "40", opening: "18" },
  { sku: "0004", name: "Hex bolt M10 × 80", category: "Fasteners", unit: "piece", cost: "420", sell: "600", reorder: "150", opening: "820" },

  { sku: "0010", name: "PVC pipe 32mm × 3m", category: "Plumbing", unit: "piece", cost: "2100", sell: "2750", reorder: "100", opening: "86" },
  { sku: "0011", name: "PVC elbow 32mm", category: "Plumbing", unit: "piece", cost: "380", sell: "550", reorder: "120", opening: "410" },
  { sku: "0012", name: "Ball valve 1/2in brass", category: "Plumbing", unit: "piece", cost: "3400", sell: "4200", reorder: "25", opening: "18" },
  { sku: "0013", name: "PTFE thread tape", category: "Plumbing", unit: "piece", cost: "260", sell: "450", reorder: "80", opening: "312" },
  { sku: "0014", name: "Water tank 1000L", category: "Plumbing", unit: "piece", cost: "148000", sell: "179000", reorder: "3", opening: "7" },

  { sku: "0020", name: "Twin & earth cable 2.5mm", category: "Electrical", unit: "metre", cost: "780", sell: "1050", reorder: "200", opening: "1940" },
  { sku: "0021", name: "Socket outlet 13A", category: "Electrical", unit: "piece", cost: "2650", sell: "3400", reorder: "60", opening: "144" },
  { sku: "0022", name: "LED bulb 9W E27", category: "Electrical", unit: "piece", cost: "1250", sell: "1900", reorder: "100", opening: "56" },
  { sku: "0023", name: "Circuit breaker 32A", category: "Electrical", unit: "piece", cost: "6800", sell: "8500", reorder: "20", opening: "41" },
  { sku: "0024", name: "Conduit pipe 20mm × 3m", category: "Electrical", unit: "piece", cost: "1100", sell: "1500", reorder: "80", opening: "0" },

  { sku: "0030", name: "Claw hammer 16oz", category: "Tools", unit: "piece", cost: "7200", sell: "9500", reorder: "10", opening: "26" },
  { sku: "0031", name: "Hacksaw frame 12in", category: "Tools", unit: "piece", cost: "5400", sell: "7000", reorder: "10", opening: "9" },
  { sku: "0032", name: "Measuring tape 5m", category: "Tools", unit: "piece", cost: "3100", sell: "4300", reorder: "15", opening: "38" },
  { sku: "0033", name: "Wheelbarrow heavy duty", category: "Tools", unit: "piece", cost: "42000", sell: "54000", reorder: "4", opening: "11" },

  { sku: "0040", name: "Emulsion paint white 20L", category: "Paint & finishes", unit: "litre", cost: "3900", sell: "5200", reorder: "60", opening: "220" },
  { sku: "0041", name: "Gloss paint black 4L", category: "Paint & finishes", unit: "litre", cost: "4600", sell: "6100", reorder: "40", opening: "32" },
  { sku: "0042", name: "Paint brush 3in", category: "Paint & finishes", unit: "piece", cost: "1400", sell: "2100", reorder: "30", opening: "77" },

  { sku: "0050", name: "Cement 50kg", category: "Building materials", unit: "bag", cost: "11200", sell: "13500", reorder: "40", opening: "512" },
  { sku: "0051", name: "Roofing sheet 28g × 3m", category: "Building materials", unit: "piece", cost: "8900", sell: "10800", reorder: "30", opening: "204" },
  { sku: "0052", name: "River sand", category: "Building materials", unit: "kg", cost: "45", sell: "80", reorder: "5000", opening: "18400" },
  { sku: "0053", name: "Reinforcement bar 12mm × 12m", category: "Building materials", unit: "piece", cost: "15600", sell: "19000", reorder: "50", opening: "23" },
];

// Recorded after the opening stock so the ledger has more than one movement
// type, and so a few items carry a genuinely weighted cost rather than the
// flat opening figure. [sku, quantity, unitCost]
const PURCHASE_LINES: Array<[string, string, string]> = [
  ["0001", "120", "1560"],
  ["0010", "150", "2250"],
  ["0050", "300", "11800"],
  ["0020", "800", "820"],
  ["0022", "200", "1180"],
];

// [sku, signed quantity, reason]
const ADJUSTMENTS: Array<[string, string, string]> = [
  ["0003", "-6", "Damaged in the store — rusted through after roof leak"],
  ["0012", "-2", "Count variance found during monthly stock take"],
  ["0031", "-1", "Broken frame, written off"],
  ["0042", "4", "Found in back store, previously miscounted"],
];

function d(v: string) {
  return new Prisma.Decimal(v);
}

// cost_price is last-purchase-price (most recent purchase-or-opening
// movement wins, src/lib/stock.ts). Backdated well before the earliest demo
// purchase below (27 days) so the seeded story reads correctly: opening
// stock existed first, purchases happened after and are what the catalogue's
// current cost reflects — not an accident of which row the seed script wrote
// last in wall-clock time.
const OPENING_STOCK_DATE = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);


async function reset() {
  const items = await db.item.findMany({
    where: { sku: { startsWith: DEMO_SKU_PREFIX } },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  const purchases = await db.purchase.findMany({
    where: { purchaseNo: { startsWith: DEMO_SKU_PREFIX } },
    select: { id: true },
  });
  const purchaseIds = purchases.map((p) => p.id);

  // CATEGORIES/SUPPLIERS overlap by name with prisma/seed-categories.ts's
  // permanent starter set, and a manager may by now have added real items or
  // purchases under one of these names too. Only delete a category/supplier
  // this script created if nothing outside the demo set still points at it —
  // otherwise `items.category_id`'s FK (onDelete: Restrict) would reject the
  // whole batch and abort the reset entirely.
  const categoriesInUseElsewhere = await db.category.findMany({
    where: { name: { in: CATEGORIES }, items: { some: { id: { notIn: itemIds } } } },
    select: { name: true },
  });
  const categoryNamesToDelete = CATEGORIES.filter(
    (name) => !categoriesInUseElsewhere.some((c) => c.name === name),
  );

  const suppliersInUseElsewhere = await db.supplier.findMany({
    where: {
      name: { in: SUPPLIERS.map((s) => s.name) },
      purchases: { some: { id: { notIn: purchaseIds } } },
    },
    select: { name: true },
  });
  const supplierNamesToDelete = SUPPLIERS.map((s) => s.name).filter(
    (name) => !suppliersInUseElsewhere.some((s) => s.name === name),
  );

  await db.$transaction([
    db.stockMovement.deleteMany({ where: { itemId: { in: itemIds } } }),
    db.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } }),
    db.purchase.deleteMany({ where: { id: { in: purchaseIds } } }),
    db.item.deleteMany({ where: { id: { in: itemIds } } }),
    db.supplier.deleteMany({ where: { name: { in: supplierNamesToDelete } } }),
    db.category.deleteMany({ where: { name: { in: categoryNamesToDelete } } }),
  ]);

  console.log(`Removed ${itemIds.length} demo items, ${purchaseIds.length} demo purchases, and their movements.`);
  console.log(
    `Removed ${categoryNamesToDelete.length}/${CATEGORIES.length} demo categories (rest still in use by real items).`,
  );
  console.log(
    `Removed ${supplierNamesToDelete.length}/${SUPPLIERS.length} demo suppliers (rest still in use by real purchases).`,
  );
}

async function seed() {
  const manager = await db.user.findFirst({ where: { role: "manager", isActive: true } });
  if (!manager) {
    console.error("No active manager account found — every row needs a created_by. Run the real seed first.");
    process.exit(1);
  }

  const existing = await db.item.count({ where: { sku: { startsWith: DEMO_SKU_PREFIX } } });
  if (existing > 0) {
    console.error(`${existing} demo items already exist. Run with --reset first if you want to reload them.`);
    process.exit(1);
  }

  const categories = new Map<string, string>();
  for (const name of CATEGORIES) {
    const c = await db.category.upsert({ where: { name }, update: {}, create: { name } });
    categories.set(name, c.id);
  }

  const suppliers = new Map<string, string>();
  for (const s of SUPPLIERS) {
    const row = await db.supplier.upsert({ where: { name: s.name }, update: {}, create: s });
    suppliers.set(s.name, row.id);
  }

  const itemIdBySku = new Map<string, string>();

  // Items + their opening stock, one transaction per item — same shape the
  // Add-item action uses.
  for (const seedItem of ITEMS) {
    const sku = DEMO_SKU_PREFIX + seedItem.sku;
    await db.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          sku,
          name: seedItem.name,
          categoryId: categories.get(seedItem.category)!,
          unit: seedItem.unit,
          costPrice: d(seedItem.cost),
          sellPrice: d(seedItem.sell),
          reorderLevel: d(seedItem.reorder),
          createdById: manager.id,
        },
      });
      itemIdBySku.set(seedItem.sku, item.id);

      if (Number(seedItem.opening) > 0) {
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            movementType: "opening",
            quantity: d(seedItem.opening),
            unitCost: d(seedItem.cost),
            createdById: manager.id,
            createdAt: OPENING_STOCK_DATE,
          },
        });
      }
    });
  }

  // One purchase per supplier, spread over recent weeks, each setting
  // cost_price to its own unit cost (last-purchase-price) — exactly what the
  // Purchases screen does.
  const supplierNames = [...suppliers.keys()];
  const linesPerPurchase = [PURCHASE_LINES.slice(0, 2), PURCHASE_LINES.slice(2, 4), PURCHASE_LINES.slice(4)];

  for (const [index, lines] of linesPerPurchase.entries()) {
    if (lines.length === 0) continue;
    const purchasedAt = new Date(Date.now() - (index + 1) * 9 * 24 * 60 * 60 * 1000);
    const supplierName = supplierNames[index % supplierNames.length];

    await db.$transaction(async (tx) => {
      let total = new Prisma.Decimal(0);
      for (const [, qty, unitCost] of lines) total = total.plus(d(qty).times(d(unitCost)));

      const purchase = await tx.purchase.create({
        data: {
          purchaseNo: `${DEMO_SKU_PREFIX}PO-${String(index + 1).padStart(4, "0")}`,
          supplierId: suppliers.get(supplierName)!,
          purchasedAt,
          total,
          createdById: manager.id,
        },
      });

      for (const [sku, qty, unitCost] of lines) {
        const itemId = itemIdBySku.get(sku)!;

        const purchaseItem = await tx.purchaseItem.create({
          data: { purchaseId: purchase.id, itemId, quantity: d(qty), unitCost: d(unitCost) },
        });
        await tx.stockMovement.create({
          data: {
            itemId,
            movementType: "purchase",
            quantity: d(qty),
            unitCost: d(unitCost),
            referenceType: "purchase",
            referenceId: purchase.id,
            purchaseItemId: purchaseItem.id,
            createdById: manager.id,
            createdAt: purchasedAt,
          },
        });

        // Last-purchase-price: this purchase is the newest thing that's
        // touched the item's cost, so its own unit cost simply becomes the
        // item's cost_price.
        await tx.item.update({ where: { id: itemId }, data: { costPrice: d(unitCost) } });
      }
    });
  }

  for (const [sku, qty, reason] of ADJUSTMENTS) {
    await db.stockMovement.create({
      data: {
        itemId: itemIdBySku.get(sku)!,
        movementType: "adjustment",
        quantity: d(qty),
        note: reason,
        createdById: manager.id,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Deactivate one item so the inactive state is visible on the screen.
  await db.item.update({
    where: { sku: `${DEMO_SKU_PREFIX}0024` },
    data: { isActive: false },
  });

  const movements = await db.stockMovement.count({
    where: { item: { sku: { startsWith: DEMO_SKU_PREFIX } } },
  });
  console.log(`Seeded ${ITEMS.length} demo items across ${CATEGORIES.length} categories.`);
  console.log(`  ${SUPPLIERS.length} suppliers, ${linesPerPurchase.filter((l) => l.length).length} purchases, ${movements} stock movements.`);
  console.log(`  1 item deactivated, ${ADJUSTMENTS.length} adjustments recorded.`);
  console.log("\nRemove it all again with:  npx tsx --env-file=.env prisma/seed-demo.ts --reset");
}

const main = process.argv.includes("--reset") ? reset : seed;
main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

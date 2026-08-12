/**
 * Demo/mock data for exercising the freight module (Phase 4) before real
 * orders exist.
 *
 *   npx tsx --env-file=.env prisma/seed-demo-freight.ts          # insert
 *   npx tsx --env-file=.env prisma/seed-demo-freight.ts --reset  # remove every row it created
 *
 * The --env-file flag is required: src/lib/db.ts reads DATABASE_URL at import
 * time and a bare `tsx` run does not load .env the way `prisma db seed` does.
 *
 * Everything it writes is tagged so `--reset` can remove it precisely: demo
 * orders all carry the DEMO_PREFIX in their order_no (never through
 * generateOrderNo(), so the real sequence is untouched), and customers are
 * matched by the exact names below. Nothing else in the database is touched.
 *
 * This is a development convenience, not part of the product. Delete the file
 * once real orders exist.
 */
import { db } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";

const DEMO_PREFIX = "DEMO-";

const CUSTOMERS = [
  {
    code: `${DEMO_PREFIX}0001`,
    name: "Uwimana Auto Imports",
    phone: "+250 788 221 344",
    email: "sales@uwimanaimports.rw",
    address: "Nyabugogo, Kigali",
  },
  {
    code: `${DEMO_PREFIX}0002`,
    name: "Nkurunziza General Merchandise",
    phone: "+243 997 112 998",
    address: "Avenue du Marché, Bukavu",
  },
  {
    code: `${DEMO_PREFIX}0003`,
    name: "Kigali Construction Equipment Ltd",
    phone: "+250 788 990 112",
    email: "procurement@kce.rw",
    address: "Kicukiro, Kigali",
  },
  {
    code: `${DEMO_PREFIX}0004`,
    name: "Mbeki Electronics Trading",
    phone: "+243 998 334 221",
    address: "Boulevard Kanyamuhanga, Goma",
  },
];

function d(v: string) {
  return new Prisma.Decimal(v);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function reset() {
  const orders = await db.order.findMany({
    where: { orderNo: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  const customersInUseElsewhere = await db.customer.findMany({
    where: { name: { in: CUSTOMERS.map((c) => c.name) }, orders: { some: { id: { notIn: orderIds } } } },
    select: { name: true },
  });
  const customerNamesToDelete = CUSTOMERS.map((c) => c.name).filter(
    (name) => !customersInUseElsewhere.some((c) => c.name === name),
  );

  await db.$transaction([
    db.orderPayment.deleteMany({ where: { orderId: { in: orderIds } } }),
    db.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } }),
    db.order.deleteMany({ where: { id: { in: orderIds } } }),
    db.customer.deleteMany({ where: { name: { in: customerNamesToDelete } } }),
  ]);

  console.log(`Removed ${orderIds.length} demo orders and their payments/history.`);
  console.log(
    `Removed ${customerNamesToDelete.length}/${CUSTOMERS.length} demo customers (rest still in use by real orders).`,
  );
}

async function seed() {
  const freightStaff = await db.user.findFirst({ where: { role: "freight_staff", isActive: true } });
  if (!freightStaff) {
    console.error("No active freight_staff account found — every demo order needs a created_by.");
    process.exit(1);
  }

  const existing = await db.order.count({ where: { orderNo: { startsWith: DEMO_PREFIX } } });
  if (existing > 0) {
    console.error(`${existing} demo orders already exist. Run with --reset first if you want to reload them.`);
    process.exit(1);
  }

  const customerIdByName = new Map<string, string>();
  for (const c of CUSTOMERS) {
    const row = await db.customer.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, createdById: freightStaff.id },
    });
    customerIdByName.set(c.name, row.id);
  }

  // 1. Bare draft — just a customer, nothing else. Exactly the "save draft
  // validates only the customer" state (spec §5).
  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: `${DEMO_PREFIX}ORD-0001`,
        customerId: customerIdByName.get("Uwimana Auto Imports")!,
        createdById: freightStaff.id,
        createdAt: daysAgo(1),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, toStatus: "draft", changedById: freightStaff.id, changedAt: daysAgo(1) },
    });
  });

  // 2. Partially-filled draft — realistic "still working on it" state.
  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: `${DEMO_PREFIX}ORD-0002`,
        customerId: customerIdByName.get("Mbeki Electronics Trading")!,
        goodsCategory: "electronics",
        description: "40x assorted LED TVs and home theatre systems",
        quantity: 40,
        originPort: "Shenzhen",
        destination: "goma",
        createdById: freightStaff.id,
        createdAt: daysAgo(3),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, toStatus: "draft", changedById: freightStaff.id, changedAt: daysAgo(3) },
    });
  });

  // 3. Submitted vehicle order with a partial payment — outstanding balance,
  // proof of payment attached (bank transfer).
  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: `${DEMO_PREFIX}ORD-0003`,
        customerId: customerIdByName.get("Uwimana Auto Imports")!,
        goodsCategory: "vehicle",
        description: "2x Toyota Land Cruiser V8, used, right-hand drive",
        quantity: 2,
        vehicles: {
          create: [
            {
              position: 1,
              make: "Toyota",
              model: "Land Cruiser V8",
              year: 2019,
              colour: "Pearl white",
              vin: `${DEMO_PREFIX}VIN0001`,
              engineNo: "1GR-5567201",
            },
            {
              position: 2,
              make: "Toyota",
              model: "Land Cruiser V8",
              year: 2020,
              colour: "Graphite",
              vin: `${DEMO_PREFIX}VIN0002`,
              engineNo: "1GR-5567844",
            },
          ],
        },
        originPort: "Tianjin",
        destination: "kigali",
        containerNo: "MSKU 442819",
        blNo: "COSU 88120451",
        departureDate: daysAgo(21),
        eta: daysFromNow(6),
        currency: "USD",
        totalAmount: d("28500"),
        status: "submitted",
        submittedAt: daysAgo(20),
        createdById: freightStaff.id,
        createdAt: daysAgo(22),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, toStatus: "draft", changedById: freightStaff.id, changedAt: daysAgo(22) },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: "draft", toStatus: "submitted", changedById: freightStaff.id, changedAt: daysAgo(20) },
    });
    await tx.orderPayment.create({
      data: {
        orderId: order.id,
        amount: d("15000"),
        currency: "USD",
        exchangeRate: d("1"),
        method: "bank",
        proofOfPaymentPath: null, // Phase 7: no real demo file was ever uploaded for this stub payment
        paidOn: daysAgo(19),
        note: "Deposit",
        recordedById: freightStaff.id,
        createdAt: daysAgo(19),
      },
    });
  });

  // 4. Submitted general-goods order, paid in full (balance zero) — cash, no
  // proof needed.
  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: `${DEMO_PREFIX}ORD-0004`,
        customerId: customerIdByName.get("Nkurunziza General Merchandise")!,
        goodsCategory: "general",
        description: "200x assorted kitchenware cartons",
        quantity: 200,
        originPort: "Guangzhou",
        destination: "bukavu",
        containerNo: "TGHU 5583201",
        blNo: "MAEU 74400912",
        departureDate: daysAgo(35),
        eta: daysAgo(5),
        actualArrivalDate: daysAgo(4),
        currency: "USD",
        totalAmount: d("6200"),
        status: "submitted",
        submittedAt: daysAgo(34),
        createdById: freightStaff.id,
        createdAt: daysAgo(36),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, toStatus: "draft", changedById: freightStaff.id, changedAt: daysAgo(36) },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: "draft", toStatus: "submitted", changedById: freightStaff.id, changedAt: daysAgo(34) },
    });
    await tx.orderPayment.create({
      data: {
        orderId: order.id,
        amount: d("6200"),
        currency: "USD",
        exchangeRate: d("1"),
        method: "cash",
        proofOfPaymentPath: null,
        paidOn: daysAgo(34),
        note: "Paid in full on submission",
        recordedById: freightStaff.id,
        createdAt: daysAgo(34),
      },
    });
  });

  // 5. Submitted machinery order, no payment at all yet — full outstanding
  // balance, useful for Phase 5's "outstanding balances" dashboard KPI later.
  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: `${DEMO_PREFIX}ORD-0005`,
        customerId: customerIdByName.get("Kigali Construction Equipment Ltd")!,
        goodsCategory: "machinery",
        description: "1x used wheel loader, 1x concrete mixer",
        quantity: 2,
        originPort: "Guangzhou",
        destination: "kigali",
        departureDate: daysAgo(10),
        eta: daysFromNow(12),
        currency: "USD",
        totalAmount: d("42000"),
        status: "submitted",
        submittedAt: daysAgo(9),
        createdById: freightStaff.id,
        createdAt: daysAgo(11),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, toStatus: "draft", changedById: freightStaff.id, changedAt: daysAgo(11) },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: "draft", toStatus: "submitted", changedById: freightStaff.id, changedAt: daysAgo(9) },
    });
  });

  // 6. Submitted electronics order with a MoMo payment recorded *without*
  // proof attached — deliberately, to show what that warning state looks
  // like on the order detail screen (the record-payment form itself blocks
  // this combination; a direct seed row is the only way to demo it).
  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: `${DEMO_PREFIX}ORD-0006`,
        customerId: customerIdByName.get("Mbeki Electronics Trading")!,
        goodsCategory: "electronics",
        description: "15x commercial refrigerators",
        quantity: 15,
        originPort: "Shenzhen",
        destination: "goma",
        containerNo: "CMAU 9017744",
        blNo: "ONEY 22850317",
        departureDate: daysAgo(15),
        eta: daysFromNow(3),
        currency: "USD",
        totalAmount: d("18000"),
        status: "submitted",
        submittedAt: daysAgo(14),
        createdById: freightStaff.id,
        createdAt: daysAgo(16),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, toStatus: "draft", changedById: freightStaff.id, changedAt: daysAgo(16) },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: "draft", toStatus: "submitted", changedById: freightStaff.id, changedAt: daysAgo(14) },
    });
    await tx.orderPayment.create({
      data: {
        orderId: order.id,
        amount: d("9000"),
        currency: "USD",
        exchangeRate: d("1"),
        method: "momo",
        proofOfPaymentPath: null,
        paidOn: daysAgo(13),
        recordedById: freightStaff.id,
        createdAt: daysAgo(13),
      },
    });
  });

  const orderCount = await db.order.count({ where: { orderNo: { startsWith: DEMO_PREFIX } } });
  console.log(`Seeded ${CUSTOMERS.length} demo customers and ${orderCount} demo orders (2 draft, 4 submitted).`);
  console.log(`  All owned by freight staff: ${freightStaff.name} <${freightStaff.email}>.`);
  console.log("\nRemove it all again with:  npx tsx --env-file=.env prisma/seed-demo-freight.ts --reset");
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

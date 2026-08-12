import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { FREIGHT_STAFF_TABS } from "@/components/shell/staff-tabs";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { OrderForm, type OrderFormValues } from "../order-form";
import { STATUS_LABEL, formatMoney, formatMoneyShort } from "../format";
import { OrderDetailView, type OrderDetail } from "./order-detail-view";

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
// "28 JUL 14:02" — the mock's status-history stamp. Times are the moment the
// change happened, so these render in the viewer's local zone, unlike the
// calendar-date fields which are stored as UTC midnight.
const historyStamp = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function isoDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Phase 5: All orders is unscoped, so a manager can open any order here —
  // same route staff use, just without the ownership restriction below. A
  // manager gets edit + status-lifecycle controls once the order is past
  // draft (see canManage below); drafts stay read-only for them — that's
  // still the creating staff member's own workspace.
  const user = await requireRole(["freight_staff", "manager"]);
  const isManager = user.role === "manager";
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicles: { orderBy: { position: "asc" } },
      payments: { orderBy: { paidOn: "desc" }, include: { recordedBy: { select: { name: true } } } },
      statusHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { name: true } } } },
    },
  });

  // Spec §5 API scope: a freight staff member's orders are entirely their
  // own — an order that exists but belongs to someone else reads the same
  // as one that doesn't exist, not a 403 that would confirm its order number.
  if (!order || (!isManager && order.createdById !== user.id)) {
    notFound();
  }

  if (order.status === "draft" && !isManager) {
    const existing: OrderFormValues = {
      id: order.id,
      customerId: order.customerId,
      goodsCategory: order.goodsCategory ?? "",
      description: order.description ?? "",
      quantity: String(order.quantity),
      vehicles: order.vehicles.map((v) => ({
        make: v.make ?? "",
        model: v.model ?? "",
        year: v.year ? String(v.year) : "",
        colour: v.colour ?? "",
        vin: v.vin ?? "",
        engineNo: v.engineNo ?? "",
      })),
      originPort: order.originPort ?? "",
      destination: order.destination ?? "",
      departureDate: isoDate(order.departureDate),
      eta: isoDate(order.eta),
      containerNo: order.containerNo ?? "",
      blNo: order.blNo ?? "",
      currency: order.currency ?? "",
      totalAmount: order.totalAmount ? order.totalAmount.toFixed(2) : "",
    };
    const customers = await db.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });

    return (
      <StaffTopBar role="freight_staff" user={user} tabs={FREIGHT_STAFF_TABS} active="orders">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-[820px]">
            {/* Keyed to updatedAt: after a save, router.refresh() re-executes
                this Server Component with fresh field values, but a same-URL
                save leaves OrderForm mounted — an unchanged key would keep
                its now-stale uncontrolled inputs (see order-form.tsx). */}
            <OrderForm
              key={order.updatedAt.toISOString()}
              customers={customers}
              existing={existing}
              orderNoLabel={`${order.orderNo} · DRAFT`}
              existingPayments={order.payments.map((p) => ({
                id: p.id,
                amountDisplay: formatMoney(Number(p.amount), p.currency),
                method: p.method,
                note: p.note,
              }))}
            />
          </div>
        </div>
      </StaffTopBar>
    );
  }

  const total = order.totalAmount ?? new Prisma.Decimal(0);
  const paid = order.payments.reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
  const balance = total.minus(paid);
  const currency = order.currency ?? "";
  // Only reachable for a still-draft order now that a manager can view one
  // read-only (staff never reach this branch for their own drafts — see the
  // early-return above) — nothing's been agreed yet, so show "—" rather than
  // a misleading "0" with no currency.
  const hasAmount = order.totalAmount != null && order.currency != null;
  const paidPercent = total.greaterThan(0)
    ? Math.min(100, Math.max(0, Math.round((Number(paid) / Number(total)) * 100)))
    : 0;

  // authz.ts's editOrderAfterSubmit/changeOrderStatus: manager, and only
  // once the order has actually left draft (see the comment above).
  const canManage = isManager && order.status !== "draft" && order.status !== "cancelled";

  const editable: OrderDetail["editable"] = canManage
    ? {
        id: order.id,
        goodsCategory: order.goodsCategory ?? "",
        quantity: order.quantity,
        description: order.description ?? "",
        vehicles: order.vehicles.map((v) => ({
          make: v.make ?? "",
          model: v.model ?? "",
          year: v.year ? String(v.year) : "",
          colour: v.colour ?? "",
          vin: v.vin ?? "",
          engineNo: v.engineNo ?? "",
        })),
        originPort: order.originPort ?? "",
        destination: order.destination ?? "",
        departureDate: isoDate(order.departureDate),
        eta: isoDate(order.eta),
        containerNo: order.containerNo ?? "",
        blNo: order.blNo ?? "",
        currency: order.currency ?? "",
        totalAmount: order.totalAmount ? order.totalAmount.toFixed(2) : "",
      }
    : null;

  // Shown to every viewer (see OrderDetail.editHistory's comment) — a
  // still-draft order reaching here only happens for a manager, who can't
  // edit one yet, so this is always empty in that case anyway.
  const auditRows = await db.auditLog.findMany({
    where: {
      OR: [
        { tableName: "orders", recordId: order.id },
        { tableName: "order_vehicles", recordId: { in: order.vehicles.map((v) => v.id) } },
      ],
    },
    orderBy: { changedAt: "desc" },
    include: { changedBy: { select: { name: true } } },
  });
  const vehiclePositionById = new Map(order.vehicles.map((v) => [v.id, v.position]));
  const FIELD_LABEL: Record<string, string> = {
    description: "Description",
    origin_port: "Origin port",
    destination: "Destination",
    departure_date: "Departure",
    eta: "ETA",
    container_no: "Container",
    bl_no: "Bill of lading",
    currency: "Currency",
    total_amount: "Agreed total",
    make: "Make",
    model: "Model",
    year: "Year",
    colour: "Colour",
    vin: "VIN",
    engine_no: "Engine no",
  };
  const editHistory: OrderDetail["editHistory"] = auditRows.map((r) => {
    const vehiclePosition = r.tableName === "order_vehicles" ? vehiclePositionById.get(r.recordId) : undefined;
    const fieldLabel = FIELD_LABEL[r.fieldName] ?? r.fieldName;
    return {
      id: r.id,
      at: historyStamp.format(r.changedAt).replace(",", "").toUpperCase(),
      field: vehiclePosition ? `Vehicle ${vehiclePosition} · ${fieldLabel}` : fieldLabel,
      from: r.oldValue ?? "",
      to: r.newValue ?? "",
      by: r.changedBy.name,
    };
  });

  // Key/value rows for the Order card, in the mock's order. Only rows with a
  // value are shown — a general-goods order has no VIN to leave blank.
  const fields: OrderDetail["fields"] = [
    { label: "Customer", value: order.customer.name, mono: false },
    { label: "Category", value: order.goodsCategory ? titleCase(order.goodsCategory) : "—", mono: false },
    {
      label: order.goodsCategory === "vehicle" ? "Vehicles" : "Quantity",
      value: String(order.quantity),
      mono: false,
    },
    { label: "Origin port", value: order.originPort ?? "—", mono: false },
    { label: "Destination", value: order.destination ? titleCase(order.destination) : "—", mono: false },
    { label: "Departure", value: isoDate(order.departureDate) || "—" },
    { label: "ETA", value: isoDate(order.eta) || "—" },
    { label: "Container", value: order.containerNo ?? "—" },
    { label: "Bill of lading", value: order.blNo ?? "—" },
  ];
  if (order.description) {
    fields.push({ label: "Description", value: order.description, mono: false });
  }

  const detail: OrderDetail = {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    // A still-draft order (manager view only) isn't "locked" in the
    // submitted-and-frozen sense — it just isn't editable from this
    // read-only view yet (manager editing arrives in Phase 5 Round 4).
    isLocked: order.status !== "draft" && order.status !== "cancelled",
    lockedNote: order.submittedAt
      ? `Submitted on ${dateOnly.format(order.submittedAt)} — fields are locked. Only the manager can edit or change status. You can still record payments.`
      : null,
    fields,
    vehicles: order.vehicles.map((v) => ({
      id: v.id,
      position: v.position,
      title: [v.make, v.model].filter(Boolean).join(" ") || `Vehicle ${v.position}`,
      subtitle: [v.year, v.colour].filter(Boolean).join(" · "),
      vin: v.vin,
      engineNo: v.engineNo,
    })),
    currency: order.currency,
    totalShort: hasAmount ? formatMoneyShort(Number(total), currency) : "—",
    paidShort: hasAmount ? formatMoneyShort(Number(paid), currency) : "—",
    balanceShort: hasAmount ? formatMoneyShort(Number(balance), currency) : "—",
    balanceDisplay: hasAmount ? formatMoney(Number(balance), currency) : "—",
    balanceRaw: hasAmount ? Number(balance) : 0,
    paidPercent,
    cancelledReason: order.cancelledReason,
    canManage,
    editable,
    editHistory,
    payments: order.payments.map((p) => ({
      id: p.id,
      amountDisplay: formatMoneyShort(Number(p.amount), p.currency),
      method: p.method,
      paidOnDisplay: dateOnly.format(p.paidOn),
      hasProofOfPayment: p.proofOfPaymentPath !== null,
      note: p.note,
      recordedBy: p.recordedBy.name,
    })),
    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      at: historyStamp.format(h.changedAt).replace(",", "").toUpperCase(),
      what: h.fromStatus
        ? `${STATUS_LABEL[h.fromStatus].toLowerCase()} → ${STATUS_LABEL[h.toStatus].toLowerCase()}`
        : "Order created (draft)",
      by: h.changedBy.name,
    })),
  };

  if (isManager) {
    return (
      <ManagerShellFrame active="all-orders" user={user}>
        <OrderDetailView order={detail} backHref="/all-orders" backLabel="← All orders" />
      </ManagerShellFrame>
    );
  }

  return (
    <StaffTopBar role="freight_staff" user={user} tabs={FREIGHT_STAFF_TABS} active="orders">
      <OrderDetailView order={detail} />
    </StaffTopBar>
  );
}

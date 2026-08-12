"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { GoodsCategory, Destination, Currency, PaymentMethod, OrderStatus } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/dal";
import { generateOrderNo } from "@/lib/order-no";
import { uniqueConstraintFields } from "@/lib/prisma-errors";
import { recordAuditChanges } from "@/lib/audit";
import { orderBalance, paidTotalByOrder } from "@/lib/order-balance";
import { uploadProofImage } from "@/lib/storage";
import { NEXT_STATUS, CANCELLABLE_STATUSES } from "./format";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v?.toString().trim();
  return s ? s : null;
}

// A departure/eta/paid-on date is a plain calendar date, no meaningful
// time-of-day — parsed as UTC midnight, same reasoning (and same bug this
// avoids) as purchases' parsePurchaseDate.
function parseDateOnly(value: FormDataEntryValue | null): Date | null {
  const s = value?.toString().trim();
  if (!s) return null;
  const date = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDecimalOrNull(value: FormDataEntryValue | null): Prisma.Decimal | null {
  const s = value?.toString().trim();
  if (!s || !/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return new Prisma.Decimal(s);
}

const GOODS_CATEGORIES: GoodsCategory[] = ["vehicle", "machinery", "electronics", "general"];
const DESTINATIONS: Destination[] = ["kigali", "goma", "bukavu"];
const CURRENCIES: Currency[] = ["USD", "RWF", "CDF"];
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "momo", "bank", "card"];

// A vehicle order carries one of these per unit of `quantity` — the form
// renders that many blocks and submits each field as a repeated entry, so
// index i of every array belongs to vehicle i.
export type VehicleDraft = {
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  vin: string | null;
  engineNo: string | null;
};

function readVehicles(formData: FormData, quantity: number): VehicleDraft[] {
  const makes = formData.getAll("vehMake").map(String);
  const models = formData.getAll("vehModel").map(String);
  const years = formData.getAll("vehYear").map(String);
  const colours = formData.getAll("vehColour").map(String);
  const vins = formData.getAll("vehVin").map(String);
  const engineNos = formData.getAll("vehEngineNo").map(String);

  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

  return Array.from({ length: quantity }, (_, i) => ({
    make: clean(makes[i]),
    model: clean(models[i]),
    year: /^\d{4}$/.test((years[i] ?? "").trim()) ? Number.parseInt(years[i].trim(), 10) : null,
    colour: clean(colours[i]),
    vin: clean(vins[i]),
    engineNo: clean(engineNos[i]),
  }));
}

function readOrderFields(formData: FormData) {
  const goodsCategoryRaw = String(formData.get("goodsCategory") ?? "");
  const destinationRaw = String(formData.get("destination") ?? "");
  const currencyRaw = String(formData.get("currency") ?? "");
  const quantityRaw = String(formData.get("quantity") ?? "").trim();

  const goodsCategory = (GOODS_CATEGORIES as string[]).includes(goodsCategoryRaw)
    ? (goodsCategoryRaw as GoodsCategory)
    : null;
  // Capped so a mistyped quantity can't try to render (or insert) thousands
  // of vehicle rows.
  const quantity =
    /^\d+$/.test(quantityRaw) && Number(quantityRaw) > 0 ? Math.min(Number.parseInt(quantityRaw, 10), 50) : 1;

  return {
    customerId: String(formData.get("customerId") ?? "").trim(),
    goodsCategory,
    description: emptyToNull(formData.get("description")),
    quantity,
    vehicles: goodsCategory === "vehicle" ? readVehicles(formData, quantity) : [],
    originPort: emptyToNull(formData.get("originPort")),
    destination: (DESTINATIONS as string[]).includes(destinationRaw) ? (destinationRaw as Destination) : null,
    departureDate: parseDateOnly(formData.get("departureDate")),
    eta: parseDateOnly(formData.get("eta")),
    containerNo: emptyToNull(formData.get("containerNo")),
    blNo: emptyToNull(formData.get("blNo")),
    currency: (CURRENCIES as string[]).includes(currencyRaw) ? (currencyRaw as Currency) : null,
    totalAmount: parseDecimalOrNull(formData.get("totalAmount")),
  };
}

function submitValidationError(data: ReturnType<typeof readOrderFields>): string | null {
  const missing: string[] = [];
  if (!data.goodsCategory) missing.push("goods category");
  if (!data.description) missing.push("description");
  if (!data.originPort) missing.push("origin port");
  if (!data.destination) missing.push("destination");
  if (!data.currency) missing.push("currency");
  if (!data.totalAmount || data.totalAmount.lessThanOrEqualTo(0)) missing.push("total amount (greater than 0)");
  if (missing.length > 0) return `Before submitting, fill in: ${missing.join(", ")}.`;

  if (data.goodsCategory === "vehicle") {
    // Spec §5: VIN required for vehicles — which means every vehicle on the
    // order, not just the first.
    const missingVin = data.vehicles.findIndex((v) => !v.vin);
    if (missingVin !== -1) {
      return data.vehicles.length === 1
        ? "Before submitting, fill in: VIN."
        : `Before submitting, fill in the VIN for vehicle ${missingVin + 1}.`;
    }
    const vins = data.vehicles.map((v) => v.vin!.toUpperCase());
    const dupIndex = vins.findIndex((v, i) => vins.indexOf(v) !== i);
    if (dupIndex !== -1) {
      return `Vehicle ${dupIndex + 1} repeats a VIN already used on this order — each vehicle needs its own.`;
    }
  }

  if (data.departureDate && data.eta && data.eta.getTime() < data.departureDate.getTime()) {
    return "ETA can't be before the departure date.";
  }
  return null;
}

// Optional "payment received" block on the order form — a customer very
// often pays a deposit at the moment the order is raised, and making them
// save first and then reopen the order to record it was needless friction.
// An empty amount means "no payment", not an error.
type InitialPayment = { amount: Prisma.Decimal; method: PaymentMethod; proofFile: File | null; note: string | null };

function readInitialPayment(formData: FormData): { payment: InitialPayment | null } | { error: string } {
  const raw = String(formData.get("paymentAmount") ?? "").trim();
  if (!raw) return { payment: null };

  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) {
    return { error: "Payment received must be a number greater than 0, or left blank." };
  }
  const methodRaw = String(formData.get("paymentMethod") ?? "");
  if (!(PAYMENT_METHODS as string[]).includes(methodRaw)) {
    return { error: "Select a payment method for the amount received." };
  }
  const method = methodRaw as PaymentMethod;
  const proofFileValue = formData.get("paymentProofFile");
  const proofFile = proofFileValue instanceof File && proofFileValue.size > 0 ? proofFileValue : null;
  if (method !== "cash" && !proofFile) {
    return { error: "Attach proof of payment for the amount received." };
  }
  return {
    payment: {
      amount: new Prisma.Decimal(raw),
      method,
      proofFile,
      note: emptyToNull(formData.get("paymentNote")),
    },
  };
}

function uniqueConstraintMessage(err: unknown): string | null {
  const fields = uniqueConstraintFields(err);
  if (!fields) return null;
  const joined = fields.join(",");
  if (joined.includes("vin")) return "That VIN is already used by another order.";
  if (joined.includes("order_no")) return "Could not assign an order number — please try saving again.";
  return "That value is already in use.";
}

// Skips blocks the staff member left entirely empty (common while a draft is
// still being filled in) so a half-finished draft doesn't accumulate blank
// vehicle rows.
async function writeVehicles(tx: Prisma.TransactionClient, orderId: string, vehicles: VehicleDraft[]) {
  const rows = vehicles
    .map((v, i) => ({ ...v, position: i + 1 }))
    .filter((v) => v.make || v.model || v.year || v.colour || v.vin || v.engineNo);
  if (rows.length === 0) return;
  await tx.orderVehicle.createMany({ data: rows.map((v) => ({ ...v, orderId })) });
}

async function writePayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  currency: Currency,
  payment: InitialPayment,
  proofOfPaymentPath: string | null,
  userId: string,
) {
  await tx.orderPayment.create({
    data: {
      orderId,
      amount: payment.amount,
      currency,
      // Same currency as the order, so no conversion applies. A different
      // currency (with its own rate) can still be recorded later from the
      // order's own Record-payment modal.
      exchangeRate: new Prisma.Decimal(1),
      method: payment.method,
      proofOfPaymentPath,
      paidOn: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"),
      note: payment.note,
      recordedById: userId,
    },
  });
}

export type OrderFormState = { error: string } | { success: true; orderId: string } | undefined;

// One action backs both the "Save draft" and "Submit" buttons — which one
// was clicked comes through as `intent` (the browser includes the clicked
// submit button's name/value in FormData). Spec §5: "Save draft validates
// only the customer" — everything else stays nullable until intent=submit.
export async function saveOrderAction(_prevState: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const user = await requireRole(["freight_staff"]);

  const intent = formData.get("intent");
  if (intent !== "draft" && intent !== "submit") {
    return { error: "Invalid submission." };
  }

  const orderId = emptyToNull(formData.get("orderId"));
  const data = readOrderFields(formData);

  if (!data.customerId) return { error: "Select a customer." };
  const customer = await db.customer.findUnique({ where: { id: data.customerId }, select: { id: true } });
  if (!customer) return { error: "Select a valid customer." };

  if (intent === "submit") {
    const error = submitValidationError(data);
    if (error) return { error };
  }

  const paymentResult = readInitialPayment(formData);
  if ("error" in paymentResult) return { error: paymentResult.error };
  const initialPayment = paymentResult.payment;
  if (initialPayment && !data.currency) {
    return { error: "Choose the order currency before recording a payment against it." };
  }

  // Uploaded once here, before either transaction branch below — same
  // reasoning as completeSaleAction: a $transaction callback shouldn't hold
  // the DB connection open across a slow external network call.
  let initialPaymentProofPath: string | null = null;
  if (initialPayment?.proofFile) {
    const uploaded = await uploadProofImage(initialPayment.proofFile, "order-payments");
    if ("error" in uploaded) return { error: uploaded.error };
    initialPaymentProofPath = uploaded.path;
  }

  const writeData = {
    customerId: data.customerId,
    goodsCategory: data.goodsCategory,
    description: data.description,
    quantity: data.quantity,
    originPort: data.originPort,
    destination: data.destination,
    departureDate: data.departureDate,
    eta: data.eta,
    containerNo: data.containerNo,
    blNo: data.blNo,
    currency: data.currency,
    totalAmount: data.totalAmount ?? undefined,
  };

  try {
    let id: string;

    if (orderId) {
      const existing = await db.order.findUnique({ where: { id: orderId } });
      if (!existing || existing.createdById !== user.id) return { error: "That order no longer exists." };
      if (existing.status !== "draft") return { error: "Only drafts can be edited here." };

      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: writeData });
        // Vehicles are replaced wholesale rather than diffed: the block count
        // follows `quantity`, so an edit that changes quantity has no stable
        // per-row identity to match against. Safe here because a draft's
        // vehicles aren't referenced by anything else yet.
        await tx.orderVehicle.deleteMany({ where: { orderId } });
        await writeVehicles(tx, orderId, data.vehicles);
        if (initialPayment)
          await writePayment(tx, orderId, data.currency!, initialPayment, initialPaymentProofPath, user.id);
        if (intent === "submit") {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "submitted", submittedAt: new Date() },
          });
          await tx.orderStatusHistory.create({
            data: { orderId, fromStatus: "draft", toStatus: "submitted", changedById: user.id },
          });
        }
      });
      id = orderId;
    } else {
      const orderNo = await generateOrderNo();
      const created = await db.$transaction(async (tx) => {
        const order = await tx.order.create({ data: { ...writeData, orderNo, createdById: user.id } });
        // Opening row of the order's history, so the detail view can show
        // when it was first raised and by whom — `fromStatus` is null since
        // nothing preceded it.
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, toStatus: "draft", changedById: user.id },
        });
        await writeVehicles(tx, order.id, data.vehicles);
        if (initialPayment)
          await writePayment(tx, order.id, data.currency!, initialPayment, initialPaymentProofPath, user.id);
        if (intent === "submit") {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "submitted", submittedAt: new Date() },
          });
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, fromStatus: "draft", toStatus: "submitted", changedById: user.id },
          });
        }
        return order;
      });
      id = created.id;
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    return { success: true, orderId: id };
  } catch (err) {
    return { error: uniqueConstraintMessage(err) ?? "Could not save the order." };
  }
}

const paymentSchema = z.object({
  orderId: z.string().trim().min(1),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Amount must be a number with at most 2 decimals.")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0."),
  currency: z.enum(["USD", "RWF", "CDF"], { message: "Select a currency." }),
  exchangeRate: z
    .string()
    .trim()
    .min(1, "Exchange rate is required.")
    .refine((v) => /^\d+(\.\d{1,6})?$/.test(v), "Exchange rate must be a positive number.")
    .refine((v) => Number(v) > 0, "Exchange rate must be greater than 0."),
  method: z.enum(["cash", "momo", "bank", "card"], { message: "Select a payment method." }),
  paidOn: z.string().trim().min(1, "Payment date is required."),
  note: z.string().trim().optional(),
});

export type PaymentFormState = { error: string } | { success: true } | undefined;

export async function recordOrderPaymentAction(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const user = await requireRole(["manager", "freight_staff"]);

  const parsed = paymentSchema.safeParse({
    orderId: formData.get("orderId"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    exchangeRate: formData.get("exchangeRate"),
    method: formData.get("method"),
    paidOn: formData.get("paidOn"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const proofFileValue = formData.get("proofFile");
  const proofFile = proofFileValue instanceof File && proofFileValue.size > 0 ? proofFileValue : null;
  if (data.method !== "cash" && !proofFile) {
    return { error: "Attach proof of payment for this payment method." };
  }

  const paidOn = parseDateOnly(data.paidOn);
  if (!paidOn) return { error: "Enter a valid payment date." };

  const order = await db.order.findUnique({ where: { id: data.orderId }, select: { id: true, createdById: true } });
  if (!order) return { error: "That order no longer exists." };
  // Freight staff API scope: only ever their own orders — same rule as the
  // My-orders list query.
  if (user.role === "freight_staff" && order.createdById !== user.id) {
    return { error: "That order no longer exists." };
  }

  let proofOfPaymentPath: string | null = null;
  if (proofFile) {
    const uploaded = await uploadProofImage(proofFile, "order-payments");
    if ("error" in uploaded) return { error: uploaded.error };
    proofOfPaymentPath = uploaded.path;
  }

  await db.orderPayment.create({
    data: {
      orderId: data.orderId,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency,
      exchangeRate: new Prisma.Decimal(data.exchangeRate),
      method: data.method,
      proofOfPaymentPath,
      paidOn,
      note: data.note || null,
      recordedById: user.id,
    },
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${data.orderId}`);
  return { success: true };
}

// ─── Phase 5: manager edit + status lifecycle ──────────────────────────────
// authz.ts's editOrderAfterSubmit/changeOrderStatus permissions: manager
// only. "Post-submit" per the backlog — a draft is still the creating staff
// member's own workspace (saveOrderAction above), not this.

const MANAGER_EDITABLE_STATUSES: OrderStatus[] = ["submitted", "in_transit", "arrived", "delivered"];

function orderAuditSnapshot(o: {
  description: string | null;
  originPort: string | null;
  destination: Destination | null;
  departureDate: Date | null;
  eta: Date | null;
  containerNo: string | null;
  blNo: string | null;
  currency: Currency | null;
  totalAmount: Prisma.Decimal | null;
}): Record<string, string | null> {
  return {
    description: o.description,
    origin_port: o.originPort,
    destination: o.destination,
    departure_date: o.departureDate ? o.departureDate.toISOString().slice(0, 10) : null,
    eta: o.eta ? o.eta.toISOString().slice(0, 10) : null,
    container_no: o.containerNo,
    bl_no: o.blNo,
    currency: o.currency,
    total_amount: o.totalAmount ? o.totalAmount.toFixed(2) : null,
  };
}

function vehicleAuditSnapshot(v: VehicleDraft): Record<string, string | null> {
  return {
    make: v.make,
    model: v.model,
    year: v.year != null ? String(v.year) : null,
    colour: v.colour,
    vin: v.vin,
    engine_no: v.engineNo,
  };
}

export type UpdateOrderState = { error: string } | { success: true } | undefined;

// Fields the manager can correct once an order has left draft. Deliberately
// narrower than the staff authoring form: customer, goods category and
// quantity/vehicle-count are excluded — changing any of those on an order
// that may already be in transit is a different kind of edit than fixing a
// container number, and quantity specifically has no stable per-vehicle
// identity to reconcile against (see writeVehicles' own comment above).
// Cancel-and-recreate is the intended path if one of those is genuinely wrong.
export async function updateOrderAction(_prevState: UpdateOrderState, formData: FormData): Promise<UpdateOrderState> {
  const user = await requireRole(["manager"]);

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return { error: "Invalid order." };

  const existing = await db.order.findUnique({
    where: { id: orderId },
    include: { vehicles: { orderBy: { position: "asc" } } },
  });
  if (!existing) return { error: "That order no longer exists." };
  if (!MANAGER_EDITABLE_STATUSES.includes(existing.status)) {
    return { error: "This order can't be edited in its current state." };
  }

  // goodsCategory/quantity come through as hidden, unchangeable fields (see
  // manager-edit-form.tsx) so the shared parser/validator below still work
  // unmodified — readOrderFields' vehicle-block count follows quantity,
  // which is always existing.quantity here since the form never offers a way
  // to change it.
  const data = readOrderFields(formData);
  const error = submitValidationError(data);
  if (error) return { error };

  const writeData = {
    description: data.description,
    originPort: data.originPort,
    destination: data.destination,
    departureDate: data.departureDate,
    eta: data.eta,
    containerNo: data.containerNo,
    blNo: data.blNo,
    currency: data.currency,
    totalAmount: data.totalAmount ?? undefined,
  };

  try {
    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: writeData });

      await recordAuditChanges({
        tableName: "orders",
        recordId: orderId,
        changedById: user.id,
        before: orderAuditSnapshot(existing),
        after: orderAuditSnapshot({
          description: data.description,
          originPort: data.originPort,
          destination: data.destination,
          departureDate: data.departureDate,
          eta: data.eta,
          containerNo: data.containerNo,
          blNo: data.blNo,
          currency: data.currency,
          // Guaranteed non-null: submitValidationError above rejects a
          // missing/zero total before this point is ever reached.
          totalAmount: data.totalAmount,
        }),
      });

      if (existing.goodsCategory === "vehicle") {
        for (let i = 0; i < existing.vehicles.length; i++) {
          const before = existing.vehicles[i];
          const after = data.vehicles[i];
          if (!before || !after) continue; // quantity is fixed, so lengths always match
          await tx.orderVehicle.update({
            where: { id: before.id },
            data: {
              make: after.make,
              model: after.model,
              year: after.year,
              colour: after.colour,
              vin: after.vin,
              engineNo: after.engineNo,
            },
          });
          await recordAuditChanges({
            tableName: "order_vehicles",
            recordId: before.id,
            changedById: user.id,
            before: vehicleAuditSnapshot(before),
            after: vehicleAuditSnapshot(after),
          });
        }
      }
    });
  } catch (err) {
    return { error: uniqueConstraintMessage(err) ?? "Could not save changes." };
  }

  revalidatePath("/all-orders");
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

export type ChangeStatusState = { error: string } | { success: true } | undefined;

// One action for both halves of the lifecycle control: advancing forward
// (submitted → in_transit → arrived → delivered) and cancelling. Which one
// came through formData's `action` field, same "one action, intent decides
// the branch" shape as saveOrderAction's draft/submit split above.
export async function changeOrderStatusAction(
  _prevState: ChangeStatusState,
  formData: FormData,
): Promise<ChangeStatusState> {
  const user = await requireRole(["manager"]);

  const orderId = String(formData.get("orderId") ?? "").trim();
  const action = String(formData.get("action") ?? "");
  if (!orderId) return { error: "Invalid order." };

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "That order no longer exists." };

  if (action === "cancel") {
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return { error: "This order can no longer be cancelled." };
    }
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 5) return { error: "Enter a reason of at least 5 characters." };

    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: "cancelled", cancelledReason: reason } });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: "cancelled", note: reason, changedById: user.id },
      });
    });
  } else if (action === "advance") {
    const next = NEXT_STATUS[order.status];
    if (!next) return { error: "This order has no further status to move to." };

    // Spec's delivered-block rule: computed fresh here, never trusted from
    // the client — the same reasoning as every other server-side total in
    // this app.
    let overrideNote: string | null = null;
    if (next === "delivered") {
      const balance = await orderBalance(orderId, order.totalAmount ?? new Prisma.Decimal(0));
      if (balance.greaterThan(0)) {
        const note = String(formData.get("note") ?? "").trim();
        if (note.length < 5) {
          return {
            error: "This order still has an outstanding balance. Enter a reason (at least 5 characters) to deliver it anyway.",
          };
        }
        overrideNote = note;
      }
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: next,
          // First time actually arriving, not every re-visit of this branch —
          // arrived is the one status a shipment only ever reaches once.
          ...(next === "arrived" && !order.actualArrivalDate ? { actualArrivalDate: new Date() } : {}),
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: next, note: overrideNote, changedById: user.id },
      });
    });
  } else {
    return { error: "Invalid action." };
  }

  revalidatePath("/all-orders");
  revalidatePath("/dashboard");
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "submitted",
  "in_transit",
  "arrived",
  "delivered",
  "cancelled",
];

export type BulkStatusState = { error: string } | { success: true; count: number } | undefined;

// Bulk status update screen. One DB transaction covering every selected
// order (backlog's own rule) — either all of them move, or none do — with
// one order_status_history row per order, same as the single-order action.
// The client defers actually calling this until its own undo window has
// elapsed (see bulk-status-list.tsx), so by the time this runs the manager
// has already committed to it.
export async function bulkChangeOrderStatusAction(
  _prevState: BulkStatusState,
  formData: FormData,
): Promise<BulkStatusState> {
  const user = await requireRole(["manager"]);

  const orderIds = [...new Set(formData.getAll("orderId").map(String).filter(Boolean))];
  if (orderIds.length === 0) return { error: "Select at least one order." };
  const action = String(formData.get("action") ?? "");

  const orders = await db.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true, totalAmount: true, actualArrivalDate: true },
  });
  if (orders.length !== orderIds.length) {
    return { error: "One of the selected orders no longer exists — refresh and try again." };
  }

  if (action === "cancel") {
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 5) return { error: "Enter a reason of at least 5 characters." };
    if (orders.some((o) => !CANCELLABLE_STATUSES.includes(o.status))) {
      return { error: "One of the selected orders can no longer be cancelled — refresh and try again." };
    }

    await db.$transaction(async (tx) => {
      for (const o of orders) {
        await tx.order.update({ where: { id: o.id }, data: { status: "cancelled", cancelledReason: reason } });
        await tx.orderStatusHistory.create({
          data: { orderId: o.id, fromStatus: o.status, toStatus: "cancelled", note: reason, changedById: user.id },
        });
      }
    });

    revalidatePath("/bulk-status");
    revalidatePath("/all-orders");
    revalidatePath("/dashboard");
    return { success: true, count: orders.length };
  }

  if (action === "advance") {
    const fromStatus = String(formData.get("fromStatus") ?? "");
    if (!(ALL_ORDER_STATUSES as string[]).includes(fromStatus)) return { error: "Invalid status." };
    const next = NEXT_STATUS[fromStatus as OrderStatus];
    if (!next) return { error: "There is no further status to move these orders to." };
    // Guards a race: the queue the manager ticked from could be stale by the
    // time the undo window elapses and this actually runs (someone else
    // already advanced one of them, for instance).
    if (orders.some((o) => o.status !== fromStatus)) {
      return { error: "One of the selected orders has already changed status — refresh and try again." };
    }

    if (next === "delivered") {
      // Bulk-delivering with a balance still open needs the same override
      // reasoning the single-order action requires, but that's a per-order
      // note, not a batch one — simplest correct rule here is to block the
      // whole batch and point at the individual flow instead of silently
      // skipping some orders or asking for one note to cover all of them.
      const balances = await paidTotalByOrder(orderIds);
      const stillOwing = orders.filter((o) =>
        (o.totalAmount ?? new Prisma.Decimal(0)).minus(balances.get(o.id) ?? new Prisma.Decimal(0)).greaterThan(0),
      );
      if (stillOwing.length > 0) {
        return {
          error: `${stillOwing.length} of the selected orders still ${stillOwing.length === 1 ? "has" : "have"} a balance outstanding — deliver ${stillOwing.length === 1 ? "it" : "those"} individually with an override note.`,
        };
      }
    }

    await db.$transaction(async (tx) => {
      for (const o of orders) {
        await tx.order.update({
          where: { id: o.id },
          data: {
            status: next,
            ...(next === "arrived" && !o.actualArrivalDate ? { actualArrivalDate: new Date() } : {}),
          },
        });
        await tx.orderStatusHistory.create({
          data: { orderId: o.id, fromStatus: o.status, toStatus: next, changedById: user.id },
        });
      }
    });

    revalidatePath("/bulk-status");
    revalidatePath("/all-orders");
    revalidatePath("/dashboard");
    return { success: true, count: orders.length };
  }

  return { error: "Invalid action." };
}

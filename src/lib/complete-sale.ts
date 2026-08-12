import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { generateSaleNo } from "@/lib/sale-no";
import { uniqueConstraintFields } from "@/lib/prisma-errors";

// Shared by completeSaleAction (any payment method, called directly while
// online) and the offline cash-sale route (src/app/api/sale/complete-cash) —
// one place for how a sale is actually written, so the two callers can never
// drift apart on validation or the stock-deduction transaction.

const decimalString = (label: string, { min = 0 }: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a number with at most 2 decimals.`)
    .refine((v) => Number(v) >= min, `${label} cannot be less than ${min}.`);

export const lineSchema = z.object({
  itemId: z.string().trim().min(1),
  quantity: decimalString("Quantity", { min: 0.01 }),
  unitPrice: decimalString("Price", { min: 0 }),
});

export type LineDraft = { itemId: string; quantity: string; unitPrice: string };

export class InsufficientStockError extends Error {
  constructor(
    public sku: string,
    public name: string,
  ) {
    super(`Insufficient stock for ${sku}`);
  }
}

// Thrown when a cart line points at an item that has since been deactivated
// or removed — typed rather than a plain Error so the cashier is told which
// item to take out, instead of the catch-all "could not complete" that gave
// them nothing to act on.
export class ItemUnavailableError extends Error {
  constructor(public label: string) {
    super(`Item unavailable: ${label}`);
  }
}

function isSaleNoConflict(err: unknown): boolean {
  const fields = uniqueConstraintFields(err);
  return fields ? fields.join(",").includes("sale_no") : false;
}

function isClientRequestIdConflict(err: unknown): boolean {
  const fields = uniqueConstraintFields(err);
  return fields ? fields.join(",").includes("client_request_id") : false;
}

// Sale numbers are generated and consumed in the same step (no human
// edit/review gap the way a purchase number gets, since completing a sale is
// one tap) — two counters checking out at the same instant could read the
// same "next" number, so the whole transaction is retried on a collision
// rather than trusting the read-then-format generator to be race-free.
//
// clientRequestId makes the whole call idempotent: checked once upfront (the
// common case — a straightforward retry of an already-completed sale, no
// need to touch the transaction machinery at all) and again inside the
// catch block for the rare genuine race (two near-simultaneous retries both
// pass the upfront check, one wins the insert, the other hits the unique
// constraint and reads back what the winner wrote instead of erroring).
export async function attemptCompleteSale(
  userId: string,
  header: { paymentMethod: PaymentMethod; proofOfPaymentPath: string | null },
  lines: LineDraft[],
  clientRequestId: string | null,
) {
  if (clientRequestId) {
    const existing = await db.sale.findUnique({ where: { clientRequestId } });
    if (existing) return existing;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const saleNo = await generateSaleNo();
    try {
      return await db.$transaction(
        async (tx) => {
          const itemIds = [...new Set(lines.map((l) => l.itemId))];

          // Two upfront reads, run concurrently, instead of a stock query
          // per cart line: with enough lines the old per-line query drove
          // the transaction past Prisma's interactive-transaction timeout
          // (real bug — a 7-line cart took 21+ sequential round trips to the
          // hosted DB and expired at 5.4s). Running deductions are tracked
          // in-memory below so two lines naming the same item still check
          // against what earlier lines in this same cart already used —
          // same guarantee the per-line query used to give.
          const [items, stockAgg] = await Promise.all([
            tx.item.findMany({ where: { id: { in: itemIds } } }),
            tx.stockMovement.groupBy({
              by: ["itemId"],
              where: { itemId: { in: itemIds } },
              _sum: { quantity: true },
            }),
          ]);
          const itemById = new Map(items.map((i) => [i.id, i]));
          const onHandByItem = new Map(stockAgg.map((s) => [s.itemId, s._sum.quantity ?? new Prisma.Decimal(0)]));

          let total = new Prisma.Decimal(0);
          for (const line of lines) {
            const item = itemById.get(line.itemId);
            if (!item || !item.isActive) {
              throw new ItemUnavailableError(item ? `${item.sku} (${item.name})` : "An item in this cart");
            }
            total = total.plus(new Prisma.Decimal(line.quantity).times(line.unitPrice));
          }

          const sale = await tx.sale.create({
            data: {
              saleNo,
              clientRequestId,
              paymentMethod: header.paymentMethod,
              proofOfPaymentPath: header.proofOfPaymentPath,
              total,
              soldById: userId,
            },
          });

          const deductedByItem = new Map<string, Prisma.Decimal>();
          const saleItemRows: Prisma.SaleItemCreateManyInput[] = [];
          const movementRows: Prisma.StockMovementCreateManyInput[] = [];

          for (const line of lines) {
            const item = itemById.get(line.itemId)!;
            const quantity = new Prisma.Decimal(line.quantity);
            const unitPrice = new Prisma.Decimal(line.unitPrice);

            // Spec's "a sale that would drive stock below zero is rejected,"
            // checked against the ledger as it stood at the start of this
            // transaction, minus whatever earlier lines in this same cart
            // have already claimed.
            const available = onHandByItem.get(line.itemId) ?? new Prisma.Decimal(0);
            const alreadyDeducted = deductedByItem.get(line.itemId) ?? new Prisma.Decimal(0);
            if (available.minus(alreadyDeducted).minus(quantity).lessThan(0)) {
              throw new InsufficientStockError(item.sku, item.name);
            }
            deductedByItem.set(line.itemId, alreadyDeducted.plus(quantity));

            saleItemRows.push({
              saleId: sale.id,
              itemId: line.itemId,
              quantity,
              unitPrice,
              // Compared against the item's sell price at this exact moment
              // and frozen here — not recomputed later if sell_price changes.
              isUnderPrice: unitPrice.lessThan(item.sellPrice),
            });
            movementRows.push({
              itemId: line.itemId,
              movementType: "sale",
              quantity: quantity.negated(),
              referenceType: "sale",
              referenceId: sale.id,
              createdById: userId,
            });
          }

          await tx.saleItem.createMany({ data: saleItemRows });
          await tx.stockMovement.createMany({ data: movementRows });

          return sale;
        },
        // Defense in depth on top of the query-count fix above — Prisma's
        // own error for this exact failure suggests raising this alongside
        // doing less work in the transaction.
        { timeout: 10000 },
      );
    } catch (err) {
      if (isSaleNoConflict(err) && attempt < 2) continue;
      if (clientRequestId && isClientRequestIdConflict(err)) {
        const existing = await db.sale.findUnique({ where: { clientRequestId } });
        if (existing) return existing;
      }
      throw err;
    }
  }
  throw new Error("Could not generate a sale number.");
}

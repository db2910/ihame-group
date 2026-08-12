"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_PILL } from "../format";
import { RecordPaymentModal } from "./record-payment-modal";
import { ManagerEditForm, type ManagerEditableOrder } from "./manager-edit-form";
import { StatusControls } from "./status-controls";

export type OrderDetail = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  isLocked: boolean;
  lockedNote: string | null;
  fields: { label: string; value: string; mono?: boolean }[];
  vehicles: {
    id: string;
    position: number;
    title: string;
    subtitle: string;
    vin: string | null;
    engineNo: string | null;
  }[];
  currency: string | null;
  totalShort: string;
  paidShort: string;
  balanceShort: string;
  balanceDisplay: string;
  balanceRaw: number;
  paidPercent: number;
  cancelledReason: string | null;
  payments: {
    id: string;
    amountDisplay: string;
    method: PaymentMethod;
    paidOnDisplay: string;
    hasProofOfPayment: boolean;
    note: string | null;
    recordedBy: string;
  }[];
  statusHistory: { id: string; at: string; what: string; by: string }[];
  // Manager-only (Phase 5 Round 4). `editable` carries the raw field values
  // ManagerEditForm needs to prefill — null whenever canManage is false, so
  // a staff viewer's payload never has to shape it.
  canManage: boolean;
  editable: ManagerEditableOrder | null;
  // Shown to every viewer, not just the manager — a freight staff member can
  // see what the manager corrected on their own order, same transparency
  // Status history already gives for lifecycle changes.
  editHistory: { id: string; at: string; field: string; from: string; to: string; by: string }[];
};

const METHOD_LABEL: Record<PaymentMethod, string> = { cash: "Cash", momo: "MoMo", bank: "Bank", card: "Card" };

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[5px] border border-border bg-card p-5 md:px-5.5 ${className}`}>{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-3.5 font-sans text-[13px] font-semibold text-ink">{children}</div>;
}

export function OrderDetailView({
  order,
  backHref = "/orders",
  backLabel = "← My orders",
}: {
  order: OrderDetail;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const showEditButton = order.canManage && order.editable && !editing;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3.5">
        {/* Back link + order no + status pill, per the mock's header row. */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <Link href={backHref} className="flex-none font-sans text-[13px] font-medium text-brand hover:underline">
            {backLabel}
          </Link>
          <div className="font-sans text-[19px] font-semibold text-ink">{order.orderNo}</div>
          <span
            className={`inline-flex flex-none items-center rounded-full px-2.5 py-[3px] font-sans text-[11px] font-medium ${STATUS_PILL[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
          {showEditButton && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto flex h-9 flex-none cursor-pointer items-center rounded border border-input-border px-3.5 font-sans text-[13px] font-medium text-ink-secondary hover:bg-row-hover"
            >
              Edit
            </button>
          )}
        </div>

        {editing && order.editable ? (
          <ManagerEditForm
            order={order.editable}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        ) : (
          <>
            {order.isLocked && order.lockedNote && (
              <div className="flex items-start gap-2.5 rounded-[5px] border border-warning-border bg-warning-bg px-4 py-3">
                <span className="mt-[6px] h-[7px] w-[7px] flex-none rounded-full bg-alert" />
                <div className="font-sans text-[12.5px] leading-[1.5] text-warning-text">{order.lockedNote}</div>
              </div>
            )}

            {order.status === "cancelled" && order.cancelledReason && (
              <div className="rounded-[5px] border border-warning-border bg-warning-bg px-4 py-3">
                <div className="font-sans text-[12.5px] font-semibold text-alert">Cancelled</div>
                <div className="mt-0.5 font-sans text-[12.5px] text-warning-text">{order.cancelledReason}</div>
              </div>
            )}

            {order.canManage && (
              <StatusControls
                orderId={order.id}
                status={order.status}
                balance={order.balanceRaw}
                balanceDisplay={order.balanceDisplay}
              />
            )}

            {/* Mock's 1.5fr / 1fr split — stacks on phones. */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[1.5fr_1fr]">
              <div className="flex min-w-0 flex-col gap-3.5">
                <Card>
                  <CardTitle>Order</CardTitle>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
                    {order.fields.map((f) => (
                      <div
                        key={f.label}
                        className="flex items-baseline justify-between gap-3 border-b border-hairline py-2.5"
                      >
                        <span className="flex-none font-sans text-[12px] text-ink-faint">{f.label}</span>
                        <span
                          className={`min-w-0 truncate text-right text-[12.5px] font-medium text-ink ${f.mono === false ? "font-sans" : "font-mono"}`}
                        >
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {order.vehicles.length > 0 && (
                  <Card>
                    <CardTitle>
                      {order.vehicles.length === 1 ? "Vehicle" : `Vehicles · ${order.vehicles.length}`}
                    </CardTitle>
                    <div className="flex flex-col gap-2.5">
                      {order.vehicles.map((v) => (
                        <div
                          key={v.id}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded border border-hairline-2 bg-app px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <div className="font-sans text-[13px] font-medium text-ink">
                              <span className="mr-1.5 font-mono text-[11px] text-ink-faint">{v.position}</span>
                              {v.title}
                            </div>
                            {v.subtitle && (
                              <div className="mt-0.5 font-sans text-[11.5px] text-ink-faint">{v.subtitle}</div>
                            )}
                          </div>
                          <div className="min-w-0 text-right">
                            <div className="truncate font-mono text-[12px] text-ink">{v.vin ?? "—"}</div>
                            {v.engineNo && (
                              <div className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                                Engine {v.engineNo}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="flex-1">
                  <CardTitle>Status history</CardTitle>
                  {order.statusHistory.length === 0 && (
                    <div className="font-sans text-[12.5px] text-ink-faint">No status changes recorded yet.</div>
                  )}
                  {order.statusHistory.map((h) => (
                    <div
                      key={h.id}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-hairline py-2 font-sans text-[12.5px] text-ink-secondary last:border-b-0"
                    >
                      <span className="w-[78px] flex-none font-mono text-[11.5px] text-ink-faint">{h.at}</span>
                      <span className="min-w-0 flex-1">{h.what}</span>
                      <span className="flex-none text-ink-faint">{h.by}</span>
                    </div>
                  ))}
                </Card>

                {order.editHistory.length > 0 && (
                  <Card>
                    <CardTitle>Edit history</CardTitle>
                    <div className="flex flex-col gap-2">
                      {order.editHistory.map((e) => (
                        <div key={e.id} className="border-b border-hairline pb-2 last:border-b-0 last:pb-0">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-sans text-[12.5px] text-ink-secondary">
                            <span className="w-[78px] flex-none font-mono text-[11.5px] text-ink-faint">
                              {e.at}
                            </span>
                            <span className="min-w-0 flex-1 font-medium text-ink">{e.field}</span>
                            <span className="flex-none text-ink-faint">{e.by}</span>
                          </div>
                          <div className="mt-1 pl-[90px] font-mono text-[11.5px] text-ink-faint">
                            {e.from || "—"} <span className="text-ink-disabled">→</span> {e.to || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-3.5">
                {/* Dark totals card: the mock's answer to "where's the balance?"
                    — agreed total and paid side by side, a fill bar for how much
                    of the order is settled, balance underneath. */}
                <div className="rounded-[5px] bg-dark p-5 text-white md:px-5.5">
                  <div className="flex justify-between font-sans text-[12px] text-white/55">
                    <span>Agreed total</span>
                    <span>Paid</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[22px] font-semibold">{order.totalShort}</span>
                    <span className="font-mono text-[15px] font-medium text-accent">{order.paidShort}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-white/15">
                    <div className="h-full rounded-[3px] bg-accent" style={{ width: `${order.paidPercent}%` }} />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between font-sans text-[12px] text-white/55">
                    <span>Balance</span>
                    <span className="font-mono text-[14px] font-semibold text-white">{order.balanceShort}</span>
                  </div>
                </div>

                <Card className="flex flex-1 flex-col">
                  <CardTitle>Payments</CardTitle>
                  {order.payments.length === 0 && (
                    <div className="font-sans text-[12.5px] text-ink-faint">No payments recorded yet.</div>
                  )}
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex gap-3 border-b border-hairline py-2.5">
                      {/* Phase 7: a real, private, authenticated-served image —
                          this <img> src hits /orders/[id]/payments/[paymentId]/proof,
                          which re-checks the session and this order's ownership
                          before streaming any bytes back. Hatched placeholder
                          when nothing is attached, so a missing proof reads as
                          missing rather than as an absent feature. */}
                      {p.hasProofOfPayment ? (
                        <a
                          href={`/orders/${order.id}/payments/${p.id}/proof`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 w-11 flex-none overflow-hidden rounded border border-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated, non-public source; next/image can't proxy this through its own optimizer */}
                          <img
                            src={`/orders/${order.id}/payments/${p.id}/proof`}
                            alt="Proof of payment"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-11 w-11 flex-none items-center justify-center rounded border border-warning-border bg-warning-bg text-center font-mono text-[8px] leading-tight text-warning-text">
                          no proof
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-sans text-[13px] font-medium text-ink">
                          {p.amountDisplay} · {METHOD_LABEL[p.method]}
                        </div>
                        <div className="mt-0.5 truncate font-sans text-[11.5px] text-ink-faint">
                          {[p.note, p.paidOnDisplay, p.recordedBy].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-3.5 md:mt-auto md:pt-3.5">
                    {order.status === "draft" ? (
                      <div className="rounded-[5px] border border-hairline-2 bg-app px-3.5 py-2.5 font-sans text-[12.5px] text-ink-faint">
                        Payments can be recorded once this order is submitted.
                      </div>
                    ) : (
                      <>
                        <RecordPaymentModal
                          orderId={order.id}
                          defaultCurrency={order.currency}
                          balanceDisplay={order.balanceDisplay}
                        />
                        <div className="mt-2 font-sans text-[11px] leading-[1.5] text-ink-faint">
                          Proof of payment is required for every method except cash.
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

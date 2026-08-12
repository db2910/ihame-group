"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { changeOrderStatusAction, type ChangeStatusState } from "../actions";
import { NEXT_STATUS, CANCELLABLE_STATUSES, STATUS_LABEL } from "../format";
import type { OrderStatus } from "@/generated/prisma/enums";

function ErrorNote({ state }: { state: ChangeStatusState }) {
  if (!state || !("error" in state)) return null;
  return (
    <div className="rounded border border-warning-border bg-warning-bg px-3.5 py-2.5 font-sans text-[13px] text-warning-text">
      {state.error}
    </div>
  );
}

function AdvanceModal({
  orderId,
  current,
  next,
  hasOutstandingBalance,
  balanceDisplay,
  onClose,
  onDone,
}: {
  orderId: string;
  current: OrderStatus;
  next: OrderStatus;
  hasOutstandingBalance: boolean;
  balanceDisplay: string;
  onClose: () => void;
  onDone: () => void;
}) {
  // Spec's delivered-block rule: a note is only asked for here so the
  // manager isn't stopped by a field they don't need — the server enforces
  // the real requirement independently (changeOrderStatusAction), this is
  // just the UI staying out of the way for the common case.
  const requiresNote = next === "delivered" && hasOutstandingBalance;

  const [state, action, pending] = useActionState<ChangeStatusState, FormData>(async (prevState, formData) => {
    const result = await changeOrderStatusAction(prevState, formData);
    if (result && "success" in result) {
      showToast(`Order marked ${STATUS_LABEL[next].toLowerCase()}`);
      onDone();
    }
    return result;
  }, undefined);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Mark as ${STATUS_LABEL[next]}`}
      footer={
        <button
          type="submit"
          form="advance-status-form"
          disabled={pending}
          className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-brand font-sans text-base font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
        >
          {pending ? "Saving…" : `Mark as ${STATUS_LABEL[next]}`}
        </button>
      }
    >
      <form id="advance-status-form" action={action} className="flex flex-col gap-3">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="action" value="advance" />
        <ErrorNote state={state} />

        {requiresNote ? (
          <>
            <div className="flex items-start gap-2.5 rounded border border-warning-border bg-warning-bg px-3.5 py-2.5">
              <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full bg-alert" />
              <div className="font-sans text-[12.5px] leading-[1.5] text-warning-text">
                This order still has an outstanding balance of {balanceDisplay}. Enter a reason to deliver it anyway
                — it is recorded on the status history below.
              </div>
            </div>
            <textarea
              name="note"
              required
              rows={2}
              placeholder="Why deliver with a balance still outstanding?"
              className="focus-ring-brand w-full resize-none rounded border border-input-border p-3 font-sans text-sm text-ink outline-none"
            />
          </>
        ) : (
          <div className="font-sans text-[13.5px] text-ink-secondary">
            This moves the order from {STATUS_LABEL[current]} to {STATUS_LABEL[next]}.
          </div>
        )}
      </form>
    </Modal>
  );
}

function CancelModal({
  orderId,
  onClose,
  onDone,
}: {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ChangeStatusState, FormData>(async (prevState, formData) => {
    const result = await changeOrderStatusAction(prevState, formData);
    if (result && "success" in result) {
      showToast("Order cancelled");
      onDone();
    }
    return result;
  }, undefined);

  return (
    <Modal
      open
      onClose={onClose}
      title="Cancel order"
      footer={
        <button
          type="submit"
          form="cancel-status-form"
          disabled={pending}
          className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-alert font-sans text-base font-semibold text-white hover:opacity-90 disabled:opacity-70"
        >
          {pending ? "Cancelling…" : "Cancel this order"}
        </button>
      }
    >
      <form id="cancel-status-form" action={action} className="flex flex-col gap-3">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="action" value="cancel" />
        <ErrorNote state={state} />
        <div className="font-sans text-[13px] leading-[1.5] text-ink-secondary">
          The order stays in the record as cancelled — this does not delete anything, and cannot be reversed from
          here.
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[11.5px] font-medium tracking-[0.04em] text-ink-muted uppercase">
            Reason
          </label>
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Why is this order being cancelled?"
            className="focus-ring-brand w-full resize-none rounded border border-input-border p-3 font-sans text-sm text-ink outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}

// Manager-only lifecycle control (authz.ts's changeOrderStatus permission).
// Renders nothing once an order reaches a terminal state (delivered has no
// further forward step and isn't cancellable; cancelled has neither).
export function StatusControls({
  orderId,
  status,
  balance,
  balanceDisplay,
}: {
  orderId: string;
  status: OrderStatus;
  balance: number;
  balanceDisplay: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"advance" | "cancel" | null>(null);
  const next = NEXT_STATUS[status];
  const canCancel = CANCELLABLE_STATUSES.includes(status);

  if (!next && !canCancel) return null;

  function handleDone() {
    setModal(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {next && (
        <button
          type="button"
          onClick={() => setModal("advance")}
          className="flex h-10 cursor-pointer items-center rounded bg-brand px-4 font-sans text-[13.5px] font-semibold text-white hover:bg-brand-hover"
        >
          Mark as {STATUS_LABEL[next]}
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={() => setModal("cancel")}
          className="flex h-10 cursor-pointer items-center rounded border border-warning-border px-4 font-sans text-[13.5px] font-medium text-alert hover:bg-warning-bg"
        >
          Cancel order
        </button>
      )}

      {modal === "advance" && next && (
        <AdvanceModal
          orderId={orderId}
          current={status}
          next={next}
          hasOutstandingBalance={balance > 0}
          balanceDisplay={balanceDisplay}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
      {modal === "cancel" && <CancelModal orderId={orderId} onClose={() => setModal(null)} onDone={handleDone} />}
    </div>
  );
}

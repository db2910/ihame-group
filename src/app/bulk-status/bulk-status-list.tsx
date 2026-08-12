"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { bulkChangeOrderStatusAction } from "@/app/orders/actions";
import { NEXT_STATUS, STATUS_LABEL } from "@/app/orders/format";
import type { OrderStatus, Destination } from "@/generated/prisma/enums";

const UNDO_SECONDS = 6;

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

type Pending = { ids: string[]; label: string; secondsLeft: number };

// Plain-object row shape built server-side (see page.tsx) — Prisma's
// Decimal can't cross into this "use client" component, so balance arrives
// already formatted.
export type BulkOrderRow = {
  id: string;
  orderNo: string;
  customerName: string;
  destination: Destination | null;
  balanceDisplay: string;
};

export function BulkStatusList({ status, orders }: { status: OrderStatus; orders: BulkOrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const timers = useRef<{ interval: ReturnType<typeof setInterval>; timeout: ReturnType<typeof setTimeout> } | null>(
    null,
  );

  // A pending advance is meant to survive this component unmounting —
  // switching the status filter chip remounts it (key={status} on the
  // page), and that's just changing what you're looking at, not a cancel.
  // Only the countdown display is torn down here; the actual deferred
  // action (the timeout below) keeps running in the background regardless,
  // same as an email client's "undo send" continuing after you switch tabs.
  // Clicking "Undo" itself is the only thing that should cancel it.
  useEffect(() => {
    return () => {
      if (timers.current) clearInterval(timers.current.interval);
    };
  }, []);

  const next = NEXT_STATUS[status];

  function toggle(id: string) {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  function runBulkAction(ids: string[], buildFormData: (fd: FormData) => void, doneLabel: (count: number) => string) {
    const fd = new FormData();
    ids.forEach((id) => fd.append("orderId", id));
    buildFormData(fd);
    return bulkChangeOrderStatusAction(undefined, fd).then((result) => {
      if (result && "error" in result) {
        showToast(result.error, "error");
      } else if (result && "success" in result) {
        showToast(doneLabel(result.count));
      }
      router.refresh();
    });
  }

  function startAdvance() {
    if (!next || selected.size === 0) return;
    const ids = [...selected];
    setSelected(new Set());
    setPending({ ids, label: STATUS_LABEL[next], secondsLeft: UNDO_SECONDS });

    const interval = setInterval(() => {
      setPending((p) => (p ? { ...p, secondsLeft: p.secondsLeft - 1 } : p));
    }, 1000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      timers.current = null;
      setPending(null);
      runBulkAction(
        ids,
        (fd) => {
          fd.set("action", "advance");
          fd.set("fromStatus", status);
        },
        (count) => `${count} order${count === 1 ? "" : "s"} marked ${STATUS_LABEL[next].toLowerCase()}`,
      );
    }, UNDO_SECONDS * 1000);
    timers.current = { interval, timeout };
  }

  function undoAdvance() {
    if (timers.current) {
      clearInterval(timers.current.interval);
      clearTimeout(timers.current.timeout);
      timers.current = null;
    }
    setPending(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {orders.length === 0 && (
          <div className="px-4.5 py-10 text-center font-sans text-[14px] text-ink-faint">
            Nothing at this status right now.
          </div>
        )}
        {orders.map((r) => {
          const checked = selected.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className="flex w-full cursor-pointer items-center gap-3.5 border-b border-hairline px-4.5 py-4 text-left hover:bg-row-hover md:px-6.5"
            >
              <span
                aria-hidden="true"
                className={`h-[22px] w-[22px] flex-none rounded border-[1.5px] ${
                  checked ? "border-brand bg-brand" : "border-input-border bg-card"
                }`}
              >
                {checked && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full p-[3px]">
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[14px] font-medium text-ink">{r.customerName}</span>
                <span className="mt-0.5 block truncate font-mono text-[11.5px] text-ink-faint">
                  {r.orderNo} · {r.destination ? titleCase(r.destination) : "—"}
                </span>
              </span>
              <span className="flex-none font-mono text-[13px] font-medium text-ink">{r.balanceDisplay}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-none border-t border-hairline-2 bg-card px-4.5 py-3.5 md:px-6.5">
        {pending ? (
          <div className="flex items-center justify-between gap-3 rounded-[5px] border border-warning-border bg-warning-bg px-3.5 py-2.5">
            <span className="font-sans text-[13px] text-warning-text">
              Marking {pending.ids.length} order{pending.ids.length === 1 ? "" : "s"} {pending.label.toLowerCase()} in{" "}
              {pending.secondsLeft}s…
            </span>
            <button
              type="button"
              onClick={undoAdvance}
              className="flex-none cursor-pointer font-sans text-[13px] font-semibold text-brand hover:underline"
            >
              Undo
            </button>
          </div>
        ) : (
          <>
            <div className="font-sans text-[12.5px] text-ink-faint">
              {selected.size > 0 ? `${selected.size} selected — set all to` : "Select orders above to update them"}
            </div>
            <div className="mt-2.5 flex gap-2.5">
              <button
                type="button"
                onClick={startAdvance}
                disabled={!next || selected.size === 0}
                className="flex h-[50px] flex-1 cursor-pointer items-center justify-center rounded-[5px] bg-accent font-sans text-[15px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {next ? STATUS_LABEL[next] : "—"}
              </button>
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                disabled={selected.size === 0}
                className="h-[50px] w-[110px] flex-none cursor-pointer rounded-[5px] border border-input-border font-sans text-[14px] font-medium text-ink-secondary hover:bg-row-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                More…
              </button>
            </div>
          </>
        )}
      </div>

      <CancelSelectedModal
        open={cancelOpen}
        count={selected.size}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => {
          const ids = [...selected];
          setCancelOpen(false);
          setSelected(new Set());
          runBulkAction(
            ids,
            (fd) => {
              fd.set("action", "cancel");
              fd.set("reason", reason);
            },
            (count) => `${count} order${count === 1 ? "" : "s"} cancelled`,
          );
        }}
      />
    </div>
  );
}

function CancelSelectedModal({
  open,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cancel ${count} order${count === 1 ? "" : "s"}`}
      footer={
        <button
          type="button"
          onClick={() => {
            if (reason.trim().length < 5) return;
            onConfirm(reason.trim());
            setReason("");
          }}
          disabled={reason.trim().length < 5}
          className="flex h-[46px] w-full cursor-pointer items-center justify-center rounded bg-alert font-sans text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel {count} order{count === 1 ? "" : "s"}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="font-sans text-[13px] leading-[1.5] text-ink-secondary">
          Every selected order stays in the record as cancelled, with the same reason attached to each — this does
          not delete anything, and cannot be reversed from here.
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[11.5px] font-medium tracking-[0.04em] text-ink-muted uppercase">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Why are these orders being cancelled?"
            className="focus-ring-brand w-full resize-none rounded border border-input-border p-3 font-sans text-sm text-ink outline-none"
          />
        </div>
      </div>
    </Modal>
  );
}

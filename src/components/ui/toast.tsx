"use client";

import { useEffect, useState } from "react";

const TOAST_EVENT = "ihame:toast";

type ToastType = "success" | "error";
type ToastDetail = { message: string; type: ToastType };

// Fire-and-forget confirmation — call after a save/deactivate/etc completes.
// A CustomEvent rather than context/props because the things that need to
// call it (modals, row actions) live nowhere near a single shared ancestor,
// and every authenticated screen already mounts one <Toaster/> via its shell.
//
// `type` defaults to "success" — every existing call site in the app only
// ever reports a completed action, with errors shown inline in the form/
// modal that's still open. "error" exists for bulk-status's deferred bulk
// action specifically: it can fail *after* the modal that started it has
// already closed, so there's no inline surface left to show the error in by
// the time it's known.
export function showToast(message: string, type: ToastType = "success") {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, type } }));
}

type ToastItem = { id: number; message: string; type: ToastType };

let nextId = 0;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const { message, type } = (e as CustomEvent<ToastDetail>).detail;
      const id = nextId++;
      setToasts((t) => [...t, { id, message, type }]);
      // Errors stay up longer — they're more likely to need actually reading
      // (e.g. bulk-status's "deliver those individually" follow-up), not
      // just a glance-and-dismiss confirmation.
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 5000 : 3000);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-md bg-dark px-4 py-2.5 font-sans text-[15px] font-medium text-white shadow-[0_8px_28px_rgba(26,26,26,.25)]"
        >
          <span aria-hidden="true" className={t.type === "error" ? "text-alert" : "text-accent"}>
            {t.type === "error" ? "⚠" : "✓"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

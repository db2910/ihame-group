"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // Pinned below the scrolling body — put the primary submit here so it stays
  // reachable on a phone with the keyboard up. A submit button outside its
  // <form> still submits it via the `form="<id>"` attribute.
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useScrollLock(open);

  if (!open) return null;

  // Portaled to <body>: a modal opened from inside another <form> (e.g. the
  // order form's inline "+ New customer") would otherwise nest a <form>
  // inside a <form> in the real DOM — invalid HTML, and the browser resolves
  // the inner submit against the wrong form.
  return createPortal(
    // Bottom sheet on phones (thumb-reachable, and it sits above the keyboard
    // rather than being pushed off the top), centred dialog from sm up.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      {/*
        `dvh`, not `vh`: the on-screen keyboard and the browser's own URL bar
        both shrink the visible viewport, while `100vh` keeps reporting the
        *largest* size — which is how the submit button ended up unreachable.
      */}
      <div className="relative flex max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[14px] border border-border bg-card shadow-[0_8px_28px_rgba(26,26,26,.15)] sm:max-h-[86dvh] sm:rounded-[6px]">
        <div className="flex flex-none items-center justify-between gap-3 border-b border-hairline-2 px-5 py-3.5 sm:px-6">
          <div className="min-w-0 truncate font-sans text-base font-semibold text-ink">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded font-sans text-sm text-ink-faint hover:bg-row-hover hover:text-ink-muted"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex-none border-t border-hairline-2 px-5 py-3 sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

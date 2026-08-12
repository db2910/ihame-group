"use client";

import { useSearchParams } from "next/navigation";

// Plain <a> to a Route Handler, not a client-side fetch+blob download —
// the browser handles the "Content-Disposition: attachment" response
// natively, and this always carries whatever filters are live right now
// since useSearchParams() re-renders it on every filter change.
export function AllOrdersExportLink() {
  const params = useSearchParams();
  const qs = params.toString();

  return (
    <a
      href={`/all-orders/export${qs ? `?${qs}` : ""}`}
      className="flex h-11 flex-none items-center rounded bg-dark px-4 font-sans text-[13px] font-medium text-white hover:opacity-90 md:h-[34px]"
    >
      Export
    </a>
  );
}

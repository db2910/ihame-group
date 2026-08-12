"use client";

import { useOffline } from "next/offline";

// Companion to experimental.useOffline (next.config.ts) — connectivity
// state for the whole app, not just the POS's own queue. useOffline() is
// more reliable than navigator.onLine here: it also flips on when a
// request genuinely fails to reach the server (a dead upstream, not just
// the OS-reported network interface being down).
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div role="status" className="flex-none bg-dark px-3.5 py-1.5 text-center font-sans text-[12px] text-white">
      Offline — pending actions will send once you&rsquo;re back online.
    </div>
  );
}

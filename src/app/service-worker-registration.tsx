"use client";

import { useEffect } from "react";

// Registered app-wide (root layout) rather than only from /sale, so the
// worker is already installed and its cache already warm by the time a
// shop_staff member actually opens the POS — registering it there instead
// would mean the very first visit of the day has nothing cached yet.
//
// navigator.serviceWorker is simply undefined outside a secure context
// (HTTPS, or localhost) — this dev server's LAN address is plain HTTP, so
// this silently no-ops there (see next.config.ts's allowedDevOrigins
// comment for the same constraint hitting phone testing elsewhere). Works
// as expected in production, since Vercel serves everything over HTTPS.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed", err);
    });
  }, []);

  return null;
}

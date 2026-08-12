import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` serves /_next/* dev assets only to the host it was started on
  // (localhost) and 403s every other origin, so opening the LAN URL on a phone
  // returns HTML with no JavaScript — the page renders but nothing is
  // interactive (the sidebar hamburger silently does nothing). These are the
  // private-network ranges a phone on the same Wi-Fi comes from.
  // Development only; no effect on `next build` / `next start`.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  // pdfkit resolves its bundled standard-font .afm files via fs.readFileSync
  // relative to its own __dirname at runtime (Phase 6's PDF report export) —
  // Next.js's default Server Component/Route Handler bundling rewrites that
  // path, so the file lookup 404s and the route 500s with an empty body
  // (confirmed live: worked calling the same function directly under tsx,
  // broke only through the Next.js dev server). serverExternalPackages opts
  // it out of bundling so it's require()'d natively instead, preserving its
  // real node_modules layout. Reported in Next's own docs
  // (docs/01-app/02-guides/package-bundling.md) as exactly this option's
  // purpose for "packages using Node.js specific features" like on-disk
  // asset loading.
  serverExternalPackages: ["pdfkit"],
  // Server Actions default to a 1MB request body (Next's own limit, meant to
  // bound how much a single action invocation can cost to parse). Phase 7's
  // proof-of-payment upload sends the original phone photo straight through
  // a Server Action (completeSaleAction / saveOrderAction / recordOrderPaymentAction)
  // before src/lib/storage.ts's sharp pipeline shrinks it down for storage —
  // a real camera photo comfortably exceeds 1MB before that happens.
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    // Phase 7 offline hardening: lets a failed navigation, RSC fetch, or
    // Server Action (order saves, payment recording, status changes — every
    // one of them, app-wide) stay pending and retry once connectivity
    // returns, instead of throwing straight to an error state. The POS's own
    // cash-sale queue (src/lib/offline/) doesn't rely on this — it needs
    // strict ordering across many queued sales, which is its own explicit
    // flush loop, not "hold one request pending." This is the complementary
    // piece for the rest of the app, where a single in-flight mutation
    // surviving a connectivity blip is all that's needed.
    useOffline: true,
  },
};

export default nextConfig;

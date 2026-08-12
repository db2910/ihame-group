# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three hardcoded roles, one company (IHAME Logistics & Supply Ltd, trading as IHAME Group):

- **Manager** — the only account with access to both business lines. Reviews and edits orders, changes order status, adjusts stock, records purchases, runs reports, manages users, and is the sole approver for anything destructive (cancellations, deactivations, stock adjustments). Primarily a desk/office context, but every screen must still work on a phone.
- **Freight staff** (2–3 people) — create and manage their own freight orders (China → Kigali / Goma / Bukavu) while in draft, record payments, and hand off to the manager once submitted. Customer-facing, desktop-leaning but mobile-capable (bulk status workflows in particular need to work well on a phone).
- **Shop staff** (2 people) — run the hardware shop's point-of-sale counter: search items, take payments, check stock. Phone/counter-device-first — the sale screen is planned as an offline-capable PWA so the till keeps working through internet/power outages.

Before this system: paper and notebook records for both freight orders and shop stock/sales. This is the business's first real digitization — not a migration from another software tool, and not a migration of historical data (the system starts from zero; opening stock and customers are entered fresh).

## Product Purpose

One web application unifying two business lines: a freight-forwarding operation moving goods from China to Kigali (Rwanda), Goma and Bukavu (DRC), and a hardware shop with its own point of sale and stock ledger. It replaces paper-based tracking with a single accountable system — every order, payment, stock movement, and user action attributable and auditable — so the manager can see the true state of both businesses (outstanding balances, stock on hand, today's sales, orders awaiting review) without reconciling separate paper trails.

Success: every account type reliably lands on its correct role-scoped view; every mutation is attributable to a user; stock and financial figures stay correct and traceable end to end from a single source of truth; and the shop counter keeps taking sales through outages once the offline PWA phase ships.

## Positioning

"Freight and shop, one ledger." The mechanism a generic accounting or POS tool couldn't copy: one database and one audit trail spanning both a freight-forwarding order lifecycle (draft → submitted → in transit → delivered/cancelled, multi-currency payments) and a hardware-shop inventory/POS ledger (weighted-average costing, insert-only stock movements), under a single manager role that is the only account with visibility into both sides. Combined reporting (monthly revenue per module, total cash in, outstanding receivables) is native, not a bolt-on integration between two separate tools.

## Operating Context

- Freight staff create orders for customers shipping vehicles, machinery, electronics, or general goods from China, destined for Kigali, Goma, or Bukavu. Orders move through a fixed lifecycle with a mandatory reason for cancellation and an audit trail entry for every field change after submission.
- Shop staff work a physical counter: searching items by SKU or barcode, taking payments (cash, mobile money, bank, card), and needing the till to keep functioning through internet/power outages (planned offline-queue PWA phase).
- The manager is the only role that crosses both business lines: dashboard KPIs, full order editing and status changes, items/stock/purchases/adjustments, reports, user management, and the audit log.
- No self-registration anywhere — the manager creates every account, including the very first one (via a one-time seed script).
- Base reporting currencies: USD for freight (typical settlement currency for shipping), RWF for the shop (local Kigali trade); combined reports convert at the rate stored per payment.
- Deployment target: a small VPS (2 vCPU / 4GB RAM), with daily encrypted off-server backups; uploaded images backed up separately from the database.

## Capabilities and Constraints

- Hardcoded three-role permission matrix (manager / freight_staff / shop_staff) — explicitly not a configurable permissions system. Every mutation re-checks role server-side, not just at the UI layer.
- Order lifecycle: draft (creator-only, editable) → submitted (locked, manager-only edits) → in transit → arrived → delivered, or cancelled (manager-only, mandatory reason). Every status transition and post-submit field change is logged.
- An order's balance is never stored — always `total_amount − SUM(payments)`. An order can't move to delivered with an outstanding balance unless the manager overrides with a mandatory note.
- Shop stock on hand is never stored either — always the sum of an insert-only movements ledger (opening, purchase, sale, return, damage, adjustment). Item cost price is a weighted average recalculated on every purchase, never edited directly.
- A sale is rejected if it would take any item's stock below zero. Voiding a sale never deletes it — it reverses the stock instead.
- Proof-of-payment images are compressed under 500KB on upload and stored by file path, never as binary in the database.
- Nothing is ever hard-deleted: orders, sales, users, and stock movements are deactivated, voided, or cancelled — never removed — so the audit trail stays intact.
- RRA / EBM 2.1 (Rwandan VAT e-invoicing) integration is explicitly out of scope for now; the shop uses its own receipt method until that registration process is separately started.
- No historical data migration — opening stock and customers are entered fresh once each module goes live.
- No formal accessibility standard specified; standard good practice (contrast, keyboard access, readable type) applies.

## Brand Commitments

- Company: IHAME Logistics & Supply Ltd, trading as IHAME Group (the group-level name used for overall system chrome; in-app branding, logo, and wordmark stay "IHAME Logistics & Supply Ltd" per the existing approved design).
- Tagline: "Your Trust, Our Mission."
- Approved logo assets already exist and are final (`ihame-logo.png`, `ihame-mark.png`) — no further logo/vector work needed.
- Corridor served: China (origin) → Kigali, Rwanda (home base) → Goma and Bukavu, DRC (onward destinations).

## Evidence on Hand

No customer testimonials, case studies, or press exist or are needed — this is an internal operations system, not a marketing surface. No historical business data will be migrated. Do not fabricate sample customers, past orders, or stock history as if real; the project's own explicitly-labeled demo/seed data (`prisma/seed-demo.ts`) is development-only and clearly not real business records.

## Product Principles

1. One accountable ledger over two convenient tools — every figure (balance, stock on hand, cost price) is always computed from an append-only source of truth, never stored and trusted independently.
2. Server-side authority, always — role checks, balance calculations, and stock rules are re-verified on every mutation, never assumed from what the UI already hid or computed.
3. Nothing disappears — deactivate, void, and cancel instead of delete, because the audit trail is the product's core value, not an afterthought.
4. Built for the device actually in hand — the shop counter is phone/PWA-first and must survive outages; the manager's screens can assume a desk, but every screen must still be usable one-handed on a phone, since that's how it actually gets tested.
5. Replace paper honestly — this is the business's first digitization, not a migration from another tool, so defaults and workflows should assume staff are new to structured record-keeping, not just new to this particular software.

## Accessibility & Inclusion

No formal standard or specific user need confirmed. Standard good practice applies: sufficient contrast, keyboard operability, readable type sizes.

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { showToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { CartIcon, ChevronLeftIcon } from "@/components/shell/icons";
import { completeSaleAction } from "./actions";
import { queueSale, listQueuedSales, removeQueuedSale, type QueuedSale } from "@/lib/offline/sale-queue";
import { flushQueue } from "@/lib/offline/offline-sync";

// crypto.randomUUID() needs a secure context — unavailable when this app is
// reached over plain HTTP via its LAN address (real-phone testing, per
// next.config.ts's allowedDevOrigins comment). Only ever used here as a
// dedupe key for retried submissions, never anything security-sensitive, so
// a Math.random() fallback is fine.
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type PosItem = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  categoryName: string;
  sellPrice: number;
  stock: number;
};

type CartLine = { quantity: number; unitPrice: number };

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "MoMo" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

const money = (n: number) => `RWF ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// Typing "100" beats tapping + a hundred times for a bulk buyer (e.g. 100
// bags of cement) — the steppers stay for one-off adjustments, this is for
// setting the quantity outright. Kept as a local draft so clearing the field
// to type a replacement value never reads as "0" and drops the cart line;
// an empty/invalid value on blur just reverts rather than committing.
// Callers remount this with `key={quantity}` so an external change (the +/−
// steppers) resets the draft without needing an effect.
function CartQuantityInput({
  value,
  max,
  onCommit,
}: {
  value: number;
  max: number;
  onCommit: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  function commit(raw: string) {
    const parsed = Math.round(Number(raw));
    if (!raw.trim() || !Number.isFinite(parsed) || parsed < 1) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(parsed, max);
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onFocus={(e) => e.currentTarget.select()}
      aria-label="Quantity"
      className="focus-ring-brand h-7 w-12 rounded border border-input-border bg-card text-center font-mono text-[13px] font-semibold text-ink outline-none"
    />
  );
}

export function Pos({ items }: { items: PosItem[] }) {
  const categories = useMemo(() => {
    const names = new Set(items.map((i) => i.categoryName));
    return ["All", ...Array.from(names).sort()];
  }, [items]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Phone only. The cart is one component instance either way — this just
  // switches its wrapper between "hidden" and "full-screen overlay", so
  // closing it to go add more items cannot lose what's already in it.
  const [cartOpen, setCartOpen] = useState(false);

  // Cash sales rung up while offline (src/lib/offline/sale-queue.ts) — kept
  // in React state as a mirror of IndexedDB purely for display (the pending-
  // sync indicator below); IndexedDB itself is the durable copy.
  const [queuedSales, setQueuedSales] = useState<QueuedSale[]>([]);

  // Attempts a flush on mount (covers "reloaded the page with sales still
  // queued from before"), whenever the browser regains connectivity, and
  // periodically while this screen stays open — not the Background Sync
  // API, which Safari/iOS doesn't implement, so a shop counter can't
  // actually depend on it firing in the background.
  useEffect(() => {
    let cancelled = false;
    async function attempt() {
      await flushQueue();
      if (!cancelled) setQueuedSales(await listQueuedSales());
    }
    attempt();
    window.addEventListener("online", attempt);
    const interval = setInterval(attempt, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", attempt);
      clearInterval(interval);
    };
  }, []);

  async function dismissFailedQueuedSale(clientRequestId: string) {
    await removeQueuedSale(clientRequestId);
    setQueuedSales(await listQueuedSales());
  }

  // On hand minus whatever's already claimed by queued-but-not-yet-synced
  // cash sales — otherwise several offline sales of the same item in a row
  // could all look available right up until they all fail together at sync
  // time. Not adjusted for the *current* cart, same as the server-reported
  // stock never was: a cart is a draft, nothing is claimed until submitted.
  const pendingQtyByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of queuedSales) {
      if (q.status !== "pending") continue;
      for (const line of q.lines) {
        m.set(line.itemId, (m.get(line.itemId) ?? 0) + Number(line.quantity));
      }
    }
    return m;
  }, [queuedSales]);

  function effectiveStock(item: PosItem): number {
    return Math.max(0, item.stock - (pendingQtyByItem.get(item.id) ?? 0));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "All" && i.categoryName !== category) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  function addToCart(item: PosItem) {
    if (effectiveStock(item) <= 0) return;
    setError(null);
    setCart((c) => {
      const existing = c[item.id];
      const nextQty = (existing?.quantity ?? 0) + 1;
      // Soft cap — the server re-checks on-hand stock authoritatively
      // regardless, this just avoids an obviously-doomed tap.
      if (nextQty > effectiveStock(item)) return c;
      return { ...c, [item.id]: { quantity: nextQty, unitPrice: existing?.unitPrice ?? item.sellPrice } };
    });
  }

  function updateQty(itemId: string, quantity: number) {
    setCart((c) => {
      if (quantity <= 0) {
        const next = { ...c };
        delete next[itemId];
        return next;
      }
      return { ...c, [itemId]: { ...c[itemId], quantity } };
    });
  }

  function updatePrice(itemId: string, unitPrice: number) {
    setCart((c) => (c[itemId] ? { ...c, [itemId]: { ...c[itemId], unitPrice } } : c));
  }

  const cartEntries = Object.entries(cart);
  const total = cartEntries.reduce((sum, [, line]) => sum + line.quantity * line.unitPrice, 0);
  const cartEmpty = cartEntries.length === 0;
  const proofNeeded = paymentMethod !== "cash";
  // Units, not lines — "3" should mean three things on the counter, whether
  // that's three different items or three of one.
  const cartUnits = cartEntries.reduce((sum, [, line]) => sum + line.quantity, 0);

  function handleComplete() {
    if (cartEmpty || pending) return;
    if (proofNeeded && !proofFile) {
      setError("Attach proof of payment for this payment method.");
      return;
    }
    setError(null);

    const lines = cartEntries.map(([itemId, line]) => ({
      itemId,
      quantity: String(line.quantity),
      unitPrice: line.unitPrice.toFixed(2),
    }));
    const clientRequestId = generateRequestId();

    if (paymentMethod === "cash") {
      // Local-first: queued to IndexedDB before any network call, so it's
      // never lost to a connectivity drop mid-submit (unlike every other
      // method below, whose whole life is one request/response). Clearing
      // the cart happens as soon as it's queued, not once it's actually
      // synced — the cashier moves on to the next customer immediately;
      // syncing is this screen's problem to keep handling in the
      // background, not theirs to wait on.
      startTransition(async () => {
        await queueSale({ clientRequestId, lines, itemCount: cartUnits, total, createdAt: Date.now() });
        setQueuedSales(await listQueuedSales());
        setCart({});
        setCartOpen(false);
      });

      flushQueue().then(async (result) => {
        const refreshed = await listQueuedSales();
        setQueuedSales(refreshed);
        const synced = result.synced.find((s) => s.clientRequestId === clientRequestId);
        if (synced) {
          showToast(`Sale ${synced.saleNo} completed`);
          return;
        }
        const stillQueued = refreshed.find((s) => s.clientRequestId === clientRequestId);
        if (stillQueued?.status === "failed") {
          showToast(stillQueued.errorMessage ?? "Could not complete this sale");
        } else {
          showToast("Sale queued — will sync when back online");
        }
      });
      return;
    }

    const formData = new FormData();
    for (const line of lines) {
      formData.append("itemId", line.itemId);
      formData.append("quantity", line.quantity);
      formData.append("unitPrice", line.unitPrice);
    }
    formData.set("paymentMethod", paymentMethod);
    formData.set("clientRequestId", clientRequestId);
    if (proofFile) formData.set("proofFile", proofFile);

    startTransition(async () => {
      const result = await completeSaleAction(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      showToast(`Sale ${result.saleNo} completed`);
      setCart({});
      setPaymentMethod("cash");
      setProofFile(null);
      // Back to the catalogue for the next customer, rather than leaving an
      // empty cart sheet covering the screen.
      setCartOpen(false);
    });
  }

  return (
    // A fixed height (not flex-1 off an ancestor chain that's only
    // min-h-dvh, i.e. free to grow) — with a large catalogue, the grid's own
    // overflow-y-auto never engaged: nothing above it had a real bound, so
    // the whole page just grew taller and the cart panel scrolled away with
    // it instead of staying put as its own pane. 58px is StaffTopBar's
    // header height.
    <div className="flex h-[calc(100dvh-58px)] flex-col md:flex-row">
      {/* Catalogue */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 p-4 md:p-5.5">
        {/* Mobile only — on desktop the cart panel is always visible and
            carries this same status itself. On a phone, completing/queuing a
            cash sale clears the cart and closes the cart sheet, so without
            this a sale still waiting to sync would have no visible trace on
            the screen the cashier actually lands back on. */}
        {queuedSales.length > 0 && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex flex-none items-center justify-between gap-2 rounded border border-hairline-2 bg-app px-3.5 py-2 text-left font-sans text-[12px] md:hidden"
          >
            <span className="text-ink-secondary">
              {queuedSales.filter((q) => q.status === "pending").length > 0 &&
                `${queuedSales.filter((q) => q.status === "pending").length} sale(s) waiting to sync`}
              {queuedSales.some((q) => q.status === "failed") && (
                <span className="text-alert"> · action needed</span>
              )}
            </span>
            <span className="flex-none font-medium text-brand">View</span>
          </button>
        )}

        <div className="focus-ring-brand-within flex h-11 flex-none items-center gap-2.5 rounded border border-input-border bg-card px-3.5">
          <span aria-hidden="true" className="font-sans text-[15px] text-ink-faint">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item, SKU or scan barcode…"
            aria-label="Search items by name, SKU or barcode"
            className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink outline-none placeholder:text-ink-faint md:text-[14px]"
          />
        </div>

        <div className="flex flex-none gap-2 overflow-x-auto font-sans text-[12.5px] font-medium">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex-none cursor-pointer rounded-full px-3.5 py-1.5 whitespace-nowrap ${
                c === category ? "bg-dark text-white" : "border border-input-border text-ink-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pb-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const inCart = Boolean(cart[item.id]);
            const stock = effectiveStock(item);
            const outOfStock = stock <= 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => addToCart(item)}
                disabled={outOfStock}
                className={`flex flex-col gap-2 rounded-[6px] border bg-card p-3.5 text-left select-none ${
                  inCart ? "border-brand" : "border-border"
                } ${outOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-brand"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-mono text-[10.5px] text-ink-faint">{item.sku}</span>
                  <span
                    className={`flex-none font-mono text-[10.5px] ${
                      outOfStock ? "text-alert" : stock < 10 ? "text-warn" : "text-ink-faint"
                    }`}
                  >
                    {outOfStock ? "OUT" : `${stock} left`}
                  </span>
                </div>
                <div className="min-h-[35px] font-sans text-[13.5px] leading-[1.3] font-medium text-ink">
                  {item.name}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[14px] font-semibold text-ink">{money(item.sellPrice)}</span>
                  <span className="font-sans text-[11px] text-ink-faint">/{item.unit}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center font-sans text-[14px] text-ink-faint">
              No items match this search.
            </div>
          )}
        </div>
      </div>

      {/* Phone-only cart bar. The sidebar used to sit permanently below the
          grid and ate roughly half the screen, leaving barely two rows of
          items visible. Here the catalogue keeps the whole screen and the
          cart collapses to this summary until it's actually needed. */}
      {!cartEmpty && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex flex-none cursor-pointer items-center gap-3 border-t border-hairline-2 bg-dark px-4 py-3 text-left text-white md:hidden"
        >
          <span className="relative flex-none">
            <CartIcon className="h-6 w-6" />
            <span className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[10.5px] font-semibold text-white">
              {cartUnits}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-[13px] font-medium">
              {cartEntries.length} item{cartEntries.length === 1 ? "" : "s"} in cart
            </span>
            <span className="block font-mono text-[11px] text-white/55">Tap to review and take payment</span>
          </span>
          <span className="flex-none font-mono text-[16px] font-semibold">{money(total)}</span>
        </button>
      )}

      {/* Cart — same instance at every width; only the wrapper changes, so
          closing it on a phone never discards the cart. */}
      <div
        className={`w-full flex-none flex-col border-hairline-2 bg-card md:static md:z-auto md:flex md:w-[404px] md:border-t-0 md:border-l ${
          cartOpen ? "fixed inset-0 z-40 flex h-dvh" : "hidden"
        }`}
      >
        <div className="flex flex-none items-center gap-3 border-b border-hairline-2 px-5 py-4">
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="-ml-2 flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded text-ink-muted hover:bg-row-hover md:hidden"
            aria-label="Back to items"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-sans text-[15px] font-semibold text-ink">New sale</div>
            <div className="mt-0.5 font-sans text-[11.5px] text-ink-faint">walk-in</div>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="flex-none cursor-pointer font-sans text-[12.5px] font-medium text-brand md:hidden"
          >
            Add more
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cartEmpty ? (
            <div className="px-5 py-10 text-center font-sans text-[13px] leading-[1.6] text-ink-faint">
              Cart is empty.
              <br />
              Tap an item to add it.
            </div>
          ) : (
            cartEntries.map(([itemId, line]) => {
              const item = itemById.get(itemId);
              if (!item) return null;
              const underPrice = line.unitPrice < item.sellPrice;
              return (
                <div key={itemId} className="flex flex-col gap-2 border-b border-hairline px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-sans text-[13px] font-medium text-ink">{item.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-ink-faint">
                        {money(line.unitPrice)} × {line.quantity}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQty(itemId, line.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-input-border font-sans text-[14px] text-ink-secondary select-none"
                      >
                        −
                      </button>
                      <CartQuantityInput
                        key={line.quantity}
                        value={line.quantity}
                        max={effectiveStock(item)}
                        onCommit={(quantity) => updateQty(itemId, quantity)}
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(itemId, line.quantity + 1)}
                        disabled={line.quantity >= effectiveStock(item)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-input-border font-sans text-[14px] text-ink-secondary select-none disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <div className="w-[80px] flex-none text-right font-mono text-[12.5px] font-semibold text-ink">
                      {money(line.quantity * line.unitPrice)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="font-sans text-[11px] text-ink-faint" htmlFor={`price-${itemId}`}>
                      Price
                    </label>
                    <input
                      id={`price-${itemId}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updatePrice(itemId, Number(e.target.value))}
                      className="focus-ring-brand h-8 w-24 rounded border border-input-border px-2 font-mono text-[13px] text-ink outline-none"
                    />
                    {underPrice && (
                      <span className="font-sans text-[11px] text-warn">under price · list {money(item.sellPrice)}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-none flex-col gap-2.5 border-t border-hairline-2 px-5 py-3.5">
          <div className="flex items-baseline justify-between font-sans text-[14px] font-semibold text-ink">
            <span>Total</span>
            <span className="font-mono text-[19px]">{money(total)}</span>
          </div>

          {queuedSales.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded border border-hairline-2 bg-app px-3 py-2.5">
              {queuedSales
                .filter((q) => q.status === "pending")
                .map((q) => (
                  <div key={q.clientRequestId} className="flex items-center justify-between gap-2 font-sans text-[12px]">
                    <span className="text-ink-secondary">
                      {q.itemCount} item{q.itemCount === 1 ? "" : "s"} · {money(q.total)}
                    </span>
                    <span className="flex-none font-medium text-ink-faint">Waiting to sync…</span>
                  </div>
                ))}
              {queuedSales
                .filter((q) => q.status === "failed")
                .map((q) => (
                  <div key={q.clientRequestId} className="flex items-center justify-between gap-2 font-sans text-[12px]">
                    <span className="min-w-0 truncate text-alert" title={q.errorMessage ?? undefined}>
                      {q.errorMessage ?? "Could not sync this sale"}
                    </span>
                    <button
                      type="button"
                      onClick={() => dismissFailedQueuedSale(q.clientRequestId)}
                      className="flex-none cursor-pointer font-medium text-brand hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
            </div>
          )}

          <div className="flex gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setPaymentMethod(m.value);
                  if (m.value === "cash") setProofFile(null);
                }}
                className={`h-10 flex-1 cursor-pointer rounded font-sans text-[12.5px] font-medium ${
                  paymentMethod === m.value ? "bg-dark text-white" : "border border-input-border text-ink-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {proofNeeded && (
            <label className="flex cursor-pointer flex-col gap-1.5 rounded border border-dashed border-input-border px-3 py-2.5 font-sans text-[12.5px] text-ink-muted">
              <span>
                Proof of payment <span className="text-alert">· required</span>
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="font-sans text-[12px]"
              />
            </label>
          )}

          {error && (
            <div className="rounded border border-warning-border bg-warning-bg px-3 py-2 font-sans text-[12.5px] text-warning-text">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleComplete}
            disabled={cartEmpty || pending}
            className="flex h-[50px] cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-accent font-sans text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Spinner className="h-4 w-4" />}
            {pending ? "Completing…" : cartEmpty ? "Complete sale" : `Complete sale · ${money(total)}`}
          </button>
          <div className="font-sans text-[11px] leading-[1.5] text-ink-faint">
            Stock is deducted in the same transaction. A sale that would drive stock below zero is rejected.
          </div>
        </div>
      </div>
    </div>
  );
}

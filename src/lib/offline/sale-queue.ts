"use client";

// Local, durable queue for cash sales rung up while the POS can't reach the
// server (Phase 7 offline scope decision: cash only — MoMo/Bank/Card need a
// proof photo and stay online-only, unchanged). IndexedDB rather than
// localStorage because a queued sale needs to survive a page reload mid-
// outage, hold a real-ish structured record (not just a string), and not be
// capped at localStorage's ~5MB shared-with-everything-else limit.
//
// One object store, keyed by clientRequestId — the same id that travels to
// /api/sale/complete-cash and becomes sales.client_request_id, so "this
// queue entry" and "that DB row" are always the same identity, not two
// numbers that have to be reconciled.

const DB_NAME = "ihame-pos-offline";
const DB_VERSION = 1;
const STORE_NAME = "queuedSales";

export type QueuedSaleLine = { itemId: string; quantity: string; unitPrice: string };

export type QueuedSale = {
  clientRequestId: string;
  lines: QueuedSaleLine[];
  itemCount: number;
  total: number;
  createdAt: number;
  status: "pending" | "failed";
  errorMessage: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "clientRequestId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = fn(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function queueSale(sale: Omit<QueuedSale, "status" | "errorMessage">): Promise<void> {
  await withStore("readwrite", (store) =>
    store.add({ ...sale, status: "pending", errorMessage: null } satisfies QueuedSale),
  );
}

// Oldest first — the flush loop (offline-sync.ts) depends on this order to
// honor "flush queued sales in order."
export async function listQueuedSales(): Promise<QueuedSale[]> {
  const all = await withStore<QueuedSale[]>("readonly", (store) => store.getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedSale(clientRequestId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(clientRequestId));
}

export async function markQueuedSaleFailed(clientRequestId: string, errorMessage: string): Promise<void> {
  await withStore<QueuedSale>("readonly", (store) => store.get(clientRequestId)).then(async (existing) => {
    if (!existing) return;
    await withStore("readwrite", (store) =>
      store.put({ ...existing, status: "failed", errorMessage } satisfies QueuedSale),
    );
  });
}

// Matches the spec's §6.5a grid exactly: PURCHASE · SUPPLIER · DATE · LINES ·
// TOTAL · RECORDED BY. Split out of purchases-table.tsx (a "use client" file)
// so loading.tsx — a Server Component — can import it without pulling in a
// client reference: any export from a "use client" module, even a plain
// string, resolves to an opaque reference when imported server-side.
export const GRID = "grid-cols-[1.1fr_1.6fr_1fr_.6fr_1fr_1fr]";

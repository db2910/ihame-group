// Plain constant, not a client component — needs to be importable from a
// Server Component (loading.tsx) as well as the client ItemsTable. Kept out
// of items-table.tsx deliberately: that file is "use client", and every
// export from a "use client" module becomes an opaque client-reference
// placeholder when imported into a Server Component, even a plain string —
// GRID rendered as a broken function stringification in loading.tsx's
// grid-template-columns until this moved out. Same category of bug as
// src/lib/pagination.ts earlier in this project for the same reason.
//
// Matches the mock's Items grid exactly (spec §6 "Items — master list, add,
// edit, deactivate"): SKU · ITEM · CATEGORY · UNIT · COST · SELL · ON HAND ·
// REORDER.
export const GRID = "grid-cols-[.9fr_1.7fr_1fr_.6fr_.8fr_.8fr_.8fr_.8fr]";

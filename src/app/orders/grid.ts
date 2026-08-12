// ORDER · CUSTOMER · GOODS · DEST · ETA · STATUS · BALANCE — the freight
// staff "My orders" grid (backlog.md's Phase 5 note reuses this same shape
// unscoped for the manager's All-orders view).
export const GRID = "grid-cols-[1.05fr_1.3fr_1.5fr_.8fr_.9fr_.9fr_.95fr]";

// Same columns plus STAFF (ORDER · CUSTOMER · GOODS · DEST · STAFF · ETA ·
// STATUS · BALANCE) — All orders is unscoped across every staff member, so
// which one created a row is information My orders never needed to show.
// A separate literal string rather than building GRID dynamically: Tailwind
// can't extract an interpolated grid-template-columns class (see AGENTS.md).
export const GRID_WITH_STAFF = "grid-cols-[1.05fr_1.2fr_1.3fr_.75fr_.8fr_.8fr_.85fr_.9fr]";

export function ContentHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    // Fixed 60px row on desktop (per the mock). On phones the controls in
    // `right` — a search box and an action button on the busier screens —
    // can't share that row with the title without crushing both, so it
    // stacks and grows instead.
    <div className="flex flex-none flex-col gap-2.5 border-b border-border bg-card px-6.5 py-3 md:h-[60px] md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
      <div className="min-w-0">
        <h1 className="font-sans text-base leading-[1.2] font-semibold text-ink">{title}</h1>
        {subtitle && (
          <div className="mt-0.5 font-sans text-[12.5px] leading-[1.4] text-ink-faint">
            {subtitle}
          </div>
        )}
      </div>
      {/* flex-wrap: every existing screen's `right` slot fits one row and
          this is a no-op for them, but Phase 6's report detail page (back
          link + period picker + 2 export buttons — 4 controls) is the first
          to genuinely need a second line on a phone; without it these
          overflow the viewport (confirmed live at 390px). justify-end keeps
          a wrapped second row aligned the same way the first row already is. */}
      {right && <div className="flex flex-none flex-wrap items-center justify-end gap-2.5">{right}</div>}
    </div>
  );
}

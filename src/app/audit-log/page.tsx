import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";

const PAGE_SIZE = 25;

function fmt(at: Date): string {
  return at
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase()
    .replace(",", "");
}

const selectClass =
  // text-base (16px), not text-[15px], on mobile — iOS Safari force-zooms
  // the viewport when a focused select/input renders under 16px.
  "h-11 md:h-[34px] rounded border border-input-border bg-card px-3 font-sans text-base md:text-[13.5px] text-ink-secondary";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const table = params.table || undefined;
  const userId = params.user || undefined;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(`${params.to}T23:59:59`) : undefined;

  const where = {
    ...(table ? { tableName: table } : {}),
    ...(userId ? { changedById: userId } : {}),
    ...(from || to
      ? { changedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [rows, total, users, tables] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { changedBy: { select: { name: true } } },
      orderBy: { changedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.auditLog.findMany({ distinct: ["tableName"], select: { tableName: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const qs = new URLSearchParams();
    if (table) qs.set("table", table);
    if (userId) qs.set("user", userId);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    qs.set("page", String(targetPage));
    return `?${qs.toString()}`;
  }

  return (
    <ManagerShellFrame active="audit-log" user={manager}>
      <ContentHeader
        title="Audit log"
        subtitle="Every field change after submit, every void, every adjustment"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6.5">
        {/* Five controls in one unwrapped row only ever fit at desktop
            widths — the taller, 16px mobile sizing (needed so a focused
            select/date input doesn't trigger iOS's zoom) pushed this well
            past 390px. Wraps into rows on mobile instead of overflowing. */}
        <form className="flex flex-wrap gap-2.5" method="get">
          <select name="table" defaultValue={table ?? ""} className={selectClass}>
            <option value="">All tables</option>
            {tables.map((t) => (
              <option key={t.tableName} value={t.tableName}>
                {t.tableName}
              </option>
            ))}
          </select>
          <select name="user" defaultValue={userId ?? ""} className={selectClass}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ""} className={selectClass} />
          <input type="date" name="to" defaultValue={params.to ?? ""} className={selectClass} />
          <button type="submit" className="h-11 md:h-[34px] rounded bg-dark px-3.5 font-sans text-base md:text-[13.5px] font-medium text-white">
            Filter
          </button>
        </form>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div className="grid grid-cols-[1fr_.9fr_1.2fr_1.3fr_1.3fr] gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint">
            <div>WHEN</div>
            <div>BY</div>
            <div>RECORD · FIELD</div>
            <div>OLD</div>
            <div>NEW</div>
          </div>
          {rows.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
              No audit entries match these filters.
            </div>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_.9fr_1.2fr_1.3fr_1.3fr] items-center gap-2 border-b border-hairline px-4.5 py-3 font-sans text-[12.5px] text-ink last:border-b-0 md:text-[14px]"
            >
              <div className="min-w-0 font-mono text-[12.5px] text-ink-secondary">{fmt(r.changedAt)}</div>
              <div className="min-w-0 truncate">{r.changedBy.name}</div>
              <div className="min-w-0">
                <div className="truncate font-mono text-[12.5px] text-brand">
                  {r.tableName} · {r.recordId.slice(0, 8)}
                </div>
                <div className="truncate font-sans text-[12px] text-ink-faint">{r.fieldName}</div>
              </div>
              <div className="min-w-0 truncate font-mono text-[12.5px] text-ink-faint line-through">
                {r.oldValue ?? "—"}
              </div>
              <div className="min-w-0 truncate font-mono text-[12.5px] text-ink">{r.newValue ?? "—"}</div>
            </div>
          ))}
          <div className="mt-auto flex items-center justify-between border-t border-hairline px-4.5 py-2.5 font-sans text-[14px] text-ink-faint">
            <span>
              Page {page} of {totalPages} · {total} entries
            </span>
            <div className="flex gap-3">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="text-brand">
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="text-brand">
                  Next →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </ManagerShellFrame>
  );
}

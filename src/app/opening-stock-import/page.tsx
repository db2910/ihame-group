import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { OpeningImportForm } from "./opening-import-form";

function fmt(at: Date): string {
  return at
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase()
    .replace(",", "");
}

function LockedNotice({ count, importedBy, importedAt }: { count: number; importedBy: string; importedAt: Date }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-sm text-center">
        <div className="font-sans text-lg font-semibold text-ink">Already imported</div>
        <div className="mt-2 font-sans text-[13.5px] leading-[1.6] text-ink-muted">
          {count} item{count === 1 ? "" : "s"} were loaded by {importedBy} on {fmt(importedAt)}. This
          is a one-time step — add new items from Items, and correct stock quantity or cost from
          Adjustments and Purchases.
        </div>
      </div>
    </div>
  );
}

export default async function OpeningStockImportPage() {
  const manager = await requireRole(["manager"]);
  const first = await db.stockMovement.findFirst({
    where: { referenceType: "opening_import" },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { name: true } } },
  });

  const locked = !!first;
  const count = locked ? await db.stockMovement.count({ where: { referenceType: "opening_import" } }) : 0;

  return (
    <ManagerShellFrame active="opening-stock-import" user={manager}>
      <ContentHeader
        title="Opening stock import"
        subtitle="One-time bulk load of your existing catalogue and its current stock"
      />
      {first ? (
        <LockedNotice count={count} importedBy={first.createdBy.name} importedAt={first.createdAt} />
      ) : (
        <OpeningImportForm />
      )}
    </ManagerShellFrame>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { readPagination } from "@/lib/pagination";
import { Pagination } from "@/components/ui/pagination";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { AddExpenseButton } from "./expense-form-modal";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  supplier_cost: "Supplier cost",
  transport: "Transport",
  customs: "Customs",
  other: "Other",
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const { page, perPage } = readPagination(params);
  const category = (params.category as ExpenseCategory | undefined) || undefined;

  const where = category ? { category } : {};

  const [expenses, total, orders] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { paidOn: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        order: { select: { id: true, orderNo: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    db.expense.count({ where }),
    // Drafts excluded — same rule payments already follow: nothing to pin an
    // expense to on an order that isn't real yet.
    db.order.findMany({
      where: { status: { not: "draft" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNo: true, customer: { select: { name: true } } },
    }),
  ]);

  const orderOptions = orders.map((o) => ({ id: o.id, label: `${o.orderNo} — ${o.customer.name}` }));

  return (
    <ManagerShellFrame active="expenses" user={manager}>
      <ContentHeader
        title="Expenses"
        subtitle={`${total} expense${total === 1 ? "" : "s"} · supplier costs, transport, and other freight costs — never blended into an order's balance`}
        right={<AddExpenseButton orderOptions={orderOptions} />}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6.5">
        <form className="flex flex-wrap gap-2.5" method="get">
          <select
            name="category"
            defaultValue={category ?? ""}
            className="h-11 md:h-[34px] rounded border border-input-border bg-card px-3 font-sans text-base md:text-[13.5px] text-ink-secondary"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 md:h-[34px] rounded bg-dark px-3.5 font-sans text-base md:text-[13.5px] font-medium text-white"
          >
            Filter
          </button>
        </form>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div className="grid grid-cols-[.9fr_1fr_1fr_1.1fr_1fr_1fr] gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint">
            <div>PAID ON</div>
            <div>CATEGORY</div>
            <div>AMOUNT</div>
            <div>ORDER</div>
            <div>RECORDED BY</div>
            <div>NOTE</div>
          </div>
          {expenses.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
              No expenses recorded yet.
            </div>
          )}
          {expenses.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[.9fr_1fr_1fr_1.1fr_1fr_1fr] items-center gap-2 border-b border-hairline px-4.5 py-3 font-sans text-[12.5px] text-ink last:border-b-0 md:text-[14px]"
            >
              <div className="min-w-0 font-mono text-[12px] text-ink-faint md:text-[13px]">
                {date.format(e.paidOn).toUpperCase()}
              </div>
              <div className="min-w-0 truncate">{CATEGORY_LABEL[e.category]}</div>
              <div className="min-w-0 truncate font-mono text-[13px] font-semibold text-ink">
                {e.currency} {money.format(Number(e.amount))}
              </div>
              <div className="min-w-0 truncate">
                {e.order ? (
                  <Link href={`/orders/${e.order.id}`} className="font-mono text-[12.5px] text-brand hover:underline">
                    {e.order.orderNo}
                  </Link>
                ) : (
                  <span className="font-sans text-[12px] text-ink-faint">General</span>
                )}
              </div>
              <div className="min-w-0 truncate text-ink-secondary">{e.recordedBy.name}</div>
              <div className="min-w-0 truncate text-ink-faint">
                {e.note ?? "—"}
                {e.proofOfPaymentPath && (
                  <a
                    href={`/expenses/${e.id}/proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1.5 font-sans text-[11px] text-brand hover:underline"
                  >
                    · receipt
                  </a>
                )}
              </div>
            </div>
          ))}
          <div className="mt-auto">
            <Pagination page={page} perPage={perPage} total={total} />
          </div>
        </div>
      </div>
    </ManagerShellFrame>
  );
}

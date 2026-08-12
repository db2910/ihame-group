import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { StaffTopBar } from "@/components/shell/staff-top-bar";
import { FREIGHT_STAFF_TABS } from "@/components/shell/staff-tabs";
import { ContentHeader } from "@/components/shell/content-header";
import { AddCustomerModal, EditCustomerButton } from "./customer-form-modal";
import { CustomersSearch } from "./customers-search";

const GRID = "grid-cols-[.8fr_1.3fr_1fr_1.3fr_1fr_.6fr]";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["manager", "freight_staff"]);
  const params = await searchParams;
  const query = params.q?.trim();

  const customers = await db.customer.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  const body = (
    <>
      <ContentHeader
        title="Customers"
        subtitle={
          query
            ? `${customers.length} customer${customers.length === 1 ? "" : "s"} matching “${query}”`
            : `${customers.length} customer${customers.length === 1 ? "" : "s"}`
        }
        right={
          <>
            <CustomersSearch />
            <AddCustomerModal />
          </>
        }
      />
      <div className="min-h-0 flex-1 p-4 md:p-6.5">
        <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>CODE</div>
            <div>NAME</div>
            <div>PHONE</div>
            <div>EMAIL</div>
            <div>ID NUMBER</div>
            <div className="text-right">ACTIONS</div>
          </div>
          {customers.length === 0 && (
            <div className="px-4.5 py-8 text-center font-sans text-[15px] text-ink-faint">
              {query ? "No customers match this search." : "No customers yet. Add the first one above."}
            </div>
          )}
          {customers.map((c) => {
            const editButton = (
              <EditCustomerButton
                customer={{
                  id: c.id,
                  name: c.name,
                  phone: c.phone,
                  email: c.email,
                  idNumber: c.idNumber,
                  address: c.address,
                  notes: c.notes,
                }}
              />
            );

            return (
              <div key={c.id} className="border-b border-hairline px-4.5 py-3 last:border-b-0">
                {/* Desktop: the original 6-column grid. */}
                <div className={`hidden ${GRID} items-center gap-2 font-sans text-[15px] text-ink md:grid`}>
                  <div className="min-w-0 truncate font-mono text-[13.5px] text-brand">{c.code}</div>
                  <div className="min-w-0 truncate">{c.name}</div>
                  <div className="min-w-0 truncate text-ink-secondary">{c.phone ?? "—"}</div>
                  <div className="min-w-0 truncate text-ink-secondary">{c.email ?? "—"}</div>
                  <div className="min-w-0 truncate font-mono text-[13.5px] text-ink-secondary">
                    {c.idNumber ?? "—"}
                  </div>
                  <div className="flex justify-end">{editButton}</div>
                </div>

                {/* Phone: name + code lead, phone/email drop to their own
                    row underneath — same shape as Items' mobile card, and
                    at real reading size instead of six columns squeezed
                    into 390px. */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-sans text-[15px] font-medium text-ink">{c.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[12.5px] text-brand">{c.code}</div>
                    </div>
                    <div className="flex-none">{editButton}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 font-sans text-[12.5px] text-ink-faint">
                    <span className="min-w-0 truncate">{c.phone ?? "—"}</span>
                    <span className="min-w-0 truncate">{c.email ?? "—"}</span>
                  </div>
                  {c.idNumber && (
                    <div className="mt-1 truncate font-mono text-[11.5px] text-ink-faint">ID {c.idNumber}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  if (user.role === "manager") {
    return (
      <ManagerShellFrame active="customers" user={user}>
        {body}
      </ManagerShellFrame>
    );
  }

  return (
    <StaffTopBar role="freight_staff" user={user} tabs={FREIGHT_STAFF_TABS} active="customers">
      {body}
    </StaffTopBar>
  );
}

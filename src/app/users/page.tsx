import { requireRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { AddUserModal } from "./add-user-modal";
import { ResetPasswordButton, ToggleActiveButton } from "./user-row-actions";

const ROLE_LABEL: Record<string, string> = {
  manager: "Manager",
  freight_staff: "Freight staff",
  shop_staff: "Shop staff",
};

const ROLE_STYLE: Record<string, string> = {
  manager: "bg-[rgba(40,117,180,.12)] text-brand",
  freight_staff: "bg-[rgba(122,182,72,.18)] text-success",
  shop_staff: "bg-[#EEF0F2] text-ink-muted",
};

const AVATAR_STYLE: Record<string, string> = {
  manager: "bg-brand",
  freight_staff: "bg-accent text-dark",
  shop_staff: "bg-ink-muted",
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatLastActive(date: Date | undefined): string {
  if (!date) return "Never";
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function UsersPage() {
  const manager = await requireRole(["manager"]);

  const [users, lastLogins] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.authEvent.findMany({
      where: { eventType: "login_success", userId: { not: null } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: { userId: true, createdAt: true },
    }),
  ]);
  const lastLoginByUser = new Map(lastLogins.map((e) => [e.userId!, e.createdAt]));

  return (
    <ManagerShellFrame active="users" user={manager}>
      <ContentHeader
        title="Users"
        subtitle="Six accounts · three hardcoded roles, no permissions editor"
        right={<AddUserModal />}
      />
      <div className="min-h-0 flex-1 p-6.5">
        <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div className="grid grid-cols-[1.4fr_1.6fr_1fr_.9fr_.9fr_1fr] gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint">
            <div>NAME</div>
            <div>EMAIL</div>
            <div>ROLE</div>
            <div>STATUS</div>
            <div>LAST ACTIVE</div>
            <div className="text-right">ACTIONS</div>
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1.4fr_1.6fr_1fr_.9fr_.9fr_1fr] items-center gap-2 border-b border-hairline px-4.5 py-3 font-sans text-[13px] text-ink last:border-b-0 md:text-[15px]"
            >
              {/* min-w-0 on both — grid cells default to min-width:auto, so
                  a long nowrap-truncated name/email quietly forces its own
                  track wider (stealing space from the Actions column) unless
                  told it's allowed to shrink below its content's width. */}
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full font-sans text-[11px] font-semibold text-white ${AVATAR_STYLE[u.role]}`}
                >
                  {initials(u.name)}
                </div>
                <span className="truncate">{u.name}</span>
              </div>
              <div className="min-w-0 truncate font-mono text-[12px] text-ink-secondary md:text-[13.5px]">{u.email}</div>
              <div>
                <span className={`rounded-[11px] px-2.5 py-0.5 font-sans text-[11px] font-medium md:text-[12px] ${ROLE_STYLE[u.role]}`}>
                  {ROLE_LABEL[u.role]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-[7px] w-[7px] rounded-full ${u.isActive ? "bg-accent" : "bg-[#C3C9CE]"}`} />
                <span className="font-sans text-[12.5px] text-ink-secondary md:text-[14px]">
                  {u.isActive ? "Active" : "Deactivated"}
                </span>
              </div>
              <div className="font-mono text-[12px] text-ink-faint md:text-[13.5px]">
                {formatLastActive(lastLoginByUser.get(u.id))}
              </div>
              {/* Stacked, not side-by-side — two action links sharing one
                  1fr grid column never fit on a phone width at any font
                  size; each gets the full column to itself this way. */}
              <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:justify-end md:gap-3.5">
                <ResetPasswordButton userId={u.id} />
                {u.id === manager.id ? (
                  <span className="font-sans text-[12px] text-ink-faint md:text-[13.5px]" title="You can't deactivate your own account">
                    —
                  </span>
                ) : (
                  <ToggleActiveButton userId={u.id} isActive={u.isActive} />
                )}
              </div>
            </div>
          ))}
          <div className="px-4.5 py-2.5 font-sans text-[14px] text-ink-faint">
            Deactivated accounts keep their history — orders, sales and audit rows are never deleted.
          </div>
        </div>
      </div>
    </ManagerShellFrame>
  );
}

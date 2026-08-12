import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { verifySessionCookie } from "./session-cookie";
import {
  ABSOLUTE_TIMEOUT_MS,
  ACTIVITY_TOUCH_THRESHOLD_MS,
  IDLE_TIMEOUT_MS,
  SESSION_COOKIE_NAME,
} from "./constants";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};

// Authoritative, DB-backed session check — this is the real gate, not the
// optimistic cookie read in proxy.ts. Memoized per request so calling it
// from a layout and a page in the same render doesn't hit the DB twice.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionCookie(token);
  if (!payload) return null;

  const session = await db.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  const idleFor = now - session.lastActiveAt.getTime();
  const ageMs = now - session.createdAt.getTime();
  const expired =
    now > session.expiresAt.getTime() ||
    idleFor > IDLE_TIMEOUT_MS ||
    ageMs > ABSOLUTE_TIMEOUT_MS;

  if (expired) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) {
    return null;
  }

  if (idleFor > ACTIVITY_TOUCH_THRESHOLD_MS) {
    await db.session
      .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
  };
});

// Spec §6.1: manager -> dashboard, freight staff -> my orders, shop staff -> sale.
export function roleHome(role: Role): string {
  switch (role) {
    case "manager":
      return "/dashboard";
    case "freight_staff":
      return "/orders";
    case "shop_staff":
      return "/sale";
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  // Spec §11: forced reset on first login / after an admin reset. Every
  // protected page goes through here, so this is the one place that needs
  // to know about it. /change-password itself calls getCurrentUser()
  // directly to avoid redirecting to itself.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  return user;
}

// Use in a page/layout to gate a whole section to specific roles. Sends an
// authenticated-but-unauthorized user back to their own home rather than a
// blank 403, since staff never see the manager chrome to know a section
// exists in the first place.
export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(roleHome(user.role));
  }
  return user;
}

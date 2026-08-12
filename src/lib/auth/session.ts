import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { signSessionCookie } from "./session-cookie";
import { ABSOLUTE_TIMEOUT_MS, SESSION_COOKIE_NAME } from "./constants";

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

// Called from the login Server Action after credentials are verified.
export async function createSession(
  userId: string,
  role: Role,
  meta: RequestMeta = {},
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });

  const token = await signSessionCookie({ sid: session.id, uid: userId, role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Logout: revoke the one session on this device and clear the cookie.
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  cookieStore.delete(SESSION_COOKIE_NAME);

  if (!token) return;

  const { verifySessionCookie } = await import("./session-cookie");
  const payload = await verifySessionCookie(token);
  if (!payload) return;

  await db.session.deleteMany({ where: { id: payload.sid } });
}

// Deactivation / forced password reset: revoke *every* session for a user
// immediately, per spec §11. The cookie on other devices is left in place,
// but since the underlying Session row is gone, the next request from that
// device will fail the DB check in dal.ts and be sent back to /login.
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

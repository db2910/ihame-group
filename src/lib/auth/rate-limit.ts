import "server-only";
import { db } from "@/lib/db";
import type { AuthEventType } from "@/generated/prisma/enums";
import { LOGIN_LOCKOUT_WINDOW_MS, LOGIN_MAX_ATTEMPTS } from "./constants";

type RecordAuthEventInput = {
  eventType: AuthEventType;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

// Spec §11: log every login failure (and other auth events), separately
// from the business audit_log.
export async function recordAuthEvent(input: RecordAuthEventInput) {
  await db.authEvent.create({
    data: {
      eventType: input.eventType,
      userId: input.userId ?? null,
      email: input.email ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

// Spec §11: lock an account 15 min after 5 failed attempts from the same IP
// or username. Checked by IP and by email independently — either one being
// over the threshold is enough to lock the attempt out, so a distributed
// guesser working one email from many IPs is still caught.
export async function isLoginLockedOut(params: {
  email: string;
  ipAddress: string | null;
}): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_LOCKOUT_WINDOW_MS);

  const [byEmail, byIp] = await Promise.all([
    db.authEvent.count({
      where: {
        eventType: "login_failure",
        email: params.email,
        createdAt: { gte: since },
      },
    }),
    params.ipAddress
      ? db.authEvent.count({
          where: {
            eventType: "login_failure",
            ipAddress: params.ipAddress,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
  ]);

  return byEmail >= LOGIN_MAX_ATTEMPTS || byIp >= LOGIN_MAX_ATTEMPTS;
}

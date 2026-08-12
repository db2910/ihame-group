import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";
import { ABSOLUTE_TIMEOUT_MS } from "./constants";

// This JWT is an *optimistic* signal only, read by proxy.ts to redirect
// obviously-logged-out visitors without hitting the database on every
// request/prefetch. It is never trusted for real authorization — every
// Server Component/Action re-validates the session against the database
// (see dal.ts), which is the only place a session can actually be revoked.
type SessionCookiePayload = {
  sid: string;
  uid: string;
  role: Role;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionCookie(
  payload: SessionCookiePayload,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ABSOLUTE_TIMEOUT_MS) / 1000))
    .sign(getSecretKey());
}

export async function verifySessionCookie(
  token: string,
): Promise<SessionCookiePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sid !== "string" ||
      typeof payload.uid !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sid: payload.sid,
      uid: payload.uid,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

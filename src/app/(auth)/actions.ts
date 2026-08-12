"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, isPasswordLongEnough, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessionsForUser, destroySession } from "@/lib/auth/session";
import { getCurrentUser, roleHome } from "@/lib/auth/dal";
import { isLoginLockedOut, recordAuthEvent } from "@/lib/auth/rate-limit";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

async function requestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
    userAgent: h.get("user-agent"),
  };
}

export async function signInAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: GENERIC_LOGIN_ERROR };
  }
  const { email, password } = parsed.data;
  const { ipAddress, userAgent } = await requestMeta();

  if (await isLoginLockedOut({ email, ipAddress })) {
    await recordAuthEvent({ eventType: "account_locked", email, ipAddress, userAgent });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    await recordAuthEvent({ eventType: "login_failure", email, ipAddress, userAgent });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (!user.isActive) {
    await recordAuthEvent({
      eventType: "login_failure",
      userId: user.id,
      email,
      ipAddress,
      userAgent,
    });
    return { error: "This account has been deactivated." };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    await recordAuthEvent({
      eventType: "login_failure",
      userId: user.id,
      email,
      ipAddress,
      userAgent,
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  await recordAuthEvent({
    eventType: "login_success",
    userId: user.id,
    email,
    ipAddress,
    userAgent,
  });
  await createSession(user.id, user.role, { ipAddress, userAgent });

  redirect(user.mustChangePassword ? "/change-password" : roleHome(user.role));
}

export async function signOutAction(): Promise<void> {
  const { ipAddress, userAgent } = await requestMeta();
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await recordAuthEvent({
      eventType: "logout",
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
    });
  }
  redirect("/login");
}

export type ChangePasswordState = { error?: string } | undefined;

const changePasswordSchema = z
  .object({
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
  });

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (!isPasswordLongEnough(parsed.data.newPassword)) {
    return { error: "Password must be at least 10 characters." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  const { ipAddress, userAgent } = await requestMeta();
  await recordAuthEvent({
    eventType: "password_reset_completed",
    userId: user.id,
    email: user.email,
    ipAddress,
    userAgent,
  });

  // Revoke every other session — a forced reset (temp password, admin
  // reset) shouldn't leave old sessions valid elsewhere, per spec §11.
  await destroyAllSessionsForUser(user.id);
  await createSession(user.id, user.role, { ipAddress, userAgent });

  redirect(roleHome(user.role));
}

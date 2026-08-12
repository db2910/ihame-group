"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { recordAuthEvent } from "@/lib/auth/rate-limit";
import { recordAuditChange } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";

export type CreateUserState =
  | { error: string }
  | { success: true; email: string; temporaryPassword: string }
  | undefined;

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  role: z.enum([Role.manager, Role.freight_staff, Role.shop_staff]),
});

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireRole(["manager"]);

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash,
      mustChangePassword: true,
    },
  });

  revalidatePath("/users");
  return { success: true, email: parsed.data.email, temporaryPassword };
}

export type ResetPasswordState =
  | { error: string }
  | { success: true; temporaryPassword: string }
  | undefined;

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireRole(["manager"]);
  const userId = String(formData.get("userId") ?? "");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "User not found." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });
  // Spec §11: an admin reset revokes all active sessions for that user.
  await destroyAllSessionsForUser(userId);
  await recordAuthEvent({
    eventType: "password_reset_completed",
    userId: user.id,
    email: user.email,
  });

  revalidatePath("/users");
  return { success: true, temporaryPassword };
}

export async function toggleActiveAction(formData: FormData): Promise<void> {
  const manager = await requireRole(["manager"]);
  const userId = String(formData.get("userId") ?? "");

  if (userId === manager.id) {
    // Deliberately silent no-op: there is no self-registration path, so a
    // manager deactivating their own account would lock everyone out with
    // no way back in.
    return;
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const nextActive = !user.isActive;
  await db.user.update({ where: { id: userId }, data: { isActive: nextActive } });

  if (!nextActive) {
    await destroyAllSessionsForUser(userId);
  }
  await recordAuthEvent({
    eventType: nextActive ? "account_reactivated" : "account_deactivated",
    userId: user.id,
    email: user.email,
  });
  await recordAuditChange({
    tableName: "users",
    recordId: user.id,
    fieldName: "is_active",
    oldValue: String(user.isActive),
    newValue: String(nextActive),
    changedById: manager.id,
  });

  revalidatePath("/users");
}

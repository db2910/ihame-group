"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { generateCustomerCode } from "@/lib/customer-code";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  idNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CustomerFormState =
  | { error: string }
  | { success: true; customer?: { id: string; code: string; name: string } }
  | undefined;

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  const s = v?.toString().trim();
  return s ? s : undefined;
}

export async function createCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await requireRole(["manager", "freight_staff"]);

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: emptyToUndefined(formData.get("phone")),
    email: emptyToUndefined(formData.get("email")),
    idNumber: emptyToUndefined(formData.get("idNumber")),
    address: emptyToUndefined(formData.get("address")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const code = await generateCustomerCode();

  const customer = await db.customer.create({
    data: {
      code,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      idNumber: parsed.data.idNumber ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      createdById: user.id,
    },
  });

  revalidatePath("/customers");
  return { success: true, customer: { id: customer.id, code: customer.code, name: customer.name } };
}

export async function updateCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireRole(["manager", "freight_staff"]);
  const customerId = String(formData.get("customerId") ?? "");

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: emptyToUndefined(formData.get("phone")),
    email: emptyToUndefined(formData.get("email")),
    idNumber: emptyToUndefined(formData.get("idNumber")),
    address: emptyToUndefined(formData.get("address")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    return { error: "Customer not found." };
  }

  await db.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      idNumber: parsed.data.idNumber ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath("/customers");
  return { success: true };
}

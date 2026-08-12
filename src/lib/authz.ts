import type { Role } from "@/generated/prisma/enums";

// Spec §2: the full role matrix, hardcoded. No permissions editor — ever.
// Every entry here must be re-checked server-side at the point of mutation,
// not just used to decide what the UI shows (spec §11: "the UI hiding a
// control is not a control").
export const PERMISSIONS = {
  createFreightOrder: ["manager", "freight_staff"],
  editOwnDraftOrder: ["manager", "freight_staff"],
  editOrderAfterSubmit: ["manager"],
  changeOrderStatus: ["manager"],
  recordPayment: ["manager", "freight_staff"],
  deleteOrder: ["manager"],
  recordSale: ["manager", "shop_staff"],
  editOrVoidSale: ["manager"],
  manageItemsAndStock: ["manager"],
  viewReports: ["manager"],
  manageUsers: ["manager"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

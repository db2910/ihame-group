import "server-only";
import { Prisma } from "@/generated/prisma/client";

// A P2002 unique-constraint violation's column(s) show up in different
// places depending on how Prisma resolved the error: the classic query
// engine puts them at `meta.target` (array or string), but the driver-
// adapter path this project uses (@prisma/adapter-pg) nests them instead at
// `meta.driverAdapterError.cause.constraint.fields` — `target` is absent
// entirely in that shape. Checking only `target` (as every caller here
// originally did) silently falls through to a generic message on every
// real collision. Checking both keeps this correct regardless of which path
// a given Prisma/driver version takes.
export function uniqueConstraintFields(err: unknown): string[] | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return null;
  }

  const target = err.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];

  const driverFields = (
    err.meta as { driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } } } | undefined
  )?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(driverFields)) return driverFields.map(String);

  return null;
}

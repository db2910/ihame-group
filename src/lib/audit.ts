import "server-only";
import { db } from "@/lib/db";

type RecordAuditChangeInput = {
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedById: string;
};

// Spec §4/§11: every field change after a record is no longer freely
// editable gets a row here. Append-only from the app's point of view — see
// prisma/README.md for the DB-level grant/revoke that backs that up.
export async function recordAuditChange(input: RecordAuditChangeInput) {
  await db.auditLog.create({
    data: {
      tableName: input.tableName,
      recordId: input.recordId,
      fieldName: input.fieldName,
      oldValue: input.oldValue,
      newValue: input.newValue,
      changedById: input.changedById,
    },
  });
}

// Diff two flat snapshots of a record and write one row per changed field.
// Values are stringified for storage; callers pass already-formatted
// display values where the raw type wouldn't be meaningful to a reader of
// the audit log (e.g. dates, enums).
export async function recordAuditChanges(params: {
  tableName: string;
  recordId: string;
  changedById: string;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
}) {
  const fields = new Set([
    ...Object.keys(params.before),
    ...Object.keys(params.after),
  ]);

  const changes = [...fields].filter(
    (field) => params.before[field] !== params.after[field],
  );

  if (changes.length === 0) return;

  await db.auditLog.createMany({
    data: changes.map((field) => ({
      tableName: params.tableName,
      recordId: params.recordId,
      fieldName: field,
      oldValue: params.before[field] ?? null,
      newValue: params.after[field] ?? null,
      changedById: params.changedById,
    })),
  });
}

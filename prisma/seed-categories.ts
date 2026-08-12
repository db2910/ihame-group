/**
 * One-time bootstrap of common hardware/building-supply category names, so
 * the Items form's category dropdown isn't empty on a fresh install and the
 * manager isn't forced through "+ New category…" for the first item they add.
 *
 *   npx tsx --env-file=.env prisma/seed-categories.ts
 *
 * Idempotent (upsert by name) — safe to run more than once, and safe to run
 * alongside seed-demo.ts (their category lists overlap by design; the
 * shared names just resolve to the same row). This is a starting point, not
 * a fixed list — the manager can rename any of these or add more at any time
 * through the Add-item form.
 */
import { db } from "../src/lib/db";

const COMMON_CATEGORIES = [
  "Fasteners",
  "Plumbing",
  "Electrical",
  "Tools",
  "Paint & finishes",
  "Building materials",
  "Timber",
  "Adhesives & sealants",
  "Safety equipment",
  "Hardware & fittings",
];

async function main() {
  for (const name of COMMON_CATEGORIES) {
    await db.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Ensured ${COMMON_CATEGORIES.length} common categories exist.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

// Bootstraps the first manager account. There's no self-registration (spec
// §11), so this is the only way the very first login exists.
//
// Usage:
//   SEED_MANAGER_NAME="J. Karangwa" SEED_MANAGER_EMAIL="jmk@ihame.rw" npx prisma db seed
//
// Prints a one-time temporary password — the account is forced to change it
// on first login, same as any other user created through the Users screen.

import { db } from "../src/lib/db";
import { generateTemporaryPassword, hashPassword } from "../src/lib/auth/password";

async function main() {
  const name = process.env.SEED_MANAGER_NAME;
  const email = process.env.SEED_MANAGER_EMAIL?.trim().toLowerCase();

  if (!name || !email) {
    console.error(
      "Set SEED_MANAGER_NAME and SEED_MANAGER_EMAIL before running `prisma db seed`.",
    );
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`A user with email ${email} already exists — nothing to do.`);
    return;
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.user.create({
    data: {
      name,
      email,
      role: "manager",
      passwordHash,
      mustChangePassword: true,
    },
  });

  console.log("Manager account created:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${temporaryPassword}`);
  console.log("They'll be required to set their own password on first login.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

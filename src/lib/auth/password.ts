import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// Spec §11: bcrypt or argon2id, minimum length 10 characters. We use bcrypt
// (via the pure-JS bcryptjs, so there's no native addon to build/deploy).
const SALT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function isPasswordLongEnough(plain: string): boolean {
  return plain.length >= MIN_PASSWORD_LENGTH;
}

// Used for the "temporary password" a manager hands a new hire, and for
// admin-triggered resets. Generated rather than typed by the manager so it
// always clears the minimum-length bar and isn't a reused/guessable value —
// the account is forced to change it on first login either way.
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 12): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  }
  return out;
}

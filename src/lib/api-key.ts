import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export function generateApiKey(): { key: string; prefix: string } {
  const raw = randomBytes(24).toString("hex");
  const key = `hwh_${raw}`;
  const prefix = key.slice(0, 12);
  return { key, prefix };
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

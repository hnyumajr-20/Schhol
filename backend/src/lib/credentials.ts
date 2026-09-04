import crypto from "node:crypto";
import { prisma } from "./prisma";

const ROLE_PREFIX: Record<string, string> = {
  admin: "ADM",
  registrar: "REG",
  accountant: "ACC",
  teacher: "TCH",
  librarian: "LIB",
  it_staff: "ITS",
  student: "STU",
  parent: "PAR",
};

export async function generateIdNumber(role: string): Promise<string> {
  const prefix = ROLE_PREFIX[role] ?? "USR";
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = crypto.randomInt(10000, 99999);
    const candidate = `${prefix}-${year}-${suffix}`;
    const existing = await prisma.user.findUnique({ where: { idNumber: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique ID number, please retry");
}

export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url"); // 12 chars, URL-safe
}

export function generateApiKey(): { key: string; hash: string } {
  const key = crypto.randomBytes(24).toString("base64url");
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

// Per PRD: staff ID numbers are STF-1001, STF-1002, ... — one shared
// sequence across every staff role (not per-role prefixes), starting at
// 1001. The counter lives in system_settings (seeded to 1000) and is
// incremented with a single atomic UPDATE so concurrent staff creation
// can't hand out the same number.
export async function generateStaffIdNumber(): Promise<string> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    UPDATE system_settings
    SET value = to_jsonb((value #>> '{}')::int + 1), updated_at = now()
    WHERE key = 'staff_id_sequence'
    RETURNING value
  `;
  if (rows.length === 0) {
    throw new Error("staff_id_sequence setting is missing — re-run the seed script");
  }
  return `STF-${rows[0].value}`;
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

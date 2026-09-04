import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/tokens";
import { hashToken } from "../../lib/credentials";
import { UnauthorizedError, BadRequestError } from "../../lib/errors";
import { writeAuditLog } from "../../lib/audit";
import { sendEmail } from "../../lib/mailer";
import { env } from "../../config/env";
import crypto from "node:crypto";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function toSessionUser(user: {
  id: string;
  role: string;
  email: string | null;
  idNumber: string | null;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    idNumber: user.idNumber,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function login(identifier: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { idNumber: identifier }, { phone: identifier }],
    },
  });
  if (!user) throw new UnauthorizedError("Invalid credentials");
  if (user.status !== "active") throw new UnauthorizedError("Account is not active");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid credentials");

  const accessToken = signAccessToken({ sub: user.id, role: user.role as any });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken, user: toSessionUser(user) };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash, revokedAt: null },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired or revoked");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "active") throw new UnauthorizedError("Account is not active");

  // Rotate: revoke the used token, issue a new pair.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const newRefreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  const accessToken = signAccessToken({ sub: user.id, role: user.role as any });

  return { accessToken, refreshToken: newRefreshToken, user: toSessionUser(user) };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new BadRequestError("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
  await writeAuditLog({ actorId: userId, action: "password.change", targetType: "user", targetId: userId });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't leak whether the email exists.

  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await sendEmail({
    to: user.email!,
    subject: "Reset your School MIS password",
    html: `<p>Use this token to reset your password (valid for 1 hour): <strong>${token}</strong></p>`,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const stored = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new BadRequestError("Reset token is invalid or expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ]);
  await writeAuditLog({ actorId: stored.userId, action: "password.reset", targetType: "user", targetId: stored.userId });
}

export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.CORS_ORIGIN.startsWith("https"),
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/api/v1/auth",
};

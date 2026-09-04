import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { generateTempPassword } from "../../lib/credentials";
import { NotFoundError } from "../../lib/errors";
import { writeAuditLog } from "../../lib/audit";
import { sendEmail } from "../../lib/mailer";

export async function resetPassword(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });
  await writeAuditLog({ actorId, action: "password.admin_reset", targetType: "user", targetId: userId });

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Your School MIS password was reset",
      html: `<p>Your temporary password is: <strong>${tempPassword}</strong></p><p>You'll be asked to set a new one at your next login.</p>`,
    });
  }

  return { temp_password: tempPassword };
}

export async function assignRfid(userId: string, rfidUid: string, assignedById: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { rfidUid } }),
    prisma.rfidAssignmentLog.create({
      data: {
        userId,
        rfidUid,
        previousRfidUid: user.rfidUid,
        assignedById,
      },
    }),
  ]);
  await writeAuditLog({
    actorId: assignedById,
    action: "rfid.assign",
    targetType: "user",
    targetId: userId,
    metadata: { previous: user.rfidUid, next: rfidUid },
  });

  return { id: userId, rfid_uid: rfidUid };
}

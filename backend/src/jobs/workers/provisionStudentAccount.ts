import { Worker } from "bullmq";
import bcrypt from "bcrypt";
import { redis } from "../../lib/redis";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/mailer";
import { renderAdmissionLetter } from "../../lib/pdf";
import { putObject } from "../../lib/storage";
import { generateIdNumber, generateTempPassword } from "../../lib/credentials";
import { logger } from "../../lib/logger";

interface JobData {
  studentId: string;
}

// Shared by Registrar's manual-approve flow now (Phase 1) and, per PRD
// 5.5.6, the fee-payment webhook in Phase 2 — both just enqueue this job.
export const provisionStudentAccountWorker = new Worker<JobData>(
  "student-provisioning",
  async (job) => {
    const { studentId } = job.data;
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true, class: true, parent: { include: { parentProfile: true } } },
    });
    if (!profile) return;

    const idNumber = await generateIdNumber("student");
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: studentId },
      data: { idNumber, passwordHash, mustChangePassword: true, status: "active" },
    });

    const pdf = await renderAdmissionLetter({
      studentName: `${profile.firstName} ${profile.lastName}`,
      className: profile.class?.name ?? "",
      idNumber,
    });
    const url = await putObject(`admission-letters/${studentId}.pdf`, pdf);
    await prisma.studentProfile.update({ where: { userId: studentId }, data: { admissionLetterUrl: url } });

    const recipientEmail = profile.parent?.email ?? profile.user.email;
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: `${profile.firstName} ${profile.lastName}'s admission has been approved`,
        html: `
          <p>Congratulations — admission for ${profile.firstName} ${profile.lastName} has been approved.</p>
          <p><strong>Student ID number:</strong> ${idNumber}<br/>
             <strong>Temporary password:</strong> ${tempPassword}</p>
          <p>A new password must be set at first login.</p>
        `,
        attachments: [{ filename: "admission-letter.pdf", content: pdf, contentType: "application/pdf" }],
      });
    }
  },
  { connection: redis }
);

provisionStudentAccountWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "student-provisioning job failed");
});

import { Worker } from "bullmq";
import { redis } from "../../lib/redis";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/mailer";
import { renderEmploymentLetter } from "../../lib/pdf";
import { putObject } from "../../lib/storage";
import { logger } from "../../lib/logger";

interface JobData {
  userId: string;
  tempPassword: string;
}

export const sendStaffOnboardingEmailWorker = new Worker<JobData>(
  "staff-onboarding",
  async (job) => {
    const { userId, tempPassword } = job.data;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { staffProfile: true } });
    if (!user || !user.staffProfile) return;

    const pdf = await renderEmploymentLetter({
      staffName: `${user.staffProfile.firstName} ${user.staffProfile.lastName}`,
      role: user.role,
      idNumber: user.idNumber ?? "",
    });
    const url = await putObject(`employment-letters/${userId}.pdf`, pdf);
    await prisma.staffProfile.update({ where: { userId }, data: { employmentLetterUrl: url } });

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Welcome to School MIS — your account",
        html: `
          <p>Hi ${user.staffProfile.firstName},</p>
          <p>Your staff account has been created.</p>
          <p><strong>ID number:</strong> ${user.idNumber}<br/>
             <strong>Temporary password:</strong> ${tempPassword}</p>
          <p>You'll be asked to set a new password on first login.</p>
        `,
        attachments: [{ filename: "employment-letter.pdf", content: pdf, contentType: "application/pdf" }],
      });
    }
  },
  { connection: redis }
);

sendStaffOnboardingEmailWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "staff-onboarding job failed");
});

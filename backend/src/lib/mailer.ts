import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.SMTP_HOST) {
    logger.warn({ to: input.to, subject: input.subject }, "SMTP_HOST not set — skipping email send");
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}

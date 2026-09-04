import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const onboardingQueue = new Queue("staff-onboarding", { connection: redis });
export const provisioningQueue = new Queue("student-provisioning", { connection: redis });
export const calendarQueue = new Queue("academic-calendar-transition", { connection: redis });

import { Worker } from "bullmq";
import { redis } from "../../lib/redis";
import { transitionCalendar } from "../../modules/academicCalendar/academicCalendar.service";
import { logger } from "../../lib/logger";

export const transitionAcademicCalendarWorker = new Worker(
  "academic-calendar-transition",
  async () => {
    const result = await transitionCalendar();
    logger.info(result, "academic calendar transition run");
  },
  { connection: redis }
);

transitionAcademicCalendarWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "academic-calendar-transition job failed");
});

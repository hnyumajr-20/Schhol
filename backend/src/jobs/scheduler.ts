import { calendarQueue } from "./queues";

export async function registerRepeatableJobs() {
  await calendarQueue.add(
    "hourly-transition",
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: "academic-calendar-transition-hourly" }
  );
}

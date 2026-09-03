import { z } from "zod";
import { DAYS_OF_WEEK } from "./constants";

export const createTimetableSlotSchema = z.object({
  start_time: z.string().min(1), // "HH:MM"
  end_time: z.string().min(1),
});
export type CreateTimetableSlotInput = z.infer<typeof createTimetableSlotSchema>;

export const createTimetableEntrySchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  timetable_slot_id: z.string().uuid(),
  day_of_week: z.union(DAYS_OF_WEEK.map((d) => z.literal(d)) as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]),
});
export type CreateTimetableEntryInput = z.infer<typeof createTimetableEntrySchema>;

import { z } from "zod";

export const createTimetableSlotSchema = z.object({
  start_time: z.string().min(1), // "HH:MM"
  end_time: z.string().min(1),
});
export type CreateTimetableSlotInput = z.infer<typeof createTimetableSlotSchema>;

// Monday (1) .. Friday (5), matching DAYS_OF_WEEK in ./constants.
export const dayOfWeekSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const createTimetableEntrySchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  timetable_slot_id: z.string().uuid(),
  day_of_week: dayOfWeekSchema,
});
export type CreateTimetableEntryInput = z.infer<typeof createTimetableEntrySchema>;

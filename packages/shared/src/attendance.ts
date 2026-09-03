import { z } from "zod";
import { ATTENDANCE_SESSIONS, ATTENDANCE_STATUSES } from "./constants";

export const manualAttendanceSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().optional(),
  session: z.enum(ATTENDANCE_SESSIONS).optional(),
  status: z.enum(ATTENDANCE_STATUSES),
});
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

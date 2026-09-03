import { z } from "zod";

export const intakeStudentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  gender: z.string().min(1),
  class_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional(),
  transcript_url: z.string().url().optional(),
});
export type IntakeStudentInput = z.infer<typeof intakeStudentSchema>;

export const matchParentSchema = z.object({
  phone: z.string().min(1),
});
export type MatchParentInput = z.infer<typeof matchParentSchema>;

export const createParentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
});
export type CreateParentInput = z.infer<typeof createParentSchema>;

export const updateStudentClassSchema = z.object({
  class_id: z.string().uuid(),
});
export type UpdateStudentClassInput = z.infer<typeof updateStudentClassSchema>;

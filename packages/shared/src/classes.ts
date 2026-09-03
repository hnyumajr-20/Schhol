import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().min(1),
  fixed_fee: z.coerce.number().nonnegative(),
  max_students: z.coerce.number().int().positive(),
  is_self_contained: z.boolean().optional(),
  sponsor_teacher_id: z.string().uuid().optional(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const updateClassSchema = createClassSchema.partial();
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const createSubjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const assignClassSubjectSchema = z.object({
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
});
export type AssignClassSubjectInput = z.infer<typeof assignClassSubjectSchema>;

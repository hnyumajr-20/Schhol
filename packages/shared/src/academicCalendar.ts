import { z } from "zod";

export const createAcademicYearSchema = z.object({
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const createSemesterSchema = z.object({
  name: z.string().min(1),
  sequence: z.union([z.literal(1), z.literal(2)]),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});
export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;

export const createPeriodSchema = z.object({
  name: z.string().min(1),
  sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  is_exam_period: z.boolean().optional(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;

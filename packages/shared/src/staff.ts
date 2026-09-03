import { z } from "zod";
import { STAFF_ROLES } from "./constants";

export const createStaffSchema = z.object({
  role: z.enum(STAFF_ROLES as [string, ...string[]]),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  date_of_birth: z.string().min(1), // ISO date
  address: z.string().min(1),
  emergency_contact: z.string().optional(),
  salary: z.coerce.number().nonnegative(),
}).refine((data) => !!data.email || !!data.phone, {
  message: "email or phone is required",
  path: ["email"],
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  date_of_birth: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  emergency_contact: z.string().optional(),
  salary: z.coerce.number().nonnegative().optional(),
});
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

// Admin-only: email/phone changes are never accepted through updateStaffSchema (PRD 4.1.7).
export const updateContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

import { z } from "zod";
import { DEVICE_PURPOSES } from "./constants";

export const registerDeviceSchema = z.object({
  device_name: z.string().min(1),
  class_id: z.string().uuid().optional(),
  purpose: z.enum(DEVICE_PURPOSES),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const deviceScanSchema = z.object({
  rfid_uid: z.string().min(1),
  scanned_at: z.string().min(1),
});
export type DeviceScanInput = z.infer<typeof deviceScanSchema>;

// IT Staff's RFID endpoint must accept *only* this field (PRD 4.3.6) — the
// backend handler rejects any request body with extra keys.
export const assignRfidSchema = z.object({
  rfid_uid: z.string().min(1),
}).strict();
export type AssignRfidInput = z.infer<typeof assignRfidSchema>;

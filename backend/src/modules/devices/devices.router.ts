import { Router } from "express";
import { deviceScanSchema, registerDeviceSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { requireDeviceAuth } from "../../middleware/deviceAuth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./devices.controller";

export const devicesRouter = Router();

devicesRouter.get("/", requireAuth, requireRole("it_staff", "admin"), asyncHandler(ctrl.listDevicesHandler));
devicesRouter.post(
  "/",
  requireAuth,
  requireRole("it_staff"),
  validateBody(registerDeviceSchema),
  asyncHandler(ctrl.registerDeviceHandler)
);

// Devices authenticate with their own API key (middleware/deviceAuth), not a user JWT.
devicesRouter.post(
  "/:deviceId/scans",
  requireDeviceAuth,
  validateBody(deviceScanSchema),
  asyncHandler(ctrl.scanHandler)
);

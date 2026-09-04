import { Router } from "express";
import { manualAttendanceSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./attendance.controller";

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth, requireRole("admin", "registrar", "teacher"));

attendanceRouter.get("/", asyncHandler(ctrl.listAttendanceHandler));
attendanceRouter.post(
  "/manual",
  requireRole("teacher"),
  validateBody(manualAttendanceSchema),
  asyncHandler(ctrl.markManualHandler)
);

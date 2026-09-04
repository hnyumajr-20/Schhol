import { Router } from "express";
import { createTimetableEntrySchema, createTimetableSlotSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./timetable.controller";

export const timetableSlotsRouter = Router();
timetableSlotsRouter.use(requireAuth);
timetableSlotsRouter.get("/", asyncHandler(ctrl.listSlotsHandler));
timetableSlotsRouter.post(
  "/",
  requireRole("admin"),
  validateBody(createTimetableSlotSchema),
  asyncHandler(ctrl.createSlotHandler)
);

export const timetableEntriesRouter = Router();
timetableEntriesRouter.use(requireAuth);
timetableEntriesRouter.post(
  "/",
  requireRole("admin"),
  validateBody(createTimetableEntrySchema),
  asyncHandler(ctrl.createEntryHandler)
);

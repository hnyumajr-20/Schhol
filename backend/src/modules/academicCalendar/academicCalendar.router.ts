import { Router } from "express";
import { createAcademicYearSchema, createPeriodSchema, createSemesterSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./academicCalendar.controller";

export const academicYearsRouter = Router();
academicYearsRouter.use(requireAuth);

academicYearsRouter.get("/", asyncHandler(ctrl.listYearsHandler));
academicYearsRouter.post(
  "/",
  requireRole("admin"),
  validateBody(createAcademicYearSchema),
  asyncHandler(ctrl.createYearHandler)
);
academicYearsRouter.post(
  "/:yearId/semesters",
  requireRole("admin"),
  validateBody(createSemesterSchema),
  asyncHandler(ctrl.createSemesterHandler)
);
academicYearsRouter.post(
  "/semesters/:semesterId/periods",
  requireRole("admin"),
  validateBody(createPeriodSchema),
  asyncHandler(ctrl.createPeriodHandler)
);

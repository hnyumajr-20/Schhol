import { Router } from "express";
import { createParentSchema, intakeStudentSchema, matchParentSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./students.controller";

export const studentsRouter = Router();
studentsRouter.use(requireAuth, requireRole("admin", "registrar"));

studentsRouter.get("/", asyncHandler(ctrl.listStudentsHandler));
studentsRouter.post("/", validateBody(intakeStudentSchema), asyncHandler(ctrl.intakeHandler));
studentsRouter.post("/:id/approve", asyncHandler(ctrl.approveHandler));

export const parentsRouter = Router();
parentsRouter.use(requireAuth, requireRole("admin", "registrar"));
parentsRouter.post("/match", validateBody(matchParentSchema), asyncHandler(ctrl.matchParentHandler));
parentsRouter.post("/", validateBody(createParentSchema), asyncHandler(ctrl.createParentHandler));

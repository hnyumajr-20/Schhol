import { Router } from "express";
import { assignClassSubjectSchema, createClassSchema, createSubjectSchema, updateClassSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./classes.controller";

export const classesRouter = Router();
classesRouter.use(requireAuth);

classesRouter.get("/", asyncHandler(ctrl.listClassesHandler));
classesRouter.post("/", requireRole("admin"), validateBody(createClassSchema), asyncHandler(ctrl.createClassHandler));
classesRouter.patch("/:id", requireRole("admin"), validateBody(updateClassSchema), asyncHandler(ctrl.updateClassHandler));
classesRouter.post(
  "/:classId/subjects",
  requireRole("admin"),
  validateBody(assignClassSubjectSchema),
  asyncHandler(ctrl.assignClassSubjectHandler)
);

export const subjectsRouter = Router();
subjectsRouter.use(requireAuth);
subjectsRouter.get("/", asyncHandler(ctrl.listSubjectsHandler));
subjectsRouter.post("/", requireRole("admin"), validateBody(createSubjectSchema), asyncHandler(ctrl.createSubjectHandler));

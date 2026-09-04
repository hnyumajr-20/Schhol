import { Router } from "express";
import { createStaffSchema, updateStaffSchema, updateContactSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./staff.controller";

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("admin"));

staffRouter.get("/", asyncHandler(ctrl.listStaffHandler));
staffRouter.post("/", validateBody(createStaffSchema), asyncHandler(ctrl.createStaffHandler));
staffRouter.patch("/:id", validateBody(updateStaffSchema), asyncHandler(ctrl.updateStaffHandler));
staffRouter.patch("/:id/contact", validateBody(updateContactSchema), asyncHandler(ctrl.updateContactHandler));
staffRouter.post("/:id/deactivate", asyncHandler(ctrl.deactivateStaffHandler));

import { Router } from "express";
import { assignRfidSchema } from "@school-mis/shared";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./users.controller";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.post("/:id/reset-password", requireRole("admin", "it_staff"), asyncHandler(ctrl.resetPasswordHandler));

// IT Staff's RFID PATCH accepts *only* rfid_uid (assignRfidSchema is .strict()) — PRD 4.3.6 / 1.1.
usersRouter.patch(
  "/:id/rfid",
  requireRole("it_staff"),
  validateBody(assignRfidSchema),
  asyncHandler(ctrl.assignRfidHandler)
);

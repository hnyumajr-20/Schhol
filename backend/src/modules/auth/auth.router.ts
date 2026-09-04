import { Router } from "express";
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "@school-mis/shared";
import { validateBody } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import * as ctrl from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), asyncHandler(ctrl.loginHandler));
authRouter.post("/refresh", asyncHandler(ctrl.refreshHandler));
authRouter.post("/logout", asyncHandler(ctrl.logoutHandler));
authRouter.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(ctrl.changePasswordHandler)
);
authRouter.post("/forgot-password", validateBody(forgotPasswordSchema), asyncHandler(ctrl.forgotPasswordHandler));
authRouter.post(
  "/reset-password/:token",
  validateBody(resetPasswordSchema),
  asyncHandler(ctrl.resetPasswordHandler)
);

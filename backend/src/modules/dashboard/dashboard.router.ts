import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../lib/asyncHandler";
import { getSummary } from "./dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.get(
  "/summary",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => res.json(await getSummary()))
);

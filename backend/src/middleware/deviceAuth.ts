import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { UnauthorizedError } from "../lib/errors";

// Devices authenticate with their own API key, never a user JWT (PRD Section 8).
export async function requireDeviceAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers["x-device-api-key"];
  if (typeof header !== "string" || !header) {
    return next(new UnauthorizedError("Missing device API key"));
  }
  const hash = crypto.createHash("sha256").update(header).digest("hex");
  const device = await prisma.device.findFirst({ where: { id: req.params.deviceId, apiKeyHash: hash } });
  if (!device) {
    return next(new UnauthorizedError("Invalid device API key"));
  }
  req.device = { id: device.id, classId: device.classId, purpose: device.purpose };
  next();
}

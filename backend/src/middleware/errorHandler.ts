import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A record with these unique fields already exists", code: "CONFLICT" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found", code: "NOT_FOUND" });
    }
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({ message: "Internal server error" });
}

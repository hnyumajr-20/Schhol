import type { NextFunction, Request, Response } from "express";
import { toSnakeCase } from "../lib/caseConvert";

// Converts every res.json(...) payload's keys to snake_case, so individual
// controllers don't each need a hand-written serializer to match the PRD's
// snake_case REST convention (see lib/caseConvert.ts).
export function snakeCaseResponse(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => originalJson(toSnakeCase(body));
  next();
}

import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@school-mis/shared";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(", ")}`));
    }
    next();
  };
}

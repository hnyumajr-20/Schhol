import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { BadRequestError } from "../lib/errors";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new BadRequestError(result.error.errors.map((e) => e.message).join("; ")));
    }
    req.body = result.data;
    next();
  };
}

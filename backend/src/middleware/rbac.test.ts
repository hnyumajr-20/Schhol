import type { Request, Response } from "express";
import { requireRole } from "./rbac";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

function mockReq(user?: { id: string; role: any }): Request {
  return { user } as unknown as Request;
}

describe("requireRole", () => {
  it("calls next() with UnauthorizedError when there is no user on the request", () => {
    const next = jest.fn();
    requireRole("admin")(mockReq(undefined), {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("calls next() with ForbiddenError when the user's role isn't allowed", () => {
    const next = jest.fn();
    requireRole("admin")(mockReq({ id: "u1", role: "teacher" }), {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("calls next() with no error when the role matches", () => {
    const next = jest.fn();
    requireRole("admin", "registrar")(mockReq({ id: "u1", role: "registrar" }), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
});

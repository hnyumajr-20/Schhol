import type { Request, Response } from "express";
import { assignRfidSchema } from "@school-mis/shared";
import { validateBody } from "./validate";
import { BadRequestError } from "../lib/errors";

function mockReq(body: unknown): Request {
  return { body } as unknown as Request;
}

describe("validateBody(assignRfidSchema)", () => {
  // PRD 4.3.6 / 1.1: IT Staff's RFID PATCH must accept *only* rfid_uid.
  it("rejects a body with extra fields", () => {
    const next = jest.fn();
    validateBody(assignRfidSchema)(
      mockReq({ rfid_uid: "ABC123", role: "admin" }),
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it("accepts a body with just rfid_uid", () => {
    const req = mockReq({ rfid_uid: "ABC123" });
    const next = jest.fn();
    validateBody(assignRfidSchema)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ rfid_uid: "ABC123" });
  });
});

import type { Request, Response } from "express";
import * as usersService from "./users.service";

export async function resetPasswordHandler(req: Request, res: Response) {
  const result = await usersService.resetPassword(req.params.id, req.user!.id);
  res.json(result);
}

export async function assignRfidHandler(req: Request, res: Response) {
  const result = await usersService.assignRfid(req.params.id, req.body.rfid_uid, req.user!.id);
  res.json(result);
}

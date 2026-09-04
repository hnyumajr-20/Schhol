import type { Request, Response } from "express";
import * as staffService from "./staff.service";

export async function listStaffHandler(_req: Request, res: Response) {
  res.json(await staffService.listStaff());
}

export async function createStaffHandler(req: Request, res: Response) {
  const staff = await staffService.createStaff(req.body);
  res.status(201).json(staff);
}

export async function updateStaffHandler(req: Request, res: Response) {
  const staff = await staffService.updateStaff(req.params.id, req.body);
  res.json(staff);
}

export async function updateContactHandler(req: Request, res: Response) {
  const result = await staffService.updateContact(req.params.id, req.body);
  res.json(result);
}

export async function deactivateStaffHandler(req: Request, res: Response) {
  await staffService.deactivateStaff(req.params.id);
  res.status(204).send();
}

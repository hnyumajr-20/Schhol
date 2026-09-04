import type { Request, Response } from "express";
import * as service from "./students.service";

export async function listStudentsHandler(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  res.json(await service.listStudents(status));
}

export async function intakeHandler(req: Request, res: Response) {
  res.status(201).json(await service.intake(req.body));
}

export async function approveHandler(req: Request, res: Response) {
  res.json(await service.approve(req.params.id));
}

export async function matchParentHandler(req: Request, res: Response) {
  const parent = await service.matchParent(req.body.phone);
  res.json(parent);
}

export async function createParentHandler(req: Request, res: Response) {
  res.status(201).json(await service.createParent(req.body));
}

import type { Request, Response } from "express";
import * as service from "./classes.service";

export async function listClassesHandler(_req: Request, res: Response) {
  res.json(await service.listClasses());
}
export async function createClassHandler(req: Request, res: Response) {
  res.status(201).json(await service.createClass(req.body));
}
export async function updateClassHandler(req: Request, res: Response) {
  res.json(await service.updateClass(req.params.id, req.body));
}
export async function listSubjectsHandler(_req: Request, res: Response) {
  res.json(await service.listSubjects());
}
export async function createSubjectHandler(req: Request, res: Response) {
  res.status(201).json(await service.createSubject(req.body));
}
export async function assignClassSubjectHandler(req: Request, res: Response) {
  res.status(201).json(await service.assignClassSubject(req.params.classId, req.body));
}

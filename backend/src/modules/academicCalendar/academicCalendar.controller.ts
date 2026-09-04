import type { Request, Response } from "express";
import * as service from "./academicCalendar.service";

export async function listYearsHandler(_req: Request, res: Response) {
  res.json(await service.listYears());
}

export async function createYearHandler(req: Request, res: Response) {
  res.status(201).json(await service.createYear(req.body));
}

export async function createSemesterHandler(req: Request, res: Response) {
  res.status(201).json(await service.createSemester(req.params.yearId, req.body));
}

export async function createPeriodHandler(req: Request, res: Response) {
  res.status(201).json(await service.createPeriod(req.params.semesterId, req.body));
}

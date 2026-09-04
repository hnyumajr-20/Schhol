import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import * as service from "./timetable.service";

export async function listSlotsHandler(_req: Request, res: Response) {
  res.json(await service.listSlots());
}
export async function createSlotHandler(req: Request, res: Response) {
  res.status(201).json(await service.createSlot(req.body));
}
export async function createEntryHandler(req: Request, res: Response) {
  res.status(201).json(await service.createEntry(req.body));
}
export async function myTimetableHandler(req: Request, res: Response) {
  if (req.user!.role === "teacher") {
    return res.json(await service.listEntriesForTeacher(req.user!.id));
  }
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student?.classId) return res.json([]);
  res.json(await service.listEntriesForClass(student.classId));
}

import type { Request, Response } from "express";
import * as service from "./attendance.service";

export async function listAttendanceHandler(req: Request, res: Response) {
  const { class_id, student_id, date } = req.query;
  res.json(
    await service.listAttendance({
      classId: typeof class_id === "string" ? class_id : undefined,
      studentId: typeof student_id === "string" ? student_id : undefined,
      date: typeof date === "string" ? date : undefined,
    })
  );
}

export async function markManualHandler(req: Request, res: Response) {
  res.status(201).json(await service.markManual(req.body, req.user!.id));
}

export async function myAttendanceHandler(req: Request, res: Response) {
  res.json(await service.listForStudent(req.user!.id));
}

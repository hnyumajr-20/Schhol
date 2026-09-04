import { prisma } from "../../lib/prisma";
import { NotFoundError, BadRequestError } from "../../lib/errors";
import { emitAttendanceRecorded } from "../../realtime/socket";
import type { ManualAttendanceInput } from "@school-mis/shared";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Postgres unique constraints treat NULLs as distinct, so a compound unique
// containing nullable columns (subjectId/session here) can't be used as a
// point lookup in Prisma's upsert `where` — it rejects null outright. Do the
// find-then-write by hand instead of `attendanceRecord.upsert(...)`.
async function upsertAttendanceRecord(input: {
  studentId: string;
  classId: string;
  subjectId: string | null;
  session: string | null;
  date: Date;
  status: string;
  method: "manual" | "rfid";
  recordedBy?: string | null;
  scannedAt?: Date;
}) {
  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      studentId: input.studentId,
      date: input.date,
      subjectId: input.subjectId,
      session: input.session,
    },
  });

  if (existing) {
    return prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        status: input.status as any,
        method: input.method,
        recordedBy: input.recordedBy,
        scannedAt: input.scannedAt,
      },
    });
  }

  return prisma.attendanceRecord.create({
    data: {
      studentId: input.studentId,
      classId: input.classId,
      subjectId: input.subjectId,
      session: input.session,
      date: input.date,
      status: input.status as any,
      method: input.method,
      recordedBy: input.recordedBy,
      scannedAt: input.scannedAt,
    },
  });
}

export async function listAttendance(filter: { classId?: string; studentId?: string; date?: string }) {
  return prisma.attendanceRecord.findMany({
    where: {
      classId: filter.classId,
      studentId: filter.studentId,
      date: filter.date ? startOfDay(new Date(filter.date)) : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listForStudent(studentId: string) {
  return prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function markManual(input: ManualAttendanceInput, recordedBy: string) {
  const date = startOfDay(new Date());
  const record = await upsertAttendanceRecord({
    studentId: input.student_id,
    classId: input.class_id,
    subjectId: input.subject_id ?? null,
    session: input.session ?? null,
    date,
    status: input.status,
    method: "manual",
    recordedBy,
  });

  emitAttendanceRecorded(input.class_id, record);
  return record;
}

// Simplified Phase 1 rule: self-contained classes attendance twice a day
// (morning/end_of_day, no subject); subject-based classes need an active
// timetable entry for "now" to know which subject the tap counts toward.
export async function handleDeviceScan(deviceId: string, rfidUid: string, scannedAt: Date) {
  const device = await prisma.device.findUnique({ where: { id: deviceId }, include: { class: true } });
  if (!device || device.purpose !== "attendance" || !device.classId || !device.class) {
    throw new BadRequestError("Device is not configured for attendance");
  }

  const student = await prisma.user.findUnique({ where: { rfidUid } });
  if (!student || student.role !== "student") {
    throw new NotFoundError("No student is associated with this RFID card");
  }

  const date = startOfDay(scannedAt);
  let subjectId: string | null = null;
  let session: string | null = null;

  if (device.class.isSelfContained) {
    session = scannedAt.getHours() < 12 ? "morning" : "end_of_day";
  } else {
    const dayOfWeek = scannedAt.getDay() === 0 ? 7 : scannedAt.getDay(); // Sun=0 -> 7, unused (1-5 valid)
    const entries = await prisma.timetableEntry.findMany({
      where: { classId: device.classId, dayOfWeek },
      include: { slot: true },
    });
    const nowMinutes = scannedAt.getHours() * 60 + scannedAt.getMinutes();
    const active = entries.find((e) => {
      const start = e.slot.startTime.getUTCHours() * 60 + e.slot.startTime.getUTCMinutes();
      const end = e.slot.endTime.getUTCHours() * 60 + e.slot.endTime.getUTCMinutes();
      return nowMinutes >= start && nowMinutes <= end;
    });
    if (!active) {
      throw new BadRequestError("No active timetable slot for this class right now");
    }
    subjectId = active.subjectId;
  }

  const record = await upsertAttendanceRecord({
    studentId: student.id,
    classId: device.classId,
    subjectId,
    session,
    date,
    status: "present",
    method: "rfid",
    scannedAt,
  });

  emitAttendanceRecorded(device.classId, record);
  return record;
}

import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { publicTeacherSelect } from "../../lib/publicSelect";
import { ConflictError } from "../../lib/errors";
import type { CreateTimetableEntryInput, CreateTimetableSlotInput } from "@school-mis/shared";

export async function listSlots() {
  return prisma.timetableSlot.findMany({ orderBy: { startTime: "asc" } });
}

export async function createSlot(input: CreateTimetableSlotInput) {
  return prisma.timetableSlot.create({
    data: {
      startTime: new Date(`1970-01-01T${input.start_time}:00Z`),
      endTime: new Date(`1970-01-01T${input.end_time}:00Z`),
    },
  });
}

export async function createEntry(input: CreateTimetableEntryInput) {
  try {
    return await prisma.timetableEntry.create({
      data: {
        classId: input.class_id,
        subjectId: input.subject_id,
        teacherId: input.teacher_id,
        timetableSlotId: input.timetable_slot_id,
        dayOfWeek: input.day_of_week,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("That teacher or class already has an entry in this slot/day");
    }
    throw err;
  }
}

export async function listEntriesForTeacher(teacherId: string) {
  return prisma.timetableEntry.findMany({
    where: { teacherId },
    include: { class: true, subject: true, slot: true },
    orderBy: [{ dayOfWeek: "asc" }],
  });
}

export async function listEntriesForClass(classId: string) {
  return prisma.timetableEntry.findMany({
    where: { classId },
    include: { subject: true, teacher: { select: publicTeacherSelect }, slot: true },
    orderBy: [{ dayOfWeek: "asc" }],
  });
}

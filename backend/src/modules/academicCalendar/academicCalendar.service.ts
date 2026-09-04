import { prisma } from "../../lib/prisma";
import type {
  CreateAcademicYearInput,
  CreatePeriodInput,
  CreateSemesterInput,
} from "@school-mis/shared";

export async function listYears() {
  return prisma.academicYear.findMany({
    include: { semesters: { include: { periods: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function createYear(input: CreateAcademicYearInput) {
  return prisma.academicYear.create({
    data: {
      name: input.name,
      startDate: new Date(input.start_date),
      endDate: new Date(input.end_date),
    },
  });
}

export async function createSemester(academicYearId: string, input: CreateSemesterInput) {
  return prisma.semester.create({
    data: {
      academicYearId,
      name: input.name,
      sequence: input.sequence,
      startDate: new Date(input.start_date),
      endDate: new Date(input.end_date),
    },
  });
}

export async function createPeriod(semesterId: string, input: CreatePeriodInput) {
  return prisma.period.create({
    data: {
      semesterId,
      name: input.name,
      sequence: input.sequence,
      isExamPeriod: input.is_exam_period ?? false,
      startDate: new Date(input.start_date),
      endDate: new Date(input.end_date),
    },
  });
}

export function statusFor(start: Date, end: Date, today: Date): "upcoming" | "active" | "closed" {
  if (today < start) return "upcoming";
  if (today > end) return "closed";
  return "active";
}

// Runs hourly (jobs/workers/transitionAcademicCalendar.ts) to flip
// years/semesters/periods between upcoming -> active -> closed as their
// date ranges are entered/exited (PRD Section 6.1).
export async function transitionCalendar(): Promise<{ years: number; semesters: number; periods: number }> {
  const today = new Date();
  let years = 0;
  let semesters = 0;
  let periods = 0;

  for (const year of await prisma.academicYear.findMany()) {
    const status = statusFor(year.startDate, year.endDate, today);
    if (status !== year.status) {
      await prisma.academicYear.update({ where: { id: year.id }, data: { status } });
      years++;
    }
  }
  for (const semester of await prisma.semester.findMany()) {
    const status = statusFor(semester.startDate, semester.endDate, today);
    if (status !== semester.status) {
      await prisma.semester.update({ where: { id: semester.id }, data: { status } });
      semesters++;
    }
  }
  for (const period of await prisma.period.findMany()) {
    const status = statusFor(period.startDate, period.endDate, today);
    if (status !== period.status) {
      await prisma.period.update({ where: { id: period.id }, data: { status } });
      periods++;
    }
  }

  return { years, semesters, periods };
}

import { prisma } from "../../lib/prisma";
import { publicTeacherSelect } from "../../lib/publicSelect";
import type {
  AssignClassSubjectInput,
  CreateClassInput,
  CreateSubjectInput,
  UpdateClassInput,
} from "@school-mis/shared";

export async function listClasses() {
  return prisma.class.findMany({
    include: {
      classSubjects: { include: { subject: true, teacher: { select: publicTeacherSelect } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createClass(input: CreateClassInput) {
  return prisma.class.create({
    data: {
      name: input.name,
      fixedFee: input.fixed_fee,
      maxStudents: input.max_students,
      isSelfContained: input.is_self_contained ?? false,
      sponsorTeacherId: input.sponsor_teacher_id,
    },
  });
}

export async function updateClass(id: string, input: UpdateClassInput) {
  return prisma.class.update({
    where: { id },
    data: {
      name: input.name,
      fixedFee: input.fixed_fee,
      maxStudents: input.max_students,
      isSelfContained: input.is_self_contained,
      sponsorTeacherId: input.sponsor_teacher_id,
    },
  });
}

export async function listSubjects() {
  return prisma.subject.findMany({ orderBy: { name: "asc" } });
}

export async function createSubject(input: CreateSubjectInput) {
  return prisma.subject.create({ data: { name: input.name, code: input.code } });
}

export async function assignClassSubject(classId: string, input: AssignClassSubjectInput) {
  return prisma.classSubject.create({
    data: { classId, subjectId: input.subject_id, teacherId: input.teacher_id },
  });
}

import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { NotFoundError, BadRequestError } from "../../lib/errors";
import { provisioningQueue } from "../../jobs/queues";
import type { CreateParentInput, IntakeStudentInput } from "@school-mis/shared";

// Placeholder credential for accounts that can't log in yet (pending
// students/parents) — status stays 'pending' so auth.service rejects login
// regardless of this hash.
async function placeholderPasswordHash(): Promise<string> {
  return bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);
}

export async function listStudents(status?: string) {
  const students = await prisma.studentProfile.findMany({
    where: status ? { admissionStatus: status } : undefined,
    include: { user: true, class: true, parent: { include: { parentProfile: true } } },
    orderBy: { createdAt: "desc" },
  });
  return students.map(serializeStudent);
}

export async function intake(input: IntakeStudentInput) {
  const passwordHash = await placeholderPasswordHash();
  const user = await prisma.user.create({
    data: {
      role: "student",
      status: "pending",
      passwordHash,
      mustChangePassword: true,
      studentProfile: {
        create: {
          firstName: input.first_name,
          lastName: input.last_name,
          dateOfBirth: new Date(input.date_of_birth),
          gender: input.gender,
          classId: input.class_id,
          parentId: input.parent_id,
          transcriptUrl: input.transcript_url,
          admissionStatus: "pending",
        },
      },
    },
    include: { studentProfile: true },
  });
  return serializeStudent({ ...user.studentProfile!, user, class: null, parent: null });
}

export async function matchParent(phone: string) {
  const parent = await prisma.user.findFirst({
    where: { role: "parent", phone },
    include: { parentProfile: true },
  });
  if (!parent) return null;
  return {
    id: parent.id,
    phone: parent.phone,
    first_name: parent.parentProfile?.firstName,
    last_name: parent.parentProfile?.lastName,
  };
}

export async function createParent(input: CreateParentInput) {
  const passwordHash = await placeholderPasswordHash();
  const user = await prisma.user.create({
    data: {
      role: "parent",
      status: "pending",
      email: input.email,
      phone: input.phone,
      passwordHash,
      mustChangePassword: true,
      parentProfile: {
        create: {
          firstName: input.first_name,
          lastName: input.last_name,
          address: input.address,
        },
      },
    },
  });
  return { id: user.id, phone: user.phone, email: user.email };
}

export async function approve(studentId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: { class: true },
  });
  if (!profile) throw new NotFoundError("Student not found");
  if (profile.admissionStatus === "approved") throw new BadRequestError("Student is already approved");
  if (!profile.classId) throw new BadRequestError("Assign a class before approving admission");

  await prisma.studentProfile.update({
    where: { userId: studentId },
    data: { admissionStatus: "approved" },
  });

  await provisioningQueue.add("provision-student-account", { studentId });

  return { id: studentId, admission_status: "approved" };
}

function serializeStudent(profile: any) {
  return {
    id: profile.userId,
    status: profile.user.status,
    id_number: profile.user.idNumber,
    first_name: profile.firstName,
    last_name: profile.lastName,
    date_of_birth: profile.dateOfBirth,
    gender: profile.gender,
    class_id: profile.classId,
    class_name: profile.class?.name,
    parent_id: profile.parentId,
    admission_status: profile.admissionStatus,
  };
}

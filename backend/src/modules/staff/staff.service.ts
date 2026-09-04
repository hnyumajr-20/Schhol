import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { generateIdNumber, generateTempPassword } from "../../lib/credentials";
import { NotFoundError } from "../../lib/errors";
import { onboardingQueue } from "../../jobs/queues";
import type { CreateStaffInput, UpdateContactInput, UpdateStaffInput } from "@school-mis/shared";

export async function listStaff() {
  const staff = await prisma.staffProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return staff.map(serializeStaff);
}

export async function createStaff(input: CreateStaffInput) {
  const idNumber = await generateIdNumber(input.role);
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      role: input.role as any,
      email: input.email,
      phone: input.phone,
      idNumber,
      passwordHash,
      mustChangePassword: true,
      status: "active",
      staffProfile: {
        create: {
          firstName: input.first_name,
          lastName: input.last_name,
          dateOfBirth: new Date(input.date_of_birth),
          address: input.address,
          emergencyContact: input.emergency_contact,
          salary: input.salary,
        },
      },
    },
    include: { staffProfile: true },
  });

  await onboardingQueue.add("send-staff-onboarding-email", {
    userId: user.id,
    tempPassword,
  });

  return serializeStaff({ ...user.staffProfile!, user });
}

export async function updateStaff(userId: string, input: UpdateStaffInput) {
  const profile = await prisma.staffProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Staff member not found");

  const updated = await prisma.staffProfile.update({
    where: { userId },
    data: {
      firstName: input.first_name,
      lastName: input.last_name,
      dateOfBirth: input.date_of_birth ? new Date(input.date_of_birth) : undefined,
      address: input.address,
      emergencyContact: input.emergency_contact,
      salary: input.salary,
    },
    include: { user: true },
  });
  return serializeStaff(updated);
}

// Admin-only (PRD 1.1 / 4.1.7): email/phone changes never go through updateStaff.
export async function updateContact(userId: string, input: UpdateContactInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { email: input.email, phone: input.phone },
  });
  return { id: user.id, email: user.email, phone: user.phone };
}

export async function deactivateStaff(userId: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status: "inactive" } }),
    prisma.staffProfile.update({ where: { userId }, data: { deactivatedAt: new Date() } }),
  ]);
}

function serializeStaff(profile: any) {
  return {
    id: profile.userId,
    role: profile.user.role,
    email: profile.user.email,
    phone: profile.user.phone,
    id_number: profile.user.idNumber,
    status: profile.user.status,
    first_name: profile.firstName,
    last_name: profile.lastName,
    date_of_birth: profile.dateOfBirth,
    address: profile.address,
    salary: profile.salary,
  };
}

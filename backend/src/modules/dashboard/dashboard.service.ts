import { prisma } from "../../lib/prisma";

export async function getSummary() {
  const [staffCount, approvedStudents, pendingStudents, classCount, deviceCount] = await Promise.all([
    prisma.staffProfile.count({ where: { deactivatedAt: null } }),
    prisma.studentProfile.count({ where: { admissionStatus: "approved" } }),
    prisma.studentProfile.count({ where: { admissionStatus: "pending" } }),
    prisma.class.count(),
    prisma.device.count({ where: { status: "online" } }),
  ]);

  return {
    staff_count: staffCount,
    approved_students: approvedStudents,
    pending_students: pendingStudents,
    class_count: classCount,
    devices_online: deviceCount,
  };
}

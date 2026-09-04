import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@school.example";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
    await prisma.user.create({
      data: {
        role: "admin",
        email: adminEmail,
        idNumber: "ADM-0001",
        passwordHash,
        mustChangePassword: true,
        status: "active",
        staffProfile: {
          create: {
            firstName: "System",
            lastName: "Admin",
            dateOfBirth: new Date("1990-01-01"),
            address: "N/A",
            salary: 0,
          },
        },
      },
    });
    console.log(`Seeded admin: ${adminEmail} / ChangeMe123! (must change on first login)`);
  }

  await prisma.systemSetting.upsert({
    where: { key: "default_registration_fee" },
    update: {},
    create: { key: "default_registration_fee", value: 100 },
  });
  await prisma.systemSetting.upsert({
    where: { key: "currency" },
    update: {},
    create: { key: "currency", value: "LRD" },
  });

  const defaultSlots: [string, string][] = [
    ["08:00", "08:45"],
    ["08:45", "09:30"],
    ["09:30", "10:15"],
    ["10:30", "11:15"],
    ["11:15", "12:00"],
    ["13:00", "13:45"],
  ];
  for (const [start, end] of defaultSlots) {
    const startTime = new Date(`1970-01-01T${start}:00Z`);
    const endTime = new Date(`1970-01-01T${end}:00Z`);
    await prisma.timetableSlot.upsert({
      where: { startTime_endTime: { startTime, endTime } },
      update: {},
      create: { startTime, endTime },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "../../lib/prisma";
import { generateApiKey } from "../../lib/credentials";
import type { RegisterDeviceInput } from "@school-mis/shared";

const deviceSelect = {
  id: true,
  deviceName: true,
  classId: true,
  purpose: true,
  status: true,
  lastSyncAt: true,
  registeredById: true,
  class: true,
} as const;

export async function listDevices() {
  return prisma.device.findMany({ select: deviceSelect, orderBy: { deviceName: "asc" } });
}

export async function registerDevice(input: RegisterDeviceInput, registeredById: string) {
  const { key, hash } = generateApiKey();
  const device = await prisma.device.create({
    data: {
      deviceName: input.device_name,
      classId: input.class_id,
      purpose: input.purpose,
      apiKeyHash: hash,
      registeredById,
      status: "offline",
    },
    select: deviceSelect,
  });
  // api_key is the only time the plaintext key is ever returned — the
  // device must be reconfigured (a new key issued) if it's lost.
  return { ...device, api_key: key };
}

export async function markSynced(deviceId: string) {
  await prisma.device.update({
    where: { id: deviceId },
    data: { status: "online", lastSyncAt: new Date() },
  });
}

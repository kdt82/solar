import { prisma } from "@/lib/prisma";
import { getDevices } from "@/config/devices";
import type { DeviceSnapshot } from "@/types/power";

export async function ensureDevices() {
  const devices = getDevices();

  for (const device of devices) {
    await prisma.device.upsert({
      where: { deviceId: device.id },
      update: {
        label: device.label,
        url: device.url,
      },
      create: {
        deviceId: device.id,
        label: device.label,
        url: device.url,
      },
    });
  }
}

export async function recordSnapshots(snapshots: DeviceSnapshot[]) {
  const data = snapshots.map((snapshot) => ({
    deviceId: snapshot.id,
    timestamp: new Date(snapshot.timestamp),
    generation: snapshot.generation,
    consumption: snapshot.consumption,
    grid: snapshot.grid,
    status: snapshot.status,
    error: snapshot.error ?? null,
  }));

  await prisma.snapshot.createMany({
    data,
    skipDuplicates: true,
  });
}

export async function getHistoricalMetrics(fromIso: string, toIso: string) {
  const snapshots = await prisma.snapshot.findMany({
    where: {
      timestamp: {
        gte: new Date(fromIso),
        lte: new Date(toIso),
      },
    },
    orderBy: {
      timestamp: "asc",
    },
    include: {
      device: true,
    },
  });

  return snapshots;
}

export async function getDeviceMetrics(deviceId: string, fromIso: string, toIso: string) {
  const snapshots = await prisma.snapshot.findMany({
    where: {
      deviceId,
      timestamp: {
        gte: new Date(fromIso),
        lte: new Date(toIso),
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  if (snapshots.length === 0) {
    return null;
  }

  const totalGeneration = snapshots.reduce((sum: number, s: { generation: number }) => sum + s.generation, 0);
  const totalConsumption = snapshots.reduce((sum: number, s: { consumption: number }) => sum + s.consumption, 0);
  const avgGeneration = totalGeneration / snapshots.length;
  const avgConsumption = totalConsumption / snapshots.length;

  return {
    deviceId,
    totalGeneration,
    totalConsumption,
    avgGeneration,
    avgConsumption,
    sampleCount: snapshots.length,
  };
}

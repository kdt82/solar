import { parseISO } from "date-fns";
import { getSnapshotsBetween, type SnapshotRow } from "@/lib/database";
import type { DeviceHistoricalMetrics, HistoricalSummary, TimelinePoint } from "@/types/power";

type DeviceAccumulator = {
  deviceId: string;
  label: string;
  totalSamples: number;
  onlineSamples: number;
  sumGeneration: number;
  sumConsumption: number;
  sumGrid: number;
  peakGeneration: number;
  energyGenerated: number;
  energyConsumed: number;
  energyGrid: number;
  previous?: SnapshotRow;
  lastSeen?: string;
};

const MINUTE_MS = 60 * 1000;
const HOUR_FROM_MS = 1000 * 60 * 60;

function accumulateEnergy(previous: SnapshotRow, current: SnapshotRow) {
  const previousTime = parseISO(previous.timestamp).getTime();
  const currentTime = parseISO(current.timestamp).getTime();
  const deltaMs = currentTime - previousTime;

  if (Number.isNaN(previousTime) || Number.isNaN(currentTime) || deltaMs <= 0) {
    return {
      generated: 0,
      consumed: 0,
      grid: 0,
    };
  }

  const deltaHours = deltaMs / HOUR_FROM_MS;

  const averageGeneration = (previous.generation + current.generation) / 2;
  const averageConsumption = (previous.consumption + current.consumption) / 2;
  const averageGrid = (previous.grid + current.grid) / 2;

  return {
    generated: (averageGeneration * deltaHours) / 1000,
    consumed: (averageConsumption * deltaHours) / 1000,
    grid: (averageGrid * deltaHours) / 1000,
  };
}

export function getHistoricalSummary(fromIso: string, toIso: string, label: string): HistoricalSummary {
  const rows = getSnapshotsBetween(fromIso, toIso);

  if (rows.length === 0) {
    return {
      range: { from: fromIso, to: toIso, label },
      totals: {
        energyGenerated: 0,
        energyConsumed: 0,
        energyExported: 0,
        energyImported: 0,
        energyNet: 0,
        averageGeneration: 0,
        peakGeneration: 0,
        uptimePercent: 0,
      },
      timeline: [],
      devices: [],
    };
  }

  const deviceMap = new Map<string, DeviceAccumulator>();
  const timelineMap = new Map<string, TimelinePoint>();

  for (const row of rows) {
    let accumulator = deviceMap.get(row.deviceId);
    if (!accumulator) {
      accumulator = {
        deviceId: row.deviceId,
        label: row.label,
        totalSamples: 0,
        onlineSamples: 0,
        sumGeneration: 0,
        sumConsumption: 0,
        sumGrid: 0,
        peakGeneration: 0,
        energyGenerated: 0,
        energyConsumed: 0,
        energyGrid: 0,
      };
      deviceMap.set(row.deviceId, accumulator);
    }

    accumulator.totalSamples += 1;
    if (row.status === "ok") {
      accumulator.onlineSamples += 1;
    }

    accumulator.sumGeneration += row.generation;
    accumulator.sumConsumption += row.consumption;
    accumulator.sumGrid += row.grid;
    accumulator.peakGeneration = Math.max(accumulator.peakGeneration, row.generation);
    accumulator.lastSeen = row.timestamp;

    if (accumulator.previous) {
      const energy = accumulateEnergy(accumulator.previous, row);
      accumulator.energyGenerated += energy.generated;
      accumulator.energyConsumed += energy.consumed;
      accumulator.energyGrid += energy.grid;
    }
    accumulator.previous = row;

    const timestampMs = parseISO(row.timestamp).getTime();
    if (!Number.isNaN(timestampMs)) {
      const bucketTime = new Date(Math.floor(timestampMs / MINUTE_MS) * MINUTE_MS).toISOString();
      const bucket = timelineMap.get(bucketTime) ?? {
        timestamp: bucketTime,
        generation: 0,
        consumption: 0,
        grid: 0,
      };
      bucket.generation += row.generation;
      bucket.consumption += row.consumption;
      bucket.grid += row.grid;
      timelineMap.set(bucketTime, bucket);
    }
  }

  const devices: DeviceHistoricalMetrics[] = Array.from(deviceMap.values()).map((entry) => {
    const uptimePercent =
      entry.totalSamples === 0 ? 0 : (entry.onlineSamples / entry.totalSamples) * 100;

    return {
      deviceId: entry.deviceId,
      label: entry.label,
      uptimePercent,
      onlineSamples: entry.onlineSamples,
      downtimeSamples: entry.totalSamples - entry.onlineSamples,
      totalSamples: entry.totalSamples,
      averageGeneration:
        entry.totalSamples === 0 ? 0 : entry.sumGeneration / entry.totalSamples,
      peakGeneration: entry.peakGeneration,
      energyGenerated: entry.energyGenerated,
      energyConsumed: entry.energyConsumed,
      energyGrid: entry.energyGrid,
      lastSeen: entry.lastSeen,
    };
  });

  const totalSamples = devices.reduce((sum, d) => sum + d.totalSamples, 0);
  const totalOnlineSamples = devices.reduce((sum, d) => sum + d.onlineSamples, 0);

  const energyGenerated = devices.reduce((sum, d) => sum + d.energyGenerated, 0);
  const energyConsumed = devices.reduce((sum, d) => sum + d.energyConsumed, 0);
  const energyGrid = devices.reduce((sum, d) => sum + d.energyGrid, 0);
  const energyExported = devices.reduce((sum, d) => sum + Math.max(0, d.energyGrid), 0);
  const energyImported = devices.reduce((sum, d) => sum + Math.max(0, -d.energyGrid), 0);
  const sumGeneration = devices.reduce(
    (sum, d) => sum + d.averageGeneration * d.totalSamples,
    0
  );

  const timeline = Array.from(timelineMap.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  const peakGeneration = timeline.reduce(
    (max, point) => Math.max(max, point.generation),
    0
  );

  return {
    range: { from: fromIso, to: toIso, label },
    totals: {
      energyGenerated,
      energyConsumed,
      energyExported,
      energyImported,
      energyNet: energyGrid,
      averageGeneration: totalSamples === 0 ? 0 : sumGeneration / totalSamples,
      peakGeneration,
      uptimePercent: totalSamples === 0 ? 0 : (totalOnlineSamples / totalSamples) * 100,
    },
    timeline,
    devices,
  };
}

import { devices, propertyLabel, type FroniusDevice } from "@/config/devices";
import { ensureDevices, recordSnapshots } from "@/lib/database";
import type { DeviceSnapshot, PowerDashboardData } from "@/types/power";

type FroniusRealtimeResponse = {
  Head?: Record<string, unknown>;
  Body?: {
    Data?: {
      Site?: {
        P_PV?: number;
        P_Load?: number;
        P_Grid?: number;
      };
    };
  };
};

const REALTIME_PATH = "/solar_api/v1/GetPowerFlowRealtimeData.fcgi";
const REQUEST_TIMEOUT_MS = parseInt(process.env.FRONIUS_TIMEOUT_MS ?? "3500", 10);

export async function getDeviceSnapshot(device: FroniusDevice): Promise<DeviceSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestedAt = new Date().toISOString();
    const response = await fetch(`${device.url}${REALTIME_PATH}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const json = (await response.json()) as FroniusRealtimeResponse;
    const site = json?.Body?.Data?.Site;

    if (!site) {
      throw new Error("Missing site data in response");
    }

    const snapshot: DeviceSnapshot = {
      id: device.id,
      label: device.label,
      timestamp: requestedAt,
      generation: site.P_PV ?? 0,
      consumption: site.P_Load ?? 0,
      grid: site.P_Grid ?? 0,
      status: "ok",
    };

    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      id: device.id,
      label: device.label,
      timestamp: new Date().toISOString(),
      generation: 0,
      consumption: 0,
      grid: 0,
      status: "error",
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAllSnapshots(): Promise<PowerDashboardData> {
  ensureDevices();

  const results = await Promise.all(devices.map((device) => getDeviceSnapshot(device)));

  recordSnapshots(results);

  const successful = results.filter((item) => item.status === "ok");
  const allFailed = successful.length === 0;
  const observedAt = new Date().toISOString();

  const combined: DeviceSnapshot = {
    id: "combined",
    label: "Combined",
    timestamp: observedAt,
    generation: successful.reduce((total, entry) => total + entry.generation, 0),
    consumption: successful.reduce((total, entry) => total + entry.consumption, 0),
    grid: successful.reduce((total, entry) => total + entry.grid, 0),
    status: successful.length === devices.length ? "ok" : "error",
    error:
      successful.length === devices.length
        ? undefined
        : allFailed
          ? "All devices offline"
          : "One or more devices unavailable",
  };

  return {
    property: propertyLabel,
    updatedAt: observedAt,
    devices: results,
    combined,
  };
}

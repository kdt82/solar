import { getDevices, getPropertyLabel, type FroniusDevice } from "@/config/devices";
import { ensureDevices, recordSnapshots } from "@/lib/database";
import type { DeviceSnapshot, PowerDashboardData } from "@/types/power";
import { SocksProxyAgent } from "socks-proxy-agent";

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

// Create SOCKS5 proxy agent if ALL_PROXY is set (for Tailscale routing)
const proxyAgent = process.env.ALL_PROXY 
  ? new SocksProxyAgent(process.env.ALL_PROXY)
  : undefined;

if (proxyAgent) {
  console.log(`Using SOCKS5 proxy: ${process.env.ALL_PROXY}`);
}

export async function getDeviceSnapshot(device: FroniusDevice): Promise<DeviceSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestedAt = new Date().toISOString();
    const fullUrl = `${device.url}${REALTIME_PATH}`;
    console.log(`[${device.id}] Fetching from: ${fullUrl}`);
    const response = await fetch(fullUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: device.headers,
      // @ts-expect-error - dispatcher is a valid option for Node.js fetch
      dispatcher: proxyAgent,
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
    console.error(`[${device.id}] Error fetching data from ${device.url}: ${message}`);
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

  const devices = getDevices();
  console.log(`Polling ${devices.length} devices:`, devices.map(d => `${d.id}=${d.url}`).join(', '));
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
    property: getPropertyLabel(),
    updatedAt: observedAt,
    devices: results,
    combined,
  };
}

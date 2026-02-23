/**
 * Hinen Solar Battery Proxy client
 * Proxies requests through the local Pi-hosted Hinen API proxy.
 * LAN: http://192.168.50.140:5555
 * Tailscale: http://100.103.219.54:5555
 */

const HINEN_BASE_URL = process.env.HINEN_PROXY_URL ?? "http://192.168.50.140:5555";
const TIMEOUT_MS = parseInt(process.env.FRONIUS_TIMEOUT_MS ?? "3500", 10);

export interface HinenBattery {
  daily_charge_kwh: number;
  daily_discharge_kwh: number;
  power_w: number; // +ve = charging, -ve = discharging
  soc: number; // 0-100
}

export interface HinenGrid {
  daily_export_kwh: number;
  daily_import_kwh: number;
  power_w: number; // -ve = exporting, +ve = importing
}

export interface HinenLoad {
  daily_kwh: number;
  power_w: number;
}

export interface HinenSolar {
  daily_kwh: number;
  monthly_kwh: number;
  power_w: number;
}

export interface HinenRevenue {
  daily_total: number;
  monthly_total: number;
  yearly_total: number;
}

export interface HinenRawProperties {
  BatteryPower: number;
  GenerationPower: number;
  GridTotalPower: number;
  TotalLoadPower: number;
  SOC: number;
  BatCapacity?: number;
  DailyChargingEnergy: number;
  DailyDischargingEnergy: number;
  DailyProductionActive: number;
  DailyConsumption: number;
  DailyEnergyPurchased: number;
  DailyGridFeedIn: number;
  DailyPvToBatteryEnergy: number;
  DailyPvToGridEnergy: number;
  DailyPvToLoadEnergy: number;
  DailyGridToBatteryEnergy: number;
  DailyGridToLoadEnergy: number;
  DailyBatteryToLoadEnergy: number;
  DailyBatteryToGridEnergy: number;
  DailyTotalRevenue: number;
  DailyStorageRevenue: number;
  MonthlyProductActive: number;
  MonthlyConsumption: number;
  MonthlyEnergyPurchased: number;
  MonthlyTotalRevenue: number;
  CumulativeTotalRevenue: number;
  [key: string]: number | undefined;
}

export interface HinenStatus {
  ok: boolean;
  timestamp: string;
  battery: HinenBattery;
  grid: HinenGrid;
  load: HinenLoad;
  solar: HinenSolar;
  revenue: HinenRevenue;
  raw_properties: HinenRawProperties;
}

export interface HinenStatEntry {
  identifier: string;
  timestamp: string;
  value: number;
}

export interface HinenDevice {
  id: string;
  deviceName: string;
  modelCode: string;
  serialNumber: string;
  status: number;
  firmwareVersion: string;
  plantName: string;
  topMap: {
    SOC?: { value: number };
    BatteryPower?: { value: number };
    GenerationPower?: { value: number };
    GridTotalPower?: { value: number };
    TotalLoadPower?: { value: number };
    BatCapacity?: { value: number };
    [key: string]: { value: number; shadow?: number; timestamp?: string } | undefined;
  };
}

async function hinenFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${HINEN_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Hinen ${path} → HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export async function getHinenStatus(): Promise<HinenStatus> {
  return hinenFetch<HinenStatus>("/status");
}

export async function getHinenStatistics(
  period: "day" | "month" | "year",
  date: string
): Promise<{ ok: boolean; data: HinenStatEntry[] }> {
  return hinenFetch(`/statistics?period=${period}&date=${date}`);
}

export async function getHinenDevices(): Promise<{ ok: boolean; data: HinenDevice[] }> {
  return hinenFetch("/devices");
}

/**
 * Derive live power flows (all in Watts) from Hinen status.
 * Battery: +ve = charging, -ve = discharging
 * Grid: -ve = exporting, +ve = importing
 *
 * Energy balance (Nelsons inverter):
 *   Generation = Battery_charge + Grid_export + Load
 */
export function deriveNelsonsFlows(status: HinenStatus) {
  const solarW = status.raw_properties.GenerationPower ?? status.solar.power_w;
  const batteryW = status.raw_properties.BatteryPower ?? status.battery.power_w;
  const gridW = status.raw_properties.GridTotalPower ?? status.grid.power_w;
  const loadW = status.raw_properties.TotalLoadPower ?? status.load.power_w;

  const batteryChargingW = Math.max(0, batteryW);
  const batteryDischargingW = Math.max(0, -batteryW);
  const gridExportW = Math.max(0, -gridW);
  const gridImportW = Math.max(0, gridW);

  // Solar distribution
  const solarToBattery = Math.min(solarW, batteryChargingW);
  const solarToGrid = gridExportW; // export is primarily solar overflow
  const solarToLoad = Math.max(0, solarW - solarToBattery - solarToGrid);

  // Grid/battery to load
  const batteryToLoad = Math.min(batteryDischargingW, Math.max(0, loadW - solarToLoad));
  const gridToLoad = Math.max(0, gridImportW);
  const gridToBattery = Math.max(0, batteryChargingW - solarToBattery);

  return {
    solarW,
    batteryW,
    batteryChargingW,
    batteryDischargingW,
    gridExportW,
    gridImportW,
    loadW,
    solarToBattery,
    solarToGrid,
    solarToLoad,
    batteryToLoad,
    gridToLoad,
    gridToBattery,
    soc: status.battery.soc,
    batteryCapacityWh: status.raw_properties.BatCapacity ?? 30720,
  };
}

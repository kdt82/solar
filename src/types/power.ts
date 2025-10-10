export type PowerMetrics = {
  generation: number;
  consumption: number;
  grid: number;
};

export type DeviceSnapshot = PowerMetrics & {
  id: string;
  label: string;
  timestamp: string;
  status: "ok" | "error";
  error?: string;
};

export type PowerDashboardData = {
  property: string;
  updatedAt: string;
  devices: DeviceSnapshot[];
  combined: DeviceSnapshot;
};

export type SnapshotRecord = DeviceSnapshot & {
  deviceId: string;
};

export type TimelinePoint = {
  timestamp: string;
  generation: number;
  consumption: number;
  grid: number;
};

export type DeviceHistoricalMetrics = {
  deviceId: string;
  label: string;
  uptimePercent: number;
  onlineSamples: number;
  downtimeSamples: number;
  totalSamples: number;
  averageGeneration: number;
  peakGeneration: number;
  energyGenerated: number;
  energyConsumed: number;
  energyGrid: number;
  lastSeen?: string;
};

export type HistoricalSummary = {
  range: {
    from: string;
    to: string;
    label: string;
  };
  totals: {
    energyGenerated: number;
    energyConsumed: number;
    energyExported: number;
    energyImported: number;
    energyNet: number;
    averageGeneration: number;
    peakGeneration: number;
    uptimePercent: number;
  };
  timeline: TimelinePoint[];
  devices: DeviceHistoricalMetrics[];
};

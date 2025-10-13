import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { getDevices } from "@/config/devices";
import type { DeviceSnapshot } from "@/types/power";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "solar.db");
const dbPath = process.env.SOLAR_DB_PATH ?? DEFAULT_DB_PATH;
const dbDirectory = dirname(dbPath);

mkdirSync(dbDirectory, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    generation REAL NOT NULL,
    consumption REAL NOT NULL,
    grid REAL NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_device_timestamp ON snapshots(device_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);
`);

const upsertDeviceStmt = db.prepare(`
  INSERT INTO devices (id, label, url, created_at, updated_at)
  VALUES (@id, @label, @url, datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    label = excluded.label,
    url = excluded.url,
    updated_at = datetime('now')
`);

const insertSnapshotStmt = db.prepare(`
  INSERT INTO snapshots (
    id,
    device_id,
    timestamp,
    generation,
    consumption,
    grid,
    status,
    error,
    recorded_at
  )
  VALUES (
    @id,
    @deviceId,
    @timestamp,
    @generation,
    @consumption,
    @grid,
    @status,
    @error,
    datetime('now')
  )
`);

const ensureDevicesTransaction = db.transaction((devices: ReturnType<typeof getDevices>) => {
  for (const device of devices) {
    upsertDeviceStmt.run({
      id: device.id,
      label: device.label,
      url: device.url,
    });
  }
});

export function ensureDevices() {
  const devices = getDevices();
  ensureDevicesTransaction(devices);
}

const recordSnapshotsTransaction = db.transaction((snapshots: DeviceSnapshot[]) => {
  for (const snapshot of snapshots) {
    insertSnapshotStmt.run({
      id: randomUUID(),
      deviceId: snapshot.id,
      timestamp: snapshot.timestamp,
      generation: snapshot.generation,
      consumption: snapshot.consumption,
      grid: snapshot.grid,
      status: snapshot.status,
      error: snapshot.error ?? null,
    });
  }
});

export function recordSnapshots(snapshots: DeviceSnapshot[]) {
  if (!snapshots.length) return;
  recordSnapshotsTransaction(snapshots);
}

export type SnapshotRow = {
  id: string;
  deviceId: string;
  label: string;
  timestamp: string;
  generation: number;
  consumption: number;
  grid: number;
  status: string;
  error?: string | null;
};

const selectSnapshotsStmt = db.prepare<{
  from: string;
  to: string;
}>(`
  SELECT
    s.id,
    s.device_id as deviceId,
    d.label as label,
    s.timestamp,
    s.generation,
    s.consumption,
    s.grid,
    s.status,
    s.error
  FROM snapshots s
  JOIN devices d ON d.id = s.device_id
  WHERE s.timestamp BETWEEN @from AND @to
  ORDER BY s.timestamp ASC
`);

export function getSnapshotsBetween(fromIso: string, toIso: string): SnapshotRow[] {
  return selectSnapshotsStmt.all({ from: fromIso, to: toIso }) as SnapshotRow[];
}

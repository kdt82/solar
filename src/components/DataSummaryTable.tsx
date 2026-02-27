"use client";

import React from "react";
import styles from "./DataSummaryTable.module.css";
import type { DeviceSnapshot } from "@/types/power";
import type { HinenStatus } from "@/lib/hinen";

interface DataSummaryTableProps {
  nelson?: DeviceSnapshot;
  granny?: DeviceSnapshot;
  hinenData?: HinenStatus;
  batterySocDisplayed: number; // adjusted SOC (12% grace removed)
  hinenOnline?: boolean;
}

function fmt(kw: number): string {
  return (Math.abs(kw)).toFixed(2) + " kW";
}

function fmtTimestamp(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function DataSummaryTable({ nelson, granny, hinenData, batterySocDisplayed, hinenOnline = true }: DataSummaryTableProps) {
  const batteryW  = hinenData?.raw_properties?.BatteryPower ?? 0;
  const batteryKW = Math.abs(batteryW) / 1000;
  const isCharging    = batteryW > 10;
  const isDischarging = batteryW < -10;
  const battStatus = !hinenOnline ? "Offline" : isCharging ? "Charging" : isDischarging ? "Discharging" : "Idle";
  const battStatusClass = !hinenOnline ? styles.statusOffline : isCharging ? styles.statusCharging : isDischarging ? styles.statusDischarging : styles.statusIdle;

  const hinenTimestamp = hinenData?.timestamp;

  return (
    <div className={styles.wrapper}>

      {/* ── Inverter / Solar Table ─────────────────────────── */}
      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>Solar Inverters</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Device</th>
              <th>Generation</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Refresh</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Nelsons House",     snap: nelson },
              { label: "5A / Granny Flat",  snap: granny },
            ].map(({ label, snap }) => {
              const online = snap?.status === "ok";
              return (
                <tr key={label}>
                  <td className={styles.deviceName}>{label}</td>
                  <td className={styles.solar}>{snap ? fmt(snap.generation) : "—"}</td>
                  <td className={styles.usage}>{snap ? fmt(snap.consumption) : "—"}</td>
                  <td>
                    <span className={online ? styles.statusOnline : styles.statusOffline}>
                      <span className={styles.dot} />
                      {online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className={styles.refresh}>5 sec (LAN)</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Battery Table ──────────────────────────────────── */}
      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>Battery (Hinen)</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Device</th>
              <th>SOC</th>
              <th>Power</th>
              <th>Status</th>
              <th>Refresh</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.deviceName}>Hinen SH6KL</td>
              <td className={styles.soc}>{hinenOnline ? `${batterySocDisplayed}%` : "—"}</td>
              <td className={styles.usage}>{hinenOnline ? `${batteryKW.toFixed(2)} kW` : "—"}</td>
              <td>
                <span className={battStatusClass}>
                  <span className={styles.dot} />
                  {battStatus}
                </span>
              </td>
              <td className={styles.refresh}>30 sec (cloud)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Infrastructure Table ───────────────────────────── */}
      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>System Infrastructure</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Device</th>
              <th>Role</th>
              <th>Last Seen</th>
              <th>Status</th>
              <th>Refresh</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.deviceName}>Raspberry Pi</td>
              <td className={styles.role}>Hinen Battery Proxy</td>
              <td className={styles.lastSeen}>
                {hinenOnline ? (
                  <>
                    {fmtTimestamp(hinenTimestamp)}
                    <span className={styles.timeAgo}>{timeAgo(hinenTimestamp)}</span>
                  </>
                ) : (
                  <span className={styles.lastSeenOffline}>No response</span>
                )}
              </td>
              <td>
                <span className={hinenOnline ? styles.statusOnline : styles.statusOffline}>
                  <span className={styles.dot} />
                  {hinenOnline ? "Online" : "Offline"}
                </span>
              </td>
              <td className={styles.refresh}>30 sec</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

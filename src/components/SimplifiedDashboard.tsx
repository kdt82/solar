"use client";

import React, { useState, useEffect } from "react";
import styles from "./SimplifiedDashboard.module.css";

interface SimplifiedDashboardProps {
  nelsonSolarW: number;
  grannySolarW: number;
  nelsonLoadW: number;
  grannyLoadW: number;
  batteryW: number;    // +ve = charging, -ve = discharging
  batterySoc: number;
  gridW: number;       // raw device: -ve = importing, +ve = exporting
}

function fmtKW(w: number): string {
  return (Math.abs(w) / 1000).toFixed(2) + " kW";
}

function fmtWKW(w: number): string {
  const abs = Math.abs(w);
  return `${abs} W / ${(abs / 1000).toFixed(2)} kW`;
}

// ── Animated horizontal flow connector ────────────────────────────────────────
// direction: "left" = dots move left (←), "right" = dots move right (→), "idle" = static
function FlowConnector({ direction, color }: { direction: "left" | "right" | "idle"; color: string }) {
  const dotClass = direction === "right" ? styles.flowDotRight : styles.flowDotLeft;
  return (
    <div className={styles.flowConnector}>
      <div className={styles.flowTrack}>
        {direction !== "idle" && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${styles.flowDot} ${dotClass}`}
                style={{ background: color, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function SimplifiedDashboard({
  nelsonSolarW,
  grannySolarW,
  nelsonLoadW,
  grannyLoadW,
  batteryW,
  batterySoc,
  gridW,
}: SimplifiedDashboardProps) {
  const combinedSolarW = nelsonSolarW + grannySolarW;
  const combinedLoadW = nelsonLoadW + grannyLoadW;

  const [nelsonZeroTime, setNelsonZeroTime] = useState<number | null>(null);
  const [grannyZeroTime, setGrannyZeroTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (nelsonSolarW > 0) {
      setNelsonZeroTime(null);
    } else if (nelsonZeroTime === null) {
      setNelsonZeroTime(Date.now());
    }
  }, [nelsonSolarW, nelsonZeroTime]);

  useEffect(() => {
    if (grannySolarW > 0) {
      setGrannyZeroTime(null);
    } else if (grannyZeroTime === null) {
      setGrannyZeroTime(Date.now());
    }
  }, [grannySolarW, grannyZeroTime]);

  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(int);
  }, []);

  const nelsonGrey = nelsonSolarW <= 0 && nelsonZeroTime !== null && (now - nelsonZeroTime) >= 5 * 60 * 1000;
  const grannyGrey = grannySolarW <= 0 && grannyZeroTime !== null && (now - grannyZeroTime) >= 5 * 60 * 1000;

  function getSolarStyle(isGrey: boolean): React.CSSProperties {
    if (isGrey) return {
      background: "linear-gradient(145deg, #94a3b8, #64748b)",
      border: "3px solid #475569",
      boxShadow: "inset 0 4px 6px rgba(255, 255, 255, 0.2), 0 6px 12px rgba(0, 0, 0, 0.15)",
      color: "#f8fafc"
    };
    return {
      background: "linear-gradient(145deg, #fbbf24, #f59e0b)",
      border: "3px solid #d97706",
      boxShadow: "inset 0 4px 6px rgba(255, 255, 255, 0.3), 0 6px 12px rgba(245, 158, 11, 0.3)",
      color: "#fff",
      textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)"
    };
  }

  function getUsageStyle(w: number): React.CSSProperties {
    const absW = Math.abs(w);
    if (absW < 1500) return {
      background: "linear-gradient(145deg, #4ade80, #22c55e)",
      border: "3px solid #16a34a",
      boxShadow: "inset 0 4px 6px rgba(255, 255, 255, 0.3), 0 6px 12px rgba(34, 197, 94, 0.3)",
      color: "#fff",
      textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)"
    }; // Green
    if (absW <= 2500) return {
      background: "linear-gradient(145deg, #fbbf24, #f59e0b)",
      border: "3px solid #d97706",
      boxShadow: "inset 0 4px 6px rgba(255, 255, 255, 0.3), 0 6px 12px rgba(245, 158, 11, 0.3)",
      color: "#fff",
      textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)"
    }; // Orange
    return {
      background: "linear-gradient(145deg, #f87171, #ef4444)",
      border: "3px solid #dc2626",
      boxShadow: "inset 0 4px 6px rgba(255, 255, 255, 0.3), 0 6px 12px rgba(239, 68, 68, 0.3)",
      color: "#fff",
      textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)"
    }; // Red
  }

  // Battery SOC: 12% actual = 0% displayed, 100% = 100%
  const displayedSoc = Math.max(0, Math.round(((batterySoc - 12) / 88) * 100));

  // Hinen convention (confirmed in lib/hinen.ts deriveNelsonsFlows):
  // gridW > 0 = importing from grid, gridW < 0 = exporting to grid
  const isExporting = gridW < -250;
  const isImporting = gridW > 250;
  const gridLabel = isExporting ? "Exporting" : isImporting ? "Importing" : "Idle";
  const gridColor = isExporting ? "#22c55e" : isImporting ? "#ef4444" : "#64748b";

  const batteryColor =
    displayedSoc > 60 ? "#22c55e" : displayedSoc > 25 ? "#f59e0b" : "#ef4444";

  // Battery connector: charging = System→Battery = dots flow left (battery is on left)
  const battCharging = batteryW > 10;
  const battDischarging = batteryW < -10;
  const battDirection: "left" | "right" | "idle" = battCharging ? "left" : battDischarging ? "right" : "idle";

  // Grid connector: exporting = System→Grid = dots flow right (grid is on right)
  //                 importing = Grid→System = dots flow left
  const gridDirection: "left" | "right" | "idle" = isExporting ? "right" : isImporting ? "left" : "idle";

  return (
    <div className={styles.container}>

      {/* Title */}
      <div className={styles.title}>5 Oxford Road — Solar Dashboard</div>

      {/* ── Row 1: Solar Generation ── */}
      <div className={styles.sectionLabel}>☀ Solar Generation</div>
      <div className={styles.row}>
        <div className={styles.circle} style={getSolarStyle(nelsonGrey)}>
          <span className={styles.circleLabel}>Nelsons House</span>
          <span className={styles.circleValue}>{fmtKW(nelsonSolarW)}</span>
        </div>
        <div className={styles.centerMid}>
          <span className={styles.centerLabel}>Combined</span>
          <span className={styles.centerValue}>{fmtKW(combinedSolarW)}</span>
        </div>
        <div className={styles.circle} style={getSolarStyle(grannyGrey)}>
          <span className={styles.circleLabel}>5A / Granny Flat</span>
          <span className={styles.circleValue}>{fmtKW(grannySolarW)}</span>
        </div>
      </div>

      {/* Arrow Down */}
      <div className={styles.connector}>↓</div>

      {/* ── Row 2: Battery | System | Grid ── */}
      <div className={styles.middleRow}>
        <div className={styles.midCard} style={{ borderColor: batteryColor }}>
          <div className={styles.midCardIcon}>🔋</div>
          <div className={styles.midCardTitle}>Battery SOC</div>
          <div className={styles.midCardBig} style={{ color: batteryColor }}>
            {displayedSoc}%
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: batteryColor }}>
            {((displayedSoc / 100) * 27).toFixed(1)} kW
          </div>
          <div className={styles.midCardSub}>
            {battCharging ? `↑ Charging` : battDischarging ? `↓ Discharging` : "Idle"}
          </div>
        </div>

        <FlowConnector direction={battDirection} color={batteryColor} />

        <div className={`${styles.midCard} ${styles.systemCard}`}>
          <div className={styles.midCardIcon}>⚡</div>
          <div className={styles.midCardTitle}>5 Oxford Rd</div>
          <div className={styles.midCardBig}>System</div>
        </div>

        <FlowConnector direction={gridDirection} color={gridColor} />

        <div className={styles.midCard} style={{ borderColor: gridColor }}>
          <div className={styles.midCardIcon}>🏭</div>
          <div className={styles.midCardTitle}>Grid</div>
          <div className={styles.midCardBig} style={{ color: gridColor }}>{gridLabel}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: gridColor }}>
            {(Math.abs(gridW) / 1000).toFixed(2)} kW
          </div>
          <div className={styles.midCardSub}>
            {Math.abs(Math.round(gridW))} W
          </div>
        </div>
      </div>

      {/* Arrow Down */}
      <div className={styles.connector}>↓</div>

      {/* ── Row 3: Property Usage ── */}
      <div className={styles.sectionLabel}>🏠 Property Usage</div>
      <div className={styles.row}>
        <div className={styles.circle} style={getUsageStyle(nelsonLoadW)}>
          <span className={styles.circleLabel}>Nelsons House</span>
          <span className={styles.circleValue}>{fmtKW(nelsonLoadW)}</span>
        </div>
        <div className={styles.centerMid}>
          <span className={styles.centerLabel}>Combined</span>
          <span className={styles.centerValue}>{fmtKW(combinedLoadW)}</span>
        </div>
        <div className={styles.circle} style={getUsageStyle(grannyLoadW)}>
          <span className={styles.circleLabel}>5A / Granny Flat</span>
          <span className={styles.circleValue}>{fmtKW(grannyLoadW)}</span>
        </div>
      </div>

    </div>
  );
}

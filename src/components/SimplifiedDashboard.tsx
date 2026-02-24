"use client";

import React from "react";
import styles from "./SimplifiedDashboard.module.css";

interface SimplifiedDashboardProps {
  nelsonSolarW: number;
  grannySolarW: number;
  nelsonLoadW: number;
  grannyLoadW: number;
  batterySoc: number;
  gridW: number; // -ve export, +ve import
}

function fmtKW(w: number): string {
  return (Math.abs(w) / 1000).toFixed(2) + " kW";
}

function fmtWKW(w: number): string {
  const abs = Math.abs(w);
  return `${abs} W / ${(abs / 1000).toFixed(2)} kW`;
}

export function SimplifiedDashboard({
  nelsonSolarW,
  grannySolarW,
  nelsonLoadW,
  grannyLoadW,
  batterySoc,
  gridW,
}: SimplifiedDashboardProps) {
  const combinedSolarW = nelsonSolarW + grannySolarW;
  const combinedLoadW = nelsonLoadW + grannyLoadW;

  // Battery SOC adjustment:
  // 12% actual = 0% displayed, 100% actual = 100% displayed
  const displayedSoc = Math.max(0, Math.round(((batterySoc - 12) / 88) * 100));

  const isExporting = gridW < -10;
  const isImporting = gridW > 10;
  const gridLabel = isExporting ? "Exporting" : isImporting ? "Importing" : "Idle";
  const gridColor = isExporting ? "#22c55e" : isImporting ? "#ef4444" : "#64748b";
  const batteryColor =
    displayedSoc > 60 ? "#22c55e" : displayedSoc > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className={styles.container}>

      {/* Title */}
      <div className={styles.title}>5 Oxford Road — Solar Dashboard</div>

      {/* ── Row 1: Solar Generation ── */}
      <div className={styles.sectionLabel}>☀ Solar Generation</div>
      <div className={styles.row}>
        <div className={`${styles.circle} ${styles.solarCircle}`}>
          <span className={styles.circleLabel}>Nelsons House</span>
          <span className={styles.circleValue}>{fmtKW(nelsonSolarW)}</span>
        </div>
        <div className={styles.centerMid}>
          <span className={styles.centerLabel}>Combined</span>
          <span className={styles.centerValue}>{fmtKW(combinedSolarW)}</span>
        </div>
        <div className={`${styles.circle} ${styles.solarCircle}`}>
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
          <div className={styles.midCardSub}>
            {displayedSoc === 0 ? "Reserve" : displayedSoc > 60 ? "Good" : displayedSoc > 25 ? "Low" : "Very Low"}
          </div>
        </div>

        <div className={styles.midConnector}>←→</div>

        <div className={`${styles.midCard} ${styles.systemCard}`}>
          <div className={styles.midCardIcon}>⚡</div>
          <div className={styles.midCardTitle}>5 Oxford Rd</div>
          <div className={styles.midCardBig}>System</div>
        </div>

        <div className={styles.midConnector}>←→</div>

        <div className={styles.midCard} style={{ borderColor: gridColor }}>
          <div className={styles.midCardIcon}>🏭</div>
          <div className={styles.midCardTitle}>Grid</div>
          <div className={styles.midCardBig} style={{ color: gridColor }}>{gridLabel}</div>
          <div className={styles.midCardSub}>{fmtWKW(gridW)}</div>
        </div>
      </div>

      {/* Arrow Down */}
      <div className={styles.connector}>↓</div>

      {/* ── Row 3: Property Usage ── */}
      <div className={styles.sectionLabel}>🏠 Property Usage</div>
      <div className={styles.row}>
        <div className={`${styles.circle} ${styles.usageCircle}`}>
          <span className={styles.circleLabel}>Nelsons House</span>
          <span className={styles.circleValue}>{fmtKW(nelsonLoadW)}</span>
        </div>
        <div className={styles.centerMid}>
          <span className={styles.centerLabel}>Combined</span>
          <span className={styles.centerValue}>{fmtKW(combinedLoadW)}</span>
        </div>
        <div className={`${styles.circle} ${styles.usageCircle}`}>
          <span className={styles.circleLabel}>5A / Granny Flat</span>
          <span className={styles.circleValue}>{fmtKW(grannyLoadW)}</span>
        </div>
      </div>

    </div>
  );
}

"use client";

import styles from "./EnergyFlow.module.css";

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtW(w: number): string {
  const abs = Math.abs(w);
  if (abs >= 1000) return `${(abs / 1000).toFixed(2)} kW`;
  return `${Math.round(abs)} W`;
}

function lineW(powerW: number): number {
  return Math.max(1.5, Math.min(7, Math.abs(powerW) / 380));
}

interface DotCfg {
  count: number;
  dur: number;
}

function dotCfg(powerW: number): DotCfg {
  const a = Math.abs(powerW);
  if (a < 15) return { count: 0, dur: 2 };
  if (a < 250) return { count: 2, dur: 3.8 };
  if (a < 700) return { count: 3, dur: 2.6 };
  if (a < 1800) return { count: 4, dur: 1.7 };
  if (a < 3500) return { count: 5, dur: 1.1 };
  return { count: 6, dur: 0.75 };
}

// ── Animated dots along an SVG path ──────────────────────────────────────────

interface FlowDotsProps {
  pathId: string;
  powerW: number;
  color: string;
  r?: number;
}

function FlowDots({ pathId, powerW, color, r = 5 }: FlowDotsProps) {
  const { count, dur } = dotCfg(powerW);
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} r={r} fill={color} opacity={0.9}>
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            begin={`${((i / count) * dur).toFixed(3)}s`}
            rotate="none"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}
    </>
  );
}

// ── Flow line + dots ──────────────────────────────────────────────────────────

interface FlowLineProps {
  pathId: string;
  powerW: number;
  color: string;
  dotColor?: string;
  opacity?: number;
}

function FlowLine({ pathId, powerW, color, dotColor, opacity = 1 }: FlowLineProps) {
  const active = Math.abs(powerW) > 14;
  return (
    <>
      <use
        href={`#${pathId}`}
        fill="none"
        stroke={active ? color : "#334155"}
        strokeWidth={active ? lineW(powerW) : 1.5}
        strokeDasharray={!active ? "6 5" : undefined}
        opacity={active ? opacity : 0.3}
        strokeLinecap="round"
      />
      {active && (
        <FlowDots pathId={pathId} powerW={powerW} color={dotColor ?? color} r={4.5} />
      )}
    </>
  );
}

// ── Node: Solar Panel ─────────────────────────────────────────────────────────

interface SolarNodeProps {
  cx: number;
  cy: number;
  r: number;
  powerW: number;
  label: string;
  dailyKwh: number;
}

function SolarNode({ cx, cy, r, powerW, label, dailyKwh }: SolarNodeProps) {
  const hasGen = powerW > 15;
  const ri = r * 0.4;
  const r1 = ri + 5;
  const r2 = ri + 14;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={hasGen ? 0.4 : 0.1} />
      <circle cx={cx} cy={cy} r={r} fill="url(#grad-solar)" opacity={hasGen ? 1 : 0.55} />
      <g transform={`translate(${cx},${cy})`} opacity={hasGen ? 1 : 0.3}>
        {rays.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={Math.cos(rad) * r1}
              y1={Math.sin(rad) * r1}
              x2={Math.cos(rad) * r2}
              y2={Math.sin(rad) * r2}
              stroke="#fde68a"
              strokeWidth={hasGen ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}
        <circle r={ri} fill="#fbbf24" />
        <line x1={-ri * 0.45} y1={-ri * 0.7} x2={-ri * 0.45} y2={ri * 0.7} stroke="rgba(0,0,0,0.18)" strokeWidth={1.2} />
        <line x1={ri * 0.45} y1={-ri * 0.7} x2={ri * 0.45} y2={ri * 0.7} stroke="rgba(0,0,0,0.18)" strokeWidth={1.2} />
        <line x1={-ri * 0.85} y1={0} x2={ri * 0.85} y2={0} stroke="rgba(0,0,0,0.18)" strokeWidth={1.2} />
      </g>
      <text x={cx} y={cy + r + 19} textAnchor="middle" className={styles.nodeLabel}>{label}</text>
      <text x={cx} y={cy + r + 37} textAnchor="middle" className={styles.nodeValue}>{fmtW(powerW)}</text>
      {dailyKwh > 0 && (
        <text x={cx} y={cy + r + 53} textAnchor="middle" className={styles.nodeSub}>Today {dailyKwh.toFixed(1)} kWh</text>
      )}
    </g>
  );
}

// ── Node: Battery ─────────────────────────────────────────────────────────────

interface BatteryNodeProps {
  cx: number;
  cy: number;
  r: number;
  powerW: number; // +ve charging, -ve discharging
  soc: number; // 0–100
  capacityWh: number;
}

function BatteryNode({ cx, cy, r, powerW, soc, capacityWh }: BatteryNodeProps) {
  const isCharging = powerW > 10;
  const isDischarging = powerW < -10;
  const fillColor = soc > 60 ? "#4ade80" : soc > 25 ? "#fbbf24" : "#f87171";
  const bW = r * 0.88;
  const bH = r * 0.46;
  const bx = cx - bW / 2;
  const by = cy - bH / 2;
  const fillW = Math.max(0, (bW - 4) * (soc / 100));

  const arcR = r - 7;
  const arcCirc = 2 * Math.PI * arcR;
  const arcDash = arcCirc * (soc / 100);

  return (
    <g>
      <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="#0f172a" strokeWidth={6} opacity={0.6} />
      <circle
        cx={cx}
        cy={cy}
        r={arcR}
        fill="none"
        stroke={fillColor}
        strokeWidth={6}
        strokeDasharray={`${arcDash} ${arcCirc - arcDash}`}
        strokeLinecap="round"
        opacity={0.85}
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }}
      />
      <circle cx={cx} cy={cy} r={r} fill="url(#grad-battery)" />
      <rect x={bx} y={by} width={bW} height={bH} rx={4} fill="none" stroke={fillColor} strokeWidth={2} />
      <rect x={bx + bW} y={cy - bH * 0.28} width={5} height={bH * 0.56} rx={2} fill={fillColor} />
      <rect x={bx + 2} y={by + 2} width={fillW} height={bH - 4} rx={3} fill={fillColor} opacity={0.75} />
      {isCharging && (
        <text x={cx} y={cy + 5} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="white" fontWeight="bold">⚡</text>
      )}
      <text x={cx} y={cy - r - 15} textAnchor="middle" className={styles.nodeLabel}>Battery</text>
      <text x={cx} y={cy + r + 19} textAnchor="middle" className={styles.nodeValue} style={{ fill: fillColor }}>{soc}% SOC</text>
      <text x={cx} y={cy + r + 37} textAnchor="middle" className={styles.nodeSub}>
        {isCharging ? `↑ Charging ${fmtW(powerW)}` : isDischarging ? `↓ Using ${fmtW(-powerW)}` : "Idle"}
      </text>
      <text x={cx} y={cy + r + 53} textAnchor="middle" className={styles.nodeSub}>{(capacityWh / 1000).toFixed(1)} kWh cap</text>
    </g>
  );
}

// ── Node: Grid ────────────────────────────────────────────────────────────────

interface GridNodeProps {
  cx: number;
  cy: number;
  r: number;
  powerW: number; // -ve export, +ve import
  dailyExportKwh: number;
  dailyImportKwh: number;
}

function GridNode({ cx, cy, r, powerW, dailyExportKwh, dailyImportKwh }: GridNodeProps) {
  const isExporting = powerW < -10;
  const isImporting = powerW > 10;
  const color = isExporting ? "#4ade80" : isImporting ? "#f87171" : "#64748b";
  const gradId = isExporting ? "grad-grid-export" : isImporting ? "grad-grid-import" : "grad-grid-idle";

  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.28} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
      <g transform={`translate(${cx},${cy - 3})`} stroke="rgba(255,255,255,0.82)" strokeWidth={2} fill="none" strokeLinecap="round">
        <line x1={0} y1={-20} x2={0} y2={20} />
        <line x1={-17} y1={-12} x2={17} y2={-12} />
        <line x1={-11} y1={4} x2={11} y2={4} />
        <line x1={0} y1={20} x2={-12} y2={23} />
        <line x1={0} y1={20} x2={12} y2={23} />
        <path d="M -17,-12 Q -21,-4 -17,4" strokeWidth={1.5} />
        <path d="M 17,-12 Q 21,-4 17,4" strokeWidth={1.5} />
      </g>
      <text x={cx} y={cy - r - 15} textAnchor="middle" className={styles.nodeLabel}>Grid</text>
      <text x={cx} y={cy + r + 19} textAnchor="middle" className={styles.nodeValue} style={{ fill: color }}>
        {isExporting ? "Exporting" : isImporting ? "Importing" : "Standby"}
      </text>
      <text x={cx} y={cy + r + 37} textAnchor="middle" className={styles.nodeSub}>{fmtW(Math.abs(powerW))}</text>
      <text x={cx} y={cy + r + 53} textAnchor="middle" className={styles.nodeSub}>↑{dailyExportKwh.toFixed(1)} ↓{dailyImportKwh.toFixed(1)} kWh</text>
    </g>
  );
}

// ── Node: House ───────────────────────────────────────────────────────────────

interface HouseNodeProps {
  cx: number;
  cy: number;
  r: number;
  loadW: number;
  label: string;
  online: boolean;
  fromSolarW: number;
  fromBatteryW: number;
  fromGridW: number;
}

function HouseNode({ cx, cy, r, loadW, label, online, fromSolarW, fromBatteryW, fromGridW }: HouseNodeProps) {
  const hs = r * 0.48;

  const primarySource =
    fromSolarW > 15
      ? `☀ ${fmtW(fromSolarW)} solar`
      : fromBatteryW > 15
        ? `⚡ ${fmtW(fromBatteryW)} battery`
        : fromGridW > 15
          ? `↓ ${fmtW(fromGridW)} grid`
          : "Standby";

  return (
    <g opacity={online ? 1 : 0.45}>
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.25} />
      <circle cx={cx} cy={cy} r={r} fill="url(#grad-house)" />
      <g transform={`translate(${cx},${cy + 4})`} fill="rgba(255,255,255,0.88)">
        <polygon points={`0,${-hs * 1.35} ${-hs * 1.05},${-hs * 0.18} ${hs * 1.05},${-hs * 0.18}`} />
        <rect x={-hs * 0.85} y={-hs * 0.18} width={hs * 1.7} height={hs * 1.18} rx={2} />
        <rect x={-hs * 0.23} y={hs * 0.38} width={hs * 0.46} height={hs * 0.62} rx={1} fill="rgba(30,58,138,0.55)" />
        <rect x={-hs * 0.75} y={hs * 0.1} width={hs * 0.38} height={hs * 0.3} rx={1} fill="rgba(30,58,138,0.35)" />
        <rect x={hs * 0.37} y={hs * 0.1} width={hs * 0.38} height={hs * 0.3} rx={1} fill="rgba(30,58,138,0.35)" />
      </g>
      <text x={cx} y={cy + r + 19} textAnchor="middle" className={styles.nodeLabel}>{label}</text>
      <text x={cx} y={cy + r + 37} textAnchor="middle" className={styles.nodeValue}>{fmtW(loadW)}</text>
      {online ? (
        <text x={cx} y={cy + r + 53} textAnchor="middle" className={styles.nodeSub}>{primarySource}</text>
      ) : (
        <text x={cx} y={cy + r + 53} textAnchor="middle" className={styles.nodeSub} style={{ fill: "#f87171" }}>Offline</text>
      )}
    </g>
  );
}

// ── Combined solar badge ──────────────────────────────────────────────────────

function CombinedSolarBadge({ cx, cy, totalW }: { cx: number; cy: number; totalW: number }) {
  if (totalW < 15) return null;
  return (
    <g>
      <rect x={cx - 62} y={cy - 14} width={124} height={28} rx={8} fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth={1} opacity={0.85} />
      <text x={cx} y={cy + 5} textAnchor="middle" className={styles.combinedBadge}>
        ⚡ Combined {fmtW(totalW)}
      </text>
    </g>
  );
}

// ── Main unified component ────────────────────────────────────────────────────

export interface UnifiedEnergyFlowProps {
  /** Nelson's House — from Hinen hybrid inverter (Watts) */
  nelsonSolarW: number;
  nelsonLoadW: number;
  batteryW: number;         // +ve = charging, -ve = discharging
  batterySoc: number;       // 0–100
  nelsonGridW: number;      // -ve = export, +ve = import
  nelsonDailySolarKwh: number;
  nelsonDailyImportKwh: number;
  nelsonDailyExportKwh: number;
  batteryCapacityWh: number;
  /** Granny Flat — from Fronius (Watts, grid: -ve export, +ve import) */
  grannySolarW: number;
  grannyLoadW: number;
  grannyGridW: number;
  grannyDailySolarKwh: number;
  grannyDailyImportKwh: number;
  grannyDailyExportKwh: number;
  /** Status */
  nelsonOnline: boolean;
  grannyOnline: boolean;
  /** Hinen revenue */
  dailyRevenue?: number;
  monthlyRevenue?: number;
}

export function UnifiedEnergyFlow(props: UnifiedEnergyFlowProps) {
  const {
    nelsonSolarW, nelsonLoadW, batteryW, batterySoc, nelsonGridW,
    nelsonDailySolarKwh, nelsonDailyImportKwh, nelsonDailyExportKwh, batteryCapacityWh,
    grannySolarW, grannyLoadW, grannyGridW,
    grannyDailySolarKwh, grannyDailyImportKwh, grannyDailyExportKwh,
    nelsonOnline, grannyOnline, dailyRevenue, monthlyRevenue,
  } = props;

  // ── Derive power flows ──────────────────────────────────────────────────────
  const batteryChargingW = Math.max(0, batteryW);
  const batteryDischargingW = Math.max(0, -batteryW);
  const nelsonGridExportW = Math.max(0, -nelsonGridW);
  const nelsonGridImportW = Math.max(0, nelsonGridW);

  const solarToBattery = Math.min(nelsonSolarW, batteryChargingW);
  const solarToNelsonGrid = nelsonGridExportW;
  const solarToNelsonLoad = Math.max(0, nelsonSolarW - solarToBattery - solarToNelsonGrid);

  const batteryToNelsonLoad = batteryDischargingW > 0 ? Math.min(batteryDischargingW, nelsonLoadW) : 0;
  const gridToNelsonLoad = nelsonGridImportW;
  const gridToBattery = Math.max(0, batteryChargingW - solarToBattery);

  const grannyGridExportW = Math.max(0, -grannyGridW);
  const grannyGridImportW = Math.max(0, grannyGridW);
  const solarToGrannyLoad = Math.min(grannySolarW, grannyLoadW);
  const solarToGrannyGrid = grannyGridExportW;

  const totalSolarW = nelsonSolarW + grannySolarW;
  const combinedGridW = nelsonGridW + grannyGridW;

  // ── Node layout (viewBox 870×570) ──────────────────────────────────────────
  const nSolar   = { cx: 185, cy: 82,  r: 52 };
  const gSolar   = { cx: 685, cy: 82,  r: 52 };
  const battery  = { cx: 118, cy: 295, r: 52 };
  const grid     = { cx: 752, cy: 295, r: 52 };
  const nHouse   = { cx: 278, cy: 465, r: 52 };
  const gHouse   = { cx: 592, cy: 465, r: 52 };

  return (
    <div className={styles.unifiedFlow}>
      <div className={styles.unifiedHeader}>
        <h2 className={styles.unifiedTitle}>Live Energy Flow</h2>
        <div className={styles.unifiedStats}>
          <span className={styles.statPill} style={{ background: "rgba(251,191,36,0.15)", borderColor: "#fbbf24" }}>
            ☀ {fmtW(totalSolarW)}
          </span>
          <span className={styles.statPill} style={{
            background: batterySoc > 60 ? "rgba(74,222,128,0.15)" : batterySoc > 25 ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.15)",
            borderColor: batterySoc > 60 ? "#4ade80" : batterySoc > 25 ? "#fbbf24" : "#f87171",
          }}>
            🔋 {batterySoc}%{batteryW > 10 ? " ↑" : batteryW < -10 ? " ↓" : ""}
          </span>
          <span className={styles.statPill} style={{
            background: combinedGridW < 0 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
            borderColor: combinedGridW < 0 ? "#4ade80" : "#f87171",
          }}>
            ⚡ Grid {combinedGridW < 0 ? `${fmtW(Math.abs(combinedGridW))} ↑` : `${fmtW(Math.abs(combinedGridW))} ↓`}
          </span>
          {dailyRevenue !== undefined && (
            <span className={styles.statPill} style={{
              background: dailyRevenue >= 0 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
              borderColor: dailyRevenue >= 0 ? "#4ade80" : "#f87171",
            }}>
              ${dailyRevenue >= 0 ? "+" : ""}{dailyRevenue.toFixed(2)} today
            </span>
          )}
        </div>
      </div>

      <svg className={styles.unifiedDiagram} viewBox="0 0 870 570" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Gradients */}
          <radialGradient id="grad-solar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
          <radialGradient id="grad-battery" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a52" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          <radialGradient id="grad-house" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
          <radialGradient id="grad-grid-export" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#052e16" />
          </radialGradient>
          <radialGradient id="grad-grid-import" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>
          <radialGradient id="grad-grid-idle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          {/* Filters */}
          <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(0,0,0,0.5)" />
          </filter>

          {/* Flow paths — invisible, only used by animateMotion */}
          {/* 1. Nelson Solar → Battery */}
          <path id="p-nsolar-battery"  d={`M ${nSolar.cx-10} ${nSolar.cy+nSolar.r} C ${nSolar.cx-20} 205 ${battery.cx} 205 ${battery.cx} ${battery.cy-battery.r}`} />
          {/* 2. Nelson Solar → Nelson House */}
          <path id="p-nsolar-nhouse"   d={`M ${nSolar.cx+22} ${nSolar.cy+nSolar.r-10} C ${nSolar.cx+55} 230 ${nHouse.cx-22} 360 ${nHouse.cx-22} ${nHouse.cy-nHouse.r}`} />
          {/* 3. Nelson Solar → Grid (arc over top) */}
          <path id="p-nsolar-grid"     d={`M ${nSolar.cx+nSolar.r-5} ${nSolar.cy-12} Q 435 -18 ${grid.cx-grid.r+5} ${grid.cy-12}`} />
          {/* 4. Battery → Nelson House */}
          <path id="p-battery-nhouse"  d={`M ${battery.cx+18} ${battery.cy+battery.r-8} C ${battery.cx+55} 415 ${nHouse.cx-48} 432 ${nHouse.cx-40} ${nHouse.cy-nHouse.r+5}`} />
          {/* 5. Battery → Grid */}
          <path id="p-battery-grid"    d={`M ${battery.cx+battery.r} ${battery.cy-5} L ${grid.cx-grid.r} ${grid.cy-5}`} />
          {/* 6. Grid → Battery */}
          <path id="p-grid-battery"    d={`M ${grid.cx-grid.r} ${grid.cy+5} L ${battery.cx+battery.r} ${battery.cy+5}`} />
          {/* 7. Grid → Nelson House */}
          <path id="p-grid-nhouse"     d={`M ${grid.cx-22} ${grid.cy+grid.r} C ${grid.cx-90} 428 ${nHouse.cx+85} 430 ${nHouse.cx+48} ${nHouse.cy-nHouse.r+5}`} />
          {/* 8. Grid → Granny House */}
          <path id="p-grid-ghouse"     d={`M ${grid.cx-8} ${grid.cy+grid.r} C ${grid.cx-22} 432 ${gHouse.cx+58} 432 ${gHouse.cx+48} ${gHouse.cy-gHouse.r+5}`} />
          {/* 9. Granny Solar → Granny House */}
          <path id="p-gsolar-ghouse"   d={`M ${gSolar.cx-22} ${gSolar.cy+gSolar.r-10} C ${gSolar.cx-55} 230 ${gHouse.cx+22} 360 ${gHouse.cx+22} ${gHouse.cy-gHouse.r}`} />
          {/* 10. Granny Solar → Grid */}
          <path id="p-gsolar-grid"     d={`M ${gSolar.cx+10} ${gSolar.cy+gSolar.r} C ${gSolar.cx+20} 205 ${grid.cx} 205 ${grid.cx} ${grid.cy-grid.r}`} />
        </defs>

        {/* ── Flow lines (below nodes) ── */}
        <g>
          {/* Solar → Battery: amber */}
          <FlowLine pathId="p-nsolar-battery" powerW={solarToBattery}   color="#f59e0b" dotColor="#fde68a" />
          {/* Solar → Nelson load: amber */}
          <FlowLine pathId="p-nsolar-nhouse"  powerW={solarToNelsonLoad} color="#f59e0b" dotColor="#fde68a" />
          {/* Solar export → Grid: amber */}
          <FlowLine pathId="p-nsolar-grid"    powerW={solarToNelsonGrid} color="#f59e0b" dotColor="#fde68a" />
          {/* Battery → Nelson load: green */}
          <FlowLine pathId="p-battery-nhouse" powerW={batteryToNelsonLoad} color="#4ade80" dotColor="#86efac" />
          {/* Battery → Grid (arbitrage export) */}
          <FlowLine pathId="p-battery-grid"   powerW={batteryDischargingW > 0 && nelsonGridExportW > 0 ? Math.min(batteryDischargingW, nelsonGridExportW) : 0} color="#4ade80" dotColor="#86efac" />
          {/* Grid → Battery: blue */}
          <FlowLine pathId="p-grid-battery"   powerW={gridToBattery}    color="#60a5fa" dotColor="#93c5fd" />
          {/* Grid → Nelson load: red */}
          <FlowLine pathId="p-grid-nhouse"    powerW={gridToNelsonLoad} color="#f87171" dotColor="#fca5a5" />
          {/* Grid → Granny load: red */}
          <FlowLine pathId="p-grid-ghouse"    powerW={grannyGridImportW} color="#f87171" dotColor="#fca5a5" />
          {/* Granny Solar → Granny load: amber */}
          <FlowLine pathId="p-gsolar-ghouse"  powerW={solarToGrannyLoad} color="#f59e0b" dotColor="#fde68a" />
          {/* Granny Solar → Grid export: amber */}
          <FlowLine pathId="p-gsolar-grid"    powerW={solarToGrannyGrid} color="#f59e0b" dotColor="#fde68a" />
        </g>

        {/* ── Nodes (above flows) ── */}
        <g filter="url(#node-shadow)">
          <SolarNode  {...nSolar}  powerW={nelsonSolarW} label="Nelson's Solar" dailyKwh={nelsonDailySolarKwh} />
          <SolarNode  {...gSolar}  powerW={grannySolarW} label="Granny Solar"   dailyKwh={grannyDailySolarKwh} />
          <BatteryNode {...battery} powerW={batteryW} soc={batterySoc} capacityWh={batteryCapacityWh} />
          <GridNode   {...grid}
            powerW={combinedGridW}
            dailyExportKwh={nelsonDailyExportKwh + grannyDailyExportKwh}
            dailyImportKwh={nelsonDailyImportKwh + grannyDailyImportKwh}
          />
          <HouseNode  {...nHouse} loadW={nelsonLoadW}  label="Nelson's House" online={nelsonOnline}
            fromSolarW={solarToNelsonLoad} fromBatteryW={batteryToNelsonLoad} fromGridW={gridToNelsonLoad} />
          <HouseNode  {...gHouse} loadW={grannyLoadW}  label="Granny Flat"    online={grannyOnline}
            fromSolarW={solarToGrannyLoad} fromBatteryW={0} fromGridW={grannyGridImportW} />
        </g>

        {/* ── Combined solar badge ── */}
        <CombinedSolarBadge cx={435} cy={82} totalW={totalSolarW} />

        {/* Max charge indicator */}
        {batteryChargingW > 4500 && (
          <text x={battery.cx + battery.r + 10} y={battery.cy - 12} className={styles.nodeSub} style={{ fill: "#fbbf24" }}>
            Max charge ↑
          </text>
        )}
      </svg>

      {/* ── Stats bar ── */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Nelson Solar</span>
          <span className={styles.statValue}>{fmtW(nelsonSolarW)}</span>
          <span className={styles.statMeta}>{nelsonDailySolarKwh.toFixed(1)} kWh today</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Granny Solar</span>
          <span className={styles.statValue}>{fmtW(grannySolarW)}</span>
          <span className={styles.statMeta}>{grannyDailySolarKwh.toFixed(1)} kWh today</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Battery</span>
          <span className={styles.statValue} style={{ color: batterySoc > 60 ? "#4ade80" : batterySoc > 25 ? "#fbbf24" : "#f87171" }}>
            {batterySoc}%
          </span>
          <span className={styles.statMeta}>
            {batteryW > 10 ? `+${fmtW(batteryW)} charging` : batteryW < -10 ? `${fmtW(-batteryW)} discharging` : "Idle"}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Grid (combined)</span>
          <span className={styles.statValue} style={{ color: combinedGridW < 0 ? "#4ade80" : combinedGridW > 0 ? "#f87171" : "#64748b" }}>
            {combinedGridW < 0 ? `↑ ${fmtW(Math.abs(combinedGridW))}` : combinedGridW > 0 ? `↓ ${fmtW(combinedGridW)}` : "0 W"}
          </span>
          <span className={styles.statMeta}>
            ↑ {(nelsonDailyExportKwh + grannyDailyExportKwh).toFixed(1)} / ↓ {(nelsonDailyImportKwh + grannyDailyImportKwh).toFixed(1)} kWh
          </span>
        </div>
        {dailyRevenue !== undefined && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Revenue Today</span>
            <span className={styles.statValue} style={{ color: dailyRevenue >= 0 ? "#4ade80" : "#f87171" }}>
              ${dailyRevenue >= 0 ? "+" : ""}{dailyRevenue.toFixed(2)}
            </span>
            {monthlyRevenue !== undefined && (
              <span className={styles.statMeta}>${monthlyRevenue.toFixed(2)} this month</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legacy shim ───────────────────────────────────────────────────────────────

interface PropertyEnergyFlowProps {
  label: string;
  generation: number; // kW
  consumption: number; // kW
  grid: number; // kW
}

/** @deprecated — replaced by UnifiedEnergyFlow */
export function PropertyEnergyFlow(_props: PropertyEnergyFlowProps) {
  return null;
}
  

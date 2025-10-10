"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconBolt,
  IconBuildingEstate,
  IconCalendarEvent,
  IconChartAreaLine,
  IconClockHour4,
  IconInfoCircle,
  IconHome2,
  IconPlug,
  IconRefresh,
  IconSparkles,
  IconSun,
  IconTrendingUp,
} from "@tabler/icons-react";
import { usePowerData } from "@/hooks/usePowerData";
import { useHistoricalMetrics, RANGE_OPTIONS, type RangeKey } from "@/hooks/useHistoricalMetrics";
import type { DeviceSnapshot, HistoricalSummary } from "@/types/power";
import styles from "./page.module.css";

const DEFAULT_MAX_GENERATION = 12000;
const envMaxGeneration = Number(process.env.NEXT_PUBLIC_MAX_GENERATION);
const MAX_GENERATION =
  Number.isFinite(envMaxGeneration) && envMaxGeneration > 0
    ? envMaxGeneration
    : DEFAULT_MAX_GENERATION;

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, rotateX: 5 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      delay: 0.08 * index,
      duration: 0.65,
      ease: [0.23, 1, 0.32, 1] as const,
    },
  }),
};

export default function Home() {
  const [range, setRange] = useState<RangeKey>("24h");
  const [customRange, setCustomRange] = useState<{ from?: string; to?: string }>({});
  const { data, error, isLoading, mutate, isValidating } = usePowerData();
  const customFromIso = localDateToIso(customRange.from);
  const customToIso = localDateToIso(customRange.to);
  const metricsParams = {
    range,
    ...(customFromIso && customToIso ? { from: customFromIso, to: customToIso } : {}),
  } satisfies { range: RangeKey; from?: string; to?: string };
  const {
    data: historical,
    error: historicalError,
    isLoading: historicalLoading,
    mutate: refreshHistorical,
    isValidating: historicalValidating,
  } = useHistoricalMetrics(metricsParams);

  const handleRangeChange = (nextRange: RangeKey) => {
    setRange(nextRange);
    if (nextRange !== "custom") {
      setCustomRange({});
    }
  };

  const handleCustomRangeChange = (update: { from?: string; to?: string }) => {
    setRange("custom");
    setCustomRange((prev) => ({
      from:
        update.from !== undefined
          ? update.from === ""
            ? undefined
            : update.from
          : prev.from,
      to:
        update.to !== undefined
          ? update.to === ""
            ? undefined
            : update.to
          : prev.to,
    }));
  };

  const handleClearCustom = () => {
    setCustomRange({});
    setRange("24h");
  };

  if (isLoading && !data) {
    return (
      <main className={styles.wrapper}>
        <SkeletonGrid />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className={styles.wrapper}>
        <ErrorState message={error.message} onRetry={() => mutate()} />
      </main>
    );
  }

  const cards = data ? [data.combined, ...data.devices] : [];
  const updatedAt = data ? new Date(data.updatedAt) : null;
  const updatedLabel = updatedAt
    ? updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <main className={styles.wrapper}>
      <section className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.property}>{data?.property ?? "Solar Dashboard"}</h1>
          <div className={styles.subtitle}>
            <span>
              <IconBuildingEstate size={18} /> Live generation, consumption & grid flow
            </span>
            <span>
              <IconBolt size={18} /> Auto refresh every 5 seconds
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.refresh} onClick={() => mutate()}>
            <motion.span
              animate={isValidating ? { rotate: 360 } : { rotate: 0 }}
              transition={{ repeat: isValidating ? Infinity : 0, duration: 1, ease: "linear" }}
            >
              <IconRefresh size={18} />
            </motion.span>
            Refresh now
          </button>
          <span className={styles.subtitle}>Updated {updatedLabel}</span>
        </div>
      </section>

      {cards.length === 0 ? (
        <ErrorState message="No devices configured yet." onRetry={() => mutate()} />
      ) : (
        <section className={styles.grid}>
          {cards.map((snapshot, index) => (
            <PowerCard key={snapshot.id} snapshot={snapshot} index={index} />
          ))}
        </section>
      )}

      <HistoricalSection
        data={historical}
        range={range}
        customFrom={customRange.from}
        customTo={customRange.to}
        onCustomRangeChange={handleCustomRangeChange}
        onClearCustom={handleClearCustom}
        onRangeChange={handleRangeChange}
        isLoading={historicalLoading && !historical}
        isValidating={historicalValidating}
        error={historicalError}
        onRefresh={() => refreshHistorical()}
      />
    </main>
  );
}

type PowerCardProps = {
  snapshot: DeviceSnapshot;
  index: number;
};

function PowerCard({ snapshot, index }: PowerCardProps) {
  const metrics = useMemo(() => {
    const gridExporting = snapshot.grid >= 0;

    return [
      {
        label: "Solar Generation",
        value: snapshot.generation,
        icon: <IconSun size={20} />,
        accent: "var(--positive)",
      },
      {
        label: snapshot.id === "combined" ? "Total Consumption" : "Property Consumption",
        value: snapshot.consumption,
        icon: <IconHome2 size={20} />,
        accent: "var(--accent)",
      },
      {
        label: gridExporting ? "Grid Export" : "Grid Import",
        value: Math.abs(snapshot.grid),
        icon: gridExporting ? <IconArrowUpRight size={20} /> : <IconArrowDownRight size={20} />,
        accent: gridExporting ? "var(--positive)" : "var(--danger)",
      },
    ];
  }, [snapshot]);

  const safeMaxGeneration = Math.max(MAX_GENERATION, 1);
  const generationRatio = Math.max(0, Math.min(1, snapshot.generation / safeMaxGeneration));
  const clipPercent = (generationRatio * 100).toFixed(1);

  const titleIcon = snapshot.id === "combined" ? <IconBolt size={26} /> : <IconPlug size={26} />;
  const statusClass =
    snapshot.status === "ok" ? styles.status : `${styles.status} ${styles.statusError}`;

  const generationDisplay = formatPower(snapshot.generation);

  return (
    <motion.article
      className={styles.card}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <div className={styles.cardHeader}>
        <div className={styles.deviceTitle}>
          {titleIcon}
          <span>{snapshot.label}</span>
        </div>
        <span className={statusClass}>
          {snapshot.status === "ok" ? "Online" : "Offline"}
        </span>
      </div>

      <div className={styles.metrics}>
        {metrics.map((metric) => {
          const formatted = formatPower(metric.value);
          return (
            <div key={metric.label} className={styles.metric}>
              <div className={styles.metricLeft}>
                <span className={styles.metricIcon} style={{ color: metric.accent }}>
                  {metric.icon}
                </span>
                <span>{metric.label}</span>
              </div>
              <div className={styles.metricValue}>
                {formatted.value}
                <span className={styles.metricUnit}>{formatted.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.gauge}>
        <div className={styles.gaugeTrack} />
        <motion.div
          className={styles.gaugeFill}
          animate={{
            clipPath: `polygon(0 100%, ${clipPercent}% 100%, ${clipPercent}% 0, 0 0)`,
          }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
        <div className={styles.gaugeLabel}>
          {generationDisplay.value} {generationDisplay.unit} live
        </div>
      </div>

      {snapshot.status === "error" && snapshot.error ? (
        <div className={styles.alert}>
          <IconAlertTriangle size={18} /> {snapshot.error}
        </div>
      ) : null}
    </motion.article>
  );
}


type HistoricalSectionProps = {
  data?: HistoricalSummary;
  range: RangeKey;
  customFrom?: string;
  customTo?: string;
  onCustomRangeChange: (update: { from?: string; to?: string }) => void;
  onClearCustom: () => void;
  onRangeChange: (range: RangeKey) => void;
  isLoading: boolean;
  isValidating: boolean;
  error?: Error;
  onRefresh: () => void;
};

type SummaryCard = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  accent: string;
  helper?: string;
  description: string;
};

function HistoricalSection({
  data,
  range,
  customFrom,
  customTo,
  onCustomRangeChange,
  onClearCustom,
  onRangeChange,
  isLoading,
  isValidating,
  error,
  onRefresh,
}: HistoricalSectionProps) {
  const rangeFallback = RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "Selected range";
  const rangeLabel = data?.range.label ?? rangeFallback;
  const isCustom = range === "custom";
  const needsCustomRange = isCustom && (!customFrom || !customTo);
  const summaryCards: SummaryCard[] = data
    ? (() => {
        const generated = formatEnergy(data.totals.energyGenerated);
        const consumed = formatEnergy(data.totals.energyConsumed);
        const exported = formatEnergy(data.totals.energyExported);
        const imported = formatEnergy(data.totals.energyImported);
        const net = data.totals.energyNet;
        const netDisplay = formatEnergy(Math.abs(net));
        const peak = formatPower(data.totals.peakGeneration);
        const average = formatPower(data.totals.averageGeneration);
        const netIcon = net >= 0 ? <IconArrowUpRight size={20} /> : <IconArrowDownRight size={20} />;
        const netAccent = net >= 0 ? "var(--positive)" : "var(--danger)";
        const uptime = formatPercent(data.totals.uptimePercent);

        return [
          {
            key: "generated",
            label: "Energy Generated",
            value: generated.value,
            unit: generated.unit,
            icon: <IconSun size={20} />,
            accent: "var(--positive)",
            description:
              "All the solar energy your panels produced during the selected window. We sample power (kW), average it, and multiply by the time between readings to convert it into kilowatt-hours.",
          },
          {
            key: "consumed",
            label: "Energy Consumed",
            value: consumed.value,
            unit: consumed.unit,
            icon: <IconHome2 size={20} />,
            accent: "var(--accent)",
            description:
              "Electricity used within the property over this timeframe. Positive numbers mean you drew energy to run appliances; negative numbers mean generation exceeded on-site use.",
          },
          {
            key: "net",
            label: net >= 0 ? "Net Export" : "Net Import",
            value: netDisplay.value,
            unit: netDisplay.unit,
            icon: netIcon,
            accent: netAccent,
            helper: `Export ${exported.value}${exported.unit} | Import ${imported.value}${imported.unit}`,
            description:
              "Difference between solar sent to the grid and energy pulled from it. Export is counted when power flows out; import is counted when you pull power in.",
          },
          {
            key: "peak",
            label: "Peak Generation",
            value: peak.value,
            unit: peak.unit,
            icon: <IconSparkles size={20} />,
            accent: "var(--neutral)",
            description:
              "The single highest power reading from your inverters during this period. It shows the top output moment in kilowatts.",
          },
          {
            key: "average",
            label: "Average Generation",
            value: average.value,
            unit: average.unit,
            icon: <IconTrendingUp size={20} />,
            accent: "var(--neutral)",
            description:
              "The mean solar output across all samples. We add every power reading together and divide by the number of samples to show a typical output level.",
          },
          {
            key: "uptime",
            label: "Fleet Uptime",
            value: uptime,
            icon: <IconClockHour4 size={20} />,
            accent: "var(--accent)",
            helper: data.totals.uptimePercent >= 99.9 ? "Excellent availability" : "Includes offline intervals",
            description:
              "How often the inverters responded when we polled them. Each successful reading counts as online; the percentage shows online samples versus the total.",
          },
        ];
      })()
    : [];

  return (
    <section className={styles.summarySection}>
      <header className={styles.summaryHeader}>
        <div>
          <h2>Performance History</h2>
          <p className={styles.summarySubtitle}>
            <IconCalendarEvent size={16} />
            <span>{rangeLabel}</span>
            {data?.range ? (
              <span className={styles.summaryRangeWindow}>
                {formatDateTime(data.range.from)} – {formatDateTime(data.range.to)}
              </span>
            ) : null}
            {isValidating ? <span>- Updating...</span> : null}
          </p>
        </div>
        <div className={styles.summaryControls}>
          <div className={styles.rangeSelector}>
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={
                  option.key === range
                    ? `${styles.rangeButton} ${styles.rangeButtonActive}`
                    : styles.rangeButton
                }
                onClick={() => onRangeChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onRefresh}>
            <motion.span
              animate={isValidating ? { rotate: 360 } : { rotate: 0 }}
              transition={{ repeat: isValidating ? Infinity : 0, duration: 1, ease: "linear" }}
            >
              <IconRefresh size={16} />
            </motion.span>
            Sync
          </button>
        </div>
      </header>

      {isCustom ? (
        <div className={styles.customRange}>
          <label>
            <span>From</span>
            <input
              type="datetime-local"
              value={customFrom ?? ""}
              onChange={(event) => onCustomRangeChange({ from: event.target.value })}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="datetime-local"
              value={customTo ?? ""}
              onChange={(event) => onCustomRangeChange({ to: event.target.value })}
            />
          </label>
          <button type="button" className={styles.textButton} onClick={onClearCustom}>
            Clear
          </button>
        </div>
      ) : null}

      {needsCustomRange ? (
        <div className={styles.summaryNotice}>
          <IconInfoCircle size={18} />
          <div>
            <div className={styles.summaryNoticeTitle}>Choose a start and end time</div>
            <p className={styles.summaryNoticeBody}>
              Pick both dates above to load a custom history window. Once both are set we will fetch and chart the data automatically.
            </p>
          </div>
        </div>
      ) : isLoading && !data ? (
        <HistoricalSkeleton />
      ) : error && !data ? (
        <HistoricalError message={error.message} onRetry={onRefresh} />
      ) : data ? (
        <div className={styles.summaryBody}>
          <div className={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <div key={card.key} className={styles.summaryCard}>
                <div className={styles.summaryIcon} style={{ color: card.accent }}>
                  {card.icon}
                </div>
                <div className={styles.summaryCardBody}>
                  <div className={styles.summaryValue}>
                    {card.value}
                    {card.unit ? <span className={styles.summaryUnit}>{card.unit}</span> : null}
                  </div>
                  <div className={styles.summaryLabelRow}>
                    <div className={styles.summaryLabel}>{card.label}</div>
                    <InfoTooltip description={card.description} />
                  </div>
                  {card.helper ? <div className={styles.summaryHelper}>{card.helper}</div> : null}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.summarySplit}>
            <SparklineCard points={data.timeline} isUpdating={isValidating} />
            <DeviceTable data={data} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

type SparklineCardProps = {
  points: HistoricalSummary["timeline"];
  isUpdating: boolean;
};

function InfoTooltip({ description }: { description: string }) {
  return (
    <span className={styles.infoWrapper}>
      <button
        type="button"
        className={styles.infoButton}
        aria-label="What does this metric mean?"
      >
        <IconInfoCircle size={16} />
      </button>
      <span className={styles.infoBubble} role="tooltip">
        {description}
      </span>
    </span>
  );
}

function SparklineCard({ points, isUpdating }: SparklineCardProps) {
  const latest = points.length ? points[points.length - 1] : undefined;
  const latestDisplay = latest ? formatPower(latest.generation) : null;
  const latestTimestamp = latest?.timestamp;

  return (
    <div className={styles.sparklineCard}>
      <div className={styles.cardHeaderLine}>
        <IconChartAreaLine size={18} />
        <span>Generation Trend</span>
        {isUpdating ? <span className={styles.badge}>Updating</span> : null}
      </div>
      {points.length < 2 ? (
        <div className={styles.sparklineEmpty}>Collecting data…</div>
      ) : (
        <Sparkline points={points} />
      )}
      {latest && latestDisplay ? (
        <div className={styles.sparklineFooter}>
          Latest {latestDisplay.value} {latestDisplay.unit} at {formatDateTime(latestTimestamp)}
        </div>
      ) : null}
    </div>
  );
}

type DeviceTableProps = {
  data: HistoricalSummary;
};

function DeviceTable({ data }: DeviceTableProps) {
  const rows = [...data.devices].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className={styles.devicesCard}>
      <div className={styles.cardHeaderLine}>
        <IconPlug size={18} />
        <span>Device Metrics</span>
      </div>
      {rows.length === 0 ? (
        <div className={styles.sparklineEmpty}>No device data captured for this range yet.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Device</th>
              <th>Uptime</th>
              <th>Energy</th>
              <th>Peak Output</th>
              <th>Samples</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const energy = formatEnergy(row.energyGenerated);
              const peak = formatPower(row.peakGeneration);
              return (
                <tr key={row.deviceId}>
                  <td>
                    <span className={styles.deviceName}>{row.label}</span>
                  </td>
                  <td>
                    <span className={styles.uptimeValue}>{formatPercent(row.uptimePercent)}</span>
                  </td>
                  <td>
                    {energy.value} <span className={styles.muted}>{energy.unit}</span>
                  </td>
                  <td>
                    {peak.value} <span className={styles.muted}>{peak.unit}</span>
                  </td>
                  <td>
                    {row.totalSamples}
                    <div className={styles.samplesMeta}>
                      {row.downtimeSamples > 0
                        ? `${row.downtimeSamples} offline`
                        : "Continuous"}
                    </div>
                  </td>
                  <td>{formatDateTime(row.lastSeen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HistoricalSkeleton() {
  return (
    <div className={styles.summarySkeleton}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={styles.summarySkeletonBar} />
      ))}
    </div>
  );
}

function HistoricalError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.errorState}>
      <h2>
        <IconAlertTriangle size={24} />
        Historical data unavailable
      </h2>
      <p>
        {message ||
          "We could not load the historical dataset for this period. Please try again."}
      </p>
      <button className={styles.refresh} onClick={onRetry}>
        <IconRefresh size={18} /> Retry
      </button>
    </div>
  );
}

type SparklineProps = {
  points: HistoricalSummary["timeline"];
};

function Sparkline({ points }: SparklineProps) {
  if (points.length === 0) {
    return null;
  }

  const width = 420;
  const height = 140;
  const padding = 18;
  const maxGeneration = Math.max(...points.map((point) => point.generation), 1);
  const coords = points.map((point, index) => {
    const x =
      padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const ratio = point.generation / maxGeneration;
    const y = height - padding - ratio * (height - padding * 2);
    return { x, y };
  });

  const first = coords[0];
  const last = coords[coords.length - 1];
  const linePath = coords
    .map((coordinate, index) =>
      `${index === 0 ? "M" : "L"} ${coordinate.x.toFixed(2)} ${coordinate.y.toFixed(2)}`
    )
    .join(" ");
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${first.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;

  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${width} ${height}`} role="img">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(90, 241, 140, 0.55)" />
          <stop offset="100%" stopColor="rgba(90, 241, 140, 0.05)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparklineGradient)" opacity={0.75} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--positive)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
function SkeletonGrid() {
  return (
    <section className={styles.skeletonGrid}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonPulse} />
        </div>
      ))}
    </section>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className={styles.errorState}>
      <h2>
        <IconAlertTriangle size={24} />
        Connection issue
      </h2>
      <p>{message || "We could not reach the Fronius devices. Please confirm connectivity and try again."}</p>
      <button className={styles.refresh} onClick={onRetry}>
        <IconRefresh size={18} /> Retry
      </button>
    </section>
  );
}

function formatPower(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const scaled = value / 1000;
    const digits = Math.abs(scaled) >= 10 ? 1 : 2;
    return { value: scaled.toFixed(digits), unit: "kW" };
  }
  return { value: Math.round(value).toString(), unit: "W" };
}

function formatEnergy(value: number) {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const formatted = abs.toFixed(digits);
  return { value: value < 0 ? `-${formatted}` : formatted, unit: "kWh" };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  const clamped = Math.max(0, Math.min(100, value));
  const digits = clamped === 0 || clamped === 100 ? 0 : 1;
  return `${clamped.toFixed(digits)}%`;
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function localDateToIso(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}


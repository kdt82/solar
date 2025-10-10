
import useSWR from "swr";
import type { HistoricalSummary } from "@/types/power";

export type RangeKey = "24h" | "7d" | "30d" | "today" | "custom";

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "24h", label: "Last 24h" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "custom", label: "Custom" },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch historical metrics");
  }
  return (await response.json()) as HistoricalSummary;
};

type HistoricalQuery = {
  range: RangeKey;
  from?: string;
  to?: string;
};

function buildKey(params: HistoricalQuery) {
  if (params.range === "custom" && (!params.from || !params.to)) {
    return null;
  }
  const query = new URLSearchParams({ range: params.range });
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return `/api/metrics?${query.toString()}`;
}

export function useHistoricalMetrics(params: HistoricalQuery) {
  const key = buildKey(params);
  const swr = useSWR<HistoricalSummary>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    shouldRetryOnError: true,
  });

  return swr;
}

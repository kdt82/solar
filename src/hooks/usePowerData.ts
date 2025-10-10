"use client";

import useSWR from "swr";
import type { PowerDashboardData } from "@/types/power";

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch power data");
  }
  return (await response.json()) as PowerDashboardData;
};

export function usePowerData() {
  const swr = useSWR<PowerDashboardData>("/api/power", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryInterval: 8000,
    dedupingInterval: 2500,
  });

  return swr;
}

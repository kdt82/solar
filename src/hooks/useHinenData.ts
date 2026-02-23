"use client";

import useSWR from "swr";
import type { HinenStatus } from "@/lib/hinen";

const fetcher = async (url: string): Promise<HinenStatus> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hinen fetch failed: ${res.status}`);
  return res.json();
};

export function useHinenData() {
  return useSWR<HinenStatus>("/api/hinen", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryInterval: 10000,
    dedupingInterval: 2500,
  });
}

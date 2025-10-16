import { parseISO, startOfDay, subDays, subHours } from "date-fns";
import { NextResponse } from "next/server";
import { getHistoricalSummary } from "@/lib/metrics";

type RangeOptionKey = "24h" | "7d" | "30d" | "today" | "custom";

const RANGE_LABELS: Record<RangeOptionKey, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  today: "Today",
  custom: "Custom range",
};

function resolveRange(params: URLSearchParams) {
  const now = new Date();
  const to = params.get("to") ? parseISO(params.get("to")!) : now;

  const fromParam = params.get("from");
  if (fromParam) {
    const parsedFrom = parseISO(fromParam);
    if (Number.isNaN(parsedFrom.getTime())) {
      throw new Error("Invalid 'from' value");
    }
    return {
      from: parsedFrom,
      to,
      label: `${parsedFrom.toLocaleDateString()} – ${to.toLocaleDateString()}`,
    };
  }

  const rangeKey = params.get("range") as RangeOptionKey | null;
  if (rangeKey === "custom") {
    throw new Error("Custom range requires both 'from' and 'to' parameters");
  }
  switch (rangeKey) {
    case "7d":
      return { from: subDays(to, 7), to, label: RANGE_LABELS["7d"] };
    case "30d":
      return { from: subDays(to, 30), to, label: RANGE_LABELS["30d"] };
    case "today": {
      const start = startOfDay(to);
      return { from: start, to, label: RANGE_LABELS.today };
    }
    case "24h":
    case null:
    default:
      return { from: subHours(to, 24), to, label: RANGE_LABELS["24h"] };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = resolveRange(searchParams);

    if (range.from.getTime() >= range.to.getTime()) {
      return NextResponse.json({ message: "'from' must be earlier than 'to'" }, { status: 400 });
    }

    const summary = await getHistoricalSummary(
      range.from.toISOString(),
      range.to.toISOString(),
      range.label
    );

    return NextResponse.json(summary, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
}

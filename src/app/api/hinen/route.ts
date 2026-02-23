import { NextResponse } from "next/server";
import { getHinenStatus } from "@/lib/hinen";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getHinenStatus();
    return NextResponse.json(status, {
      status: status.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hinen proxy unreachable";
    console.error("[hinen/status]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

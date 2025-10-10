import { NextResponse } from "next/server";
import { getAllSnapshots } from "@/lib/fronius";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getAllSnapshots();
  const hasSuccess = payload.devices.some((device) => device.status === "ok");

  return NextResponse.json(payload, {
    status: hasSuccess ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { testAlert } from "@/lib/homeassistant";

export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current settings
    const settings = await prisma.alertSettings.findFirst();
    if (!settings) {
      return NextResponse.json(
        { error: "Alert settings not configured" },
        { status: 400 }
      );
    }

    // Trigger test alert
    const result = await testAlert(settings);

    // Log the test event
    await prisma.alertLog.create({
      data: {
        gridValue: 0,
        triggered: result.success,
        message: result.success
          ? "Test alert triggered successfully"
          : `Test alert failed: ${result.error}`,
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test alert sent to Google Home speakers",
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to trigger test alert" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error triggering test alert:", error);
    return NextResponse.json(
      { error: "Failed to trigger test alert" },
      { status: 500 }
    );
  }
}

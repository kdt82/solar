import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Validation helpers
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Hobart",
];

function validateSettings(data: Record<string, unknown>) {
  const errors: string[] = [];

  if (typeof data.enabled !== "boolean") {
    errors.push("enabled must be a boolean");
  }

  if (data.timeWindowStart && typeof data.timeWindowStart === "string" && !TIME_REGEX.test(data.timeWindowStart)) {
    errors.push("timeWindowStart must be in HH:mm format");
  }

  if (data.timeWindowEnd && typeof data.timeWindowEnd === "string" && !TIME_REGEX.test(data.timeWindowEnd)) {
    errors.push("timeWindowEnd must be in HH:mm format");
  }

  if (data.threshold !== undefined) {
    const threshold = Number(data.threshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 20) {
      errors.push("threshold must be between 0 and 20 kW");
    }
  }

  if (data.duration !== undefined) {
    const duration = Number(data.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
      errors.push("duration must be an integer between 1 and 120 minutes");
    }
  }

  if (data.cooldown !== undefined) {
    const cooldown = Number(data.cooldown);
    if (!Number.isInteger(cooldown) || cooldown < 1 || cooldown > 240) {
      errors.push("cooldown must be an integer between 1 and 240 minutes");
    }
  }

  if (data.speakerGroup && typeof data.speakerGroup === "string" && !data.speakerGroup.startsWith("media_player.")) {
    errors.push("speakerGroup must start with 'media_player.'");
  }

  if (data.volume !== undefined) {
    const volume = Number(data.volume);
    if (isNaN(volume) || volume < 0 || volume > 1) {
      errors.push("volume must be between 0 and 1");
    }
  }

  if (data.timezone && typeof data.timezone === "string" && !TIMEZONES.includes(data.timezone)) {
    errors.push(`timezone must be one of: ${TIMEZONES.join(", ")}`);
  }

  return errors;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing settings or create default
    let settings = await prisma.alertSettings.findFirst();

    if (!settings) {
      // Create default settings
      settings = await prisma.alertSettings.create({
        data: {
          enabled: false,
          timeWindowStart: "00:00",
          timeWindowEnd: "23:59",
          threshold: 2.5,
          duration: 5,
          cooldown: 15,
          speakerGroup: "media_player.google_home_group",
          volume: 0.5,
          timezone: "Australia/Sydney",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching alert settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const errors = validateSettings(body);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Get existing settings or create if none exist
    const existing = await prisma.alertSettings.findFirst();

    const data = {
      enabled: body.enabled,
      timeWindowStart: body.timeWindowStart,
      timeWindowEnd: body.timeWindowEnd,
      threshold: Number(body.threshold),
      duration: Number(body.duration),
      cooldown: Number(body.cooldown),
      speakerGroup: body.speakerGroup,
      volume: Number(body.volume),
      timezone: body.timezone,
    };

    let settings;
    if (existing) {
      settings = await prisma.alertSettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      settings = await prisma.alertSettings.create({
        data,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating alert settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

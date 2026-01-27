import { PrismaClient } from "@prisma/client";
import { AlertEngine } from "../src/lib/alertEngine";
import { triggerGridAlert } from "../src/lib/homeassistant";

const prisma = new PrismaClient();
const engine = new AlertEngine(10); // 10-second poll interval

const POLL_INTERVAL_MS = 10000; // 10 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollAndEvaluate(): Promise<void> {
  try {
    // Get alert settings
    const settings = await prisma.alertSettings.findFirst();
    
    if (!settings) {
      console.log("[Alert Poller] No alert settings found. Skipping evaluation.");
      return;
    }

    if (!settings.enabled) {
      console.log("[Alert Poller] Alerts are disabled. Skipping evaluation.");
      return;
    }

    // Get latest snapshot for combined grid import
    // Combined snapshots don't have a deviceId (or have a special identifier)
    // Based on the schema, we need to find the latest snapshot
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: "desc" },
      take: 1,
    });

    if (!latestSnapshot) {
      console.log("[Alert Poller] No snapshot data available.");
      await prisma.alertLog.create({
        data: {
          gridValue: 0,
          triggered: false,
          message: "No snapshot data available",
        },
      });
      return;
    }

    // Evaluate conditions
    const result = engine.evaluate(latestSnapshot.grid, {
      enabled: settings.enabled,
      timeWindowStart: settings.timeWindowStart,
      timeWindowEnd: settings.timeWindowEnd,
      threshold: settings.threshold,
      duration: settings.duration,
      cooldown: settings.cooldown,
      timezone: settings.timezone,
    });

    console.log(
      `[Alert Poller] Grid: ${latestSnapshot.grid.toFixed(2)} kW | ${result.reason} | State:`,
      result.state
    );

    if (result.shouldTrigger) {
      // Trigger Home Assistant alert
      console.log("[Alert Poller] 🔔 TRIGGERING ALERT!");
      
      const triggerResult = await triggerGridAlert({
        speakerGroup: settings.speakerGroup,
        volume: settings.volume,
      });

      // Log the trigger event
      await prisma.alertLog.create({
        data: {
          gridValue: latestSnapshot.grid,
          triggered: triggerResult.success,
          message: triggerResult.success
            ? `Alert triggered: Grid import ${latestSnapshot.grid.toFixed(2)} kW exceeded threshold ${settings.threshold} kW for ${settings.duration} minutes`
            : `Alert trigger failed: ${triggerResult.error}`,
        },
      });

      if (!triggerResult.success) {
        console.error(
          `[Alert Poller] Failed to trigger alert: ${triggerResult.error}`
        );
      }
    } else {
      // Log evaluation (only log every 10th check to avoid spam when below threshold)
      const shouldLog = Math.random() < 0.1; // 10% chance
      if (shouldLog || result.state.consecutiveMinutes > 0) {
        await prisma.alertLog.create({
          data: {
            gridValue: latestSnapshot.grid,
            triggered: false,
            message: result.reason,
          },
        });
      }
    }
  } catch (error) {
    console.error("[Alert Poller] Error during evaluation:", error);
    
    // Log error to database
    try {
      await prisma.alertLog.create({
        data: {
          gridValue: 0,
          triggered: false,
          message: `Error during evaluation: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      });
    } catch (logError) {
      console.error("[Alert Poller] Failed to log error:", logError);
    }
  }
}

async function main(): Promise<void> {
  console.log("[Alert Poller] Starting alert evaluation service...");
  console.log(`[Alert Poller] Poll interval: ${POLL_INTERVAL_MS / 1000} seconds`);
  console.log(`[Alert Poller] Engine state:`, engine.getState());

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n[Alert Poller] Received ${signal}, shutting down gracefully...`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Main polling loop
  while (true) {
    await pollAndEvaluate();
    await sleep(POLL_INTERVAL_MS);
  }
}

// Start the poller
main().catch(async (error) => {
  console.error("[Alert Poller] Fatal error:", error);
  await prisma.$disconnect();
  process.exit(1);
});

import { toZonedTime, format } from "date-fns-tz";

interface AlertSettings {
  enabled: boolean;
  timeWindowStart: string; // HH:mm format
  timeWindowEnd: string; // HH:mm format
  threshold: number; // kW
  duration: number; // minutes
  cooldown: number; // minutes
  timezone: string;
}

export interface EvaluationResult {
  shouldTrigger: boolean;
  reason: string;
  state: {
    consecutiveMinutes: number;
    inCooldown: boolean;
    inTimeWindow: boolean;
    currentGridValue: number;
  };
}

export class AlertEngine {
  private consecutiveMinutesAbove: number = 0;
  private lastTriggerTime: number | null = null;
  private cooldownUntil: number | null = null;
  private lastBelowThreshold: number = Date.now();
  private pollIntervalSeconds: number;

  constructor(pollIntervalSeconds: number = 10) {
    this.pollIntervalSeconds = pollIntervalSeconds;
  }

  /**
   * Evaluate whether an alert should be triggered based on current conditions
   */
  evaluate(
    gridImportKw: number,
    settings: AlertSettings
  ): EvaluationResult {
    const now = Date.now();
    
    // Check if alerts are enabled
    if (!settings.enabled) {
      return {
        shouldTrigger: false,
        reason: "Alerts are disabled",
        state: {
          consecutiveMinutes: this.consecutiveMinutesAbove,
          inCooldown: false,
          inTimeWindow: false,
          currentGridValue: gridImportKw,
        },
      };
    }

    // Check if we're in the configured time window
    const inTimeWindow = this.isInTimeWindow(settings);
    if (!inTimeWindow) {
      // Reset consecutive counter when outside time window
      this.consecutiveMinutesAbove = 0;
      return {
        shouldTrigger: false,
        reason: "Outside configured time window",
        state: {
          consecutiveMinutes: 0,
          inCooldown: false,
          inTimeWindow: false,
          currentGridValue: gridImportKw,
        },
      };
    }

    // Check if we're in cooldown period
    const inCooldown = this.cooldownUntil !== null && now < this.cooldownUntil;
    if (inCooldown) {
      return {
        shouldTrigger: false,
        reason: `In cooldown period (until ${new Date(this.cooldownUntil!).toLocaleTimeString()})`,
        state: {
          consecutiveMinutes: this.consecutiveMinutesAbove,
          inCooldown: true,
          inTimeWindow: true,
          currentGridValue: gridImportKw,
        },
      };
    }

    // Check if grid import exceeds threshold
    if (gridImportKw > settings.threshold) {
      // Increment consecutive time above threshold
      this.consecutiveMinutesAbove += this.pollIntervalSeconds / 60;

      // Check if duration threshold is met
      if (this.consecutiveMinutesAbove >= settings.duration) {
        // Trigger alert
        this.lastTriggerTime = now;
        this.cooldownUntil = now + settings.cooldown * 60 * 1000;
        this.consecutiveMinutesAbove = 0; // Reset counter after trigger

        return {
          shouldTrigger: true,
          reason: `Grid import (${gridImportKw.toFixed(2)} kW) exceeded threshold (${settings.threshold} kW) for ${settings.duration} minutes`,
          state: {
            consecutiveMinutes: settings.duration,
            inCooldown: false,
            inTimeWindow: true,
            currentGridValue: gridImportKw,
          },
        };
      }

      // Still accumulating consecutive time
      return {
        shouldTrigger: false,
        reason: `Above threshold for ${this.consecutiveMinutesAbove.toFixed(1)} of ${settings.duration} minutes`,
        state: {
          consecutiveMinutes: this.consecutiveMinutesAbove,
          inCooldown: false,
          inTimeWindow: true,
          currentGridValue: gridImportKw,
        },
      };
    } else {
      // Grid import is below threshold - reset counter
      this.consecutiveMinutesAbove = 0;
      this.lastBelowThreshold = now;

      return {
        shouldTrigger: false,
        reason: `Grid import (${gridImportKw.toFixed(2)} kW) below threshold (${settings.threshold} kW)`,
        state: {
          consecutiveMinutes: 0,
          inCooldown: false,
          inTimeWindow: true,
          currentGridValue: gridImportKw,
        },
      };
    }
  }

  /**
   * Check if current time is within the configured time window
   */
  private isInTimeWindow(settings: AlertSettings): boolean {
    try {
      const now = new Date();
      const nowInTz = toZonedTime(now, settings.timezone);
      const currentTime = format(nowInTz, "HH:mm", { timeZone: settings.timezone });

      // Handle cases where end time is before start time (crosses midnight)
      if (settings.timeWindowEnd < settings.timeWindowStart) {
        // e.g., 22:00 to 06:00
        return (
          currentTime >= settings.timeWindowStart ||
          currentTime <= settings.timeWindowEnd
        );
      } else {
        // Normal case: start before end
        return (
          currentTime >= settings.timeWindowStart &&
          currentTime <= settings.timeWindowEnd
        );
      }
    } catch (error) {
      console.error("Error checking time window:", error);
      // Default to true if there's an error (fail open)
      return true;
    }
  }

  /**
   * Reset the engine state (useful for testing)
   */
  reset(): void {
    this.consecutiveMinutesAbove = 0;
    this.lastTriggerTime = null;
    this.cooldownUntil = null;
    this.lastBelowThreshold = Date.now();
  }

  /**
   * Get current engine state (for debugging)
   */
  getState() {
    return {
      consecutiveMinutesAbove: this.consecutiveMinutesAbove,
      lastTriggerTime: this.lastTriggerTime
        ? new Date(this.lastTriggerTime).toISOString()
        : null,
      cooldownUntil: this.cooldownUntil
        ? new Date(this.cooldownUntil).toISOString()
        : null,
      lastBelowThreshold: new Date(this.lastBelowThreshold).toISOString(),
    };
  }
}

interface AlertSettings {
  speakerGroup: string;
  volume: number;
}

interface TriggerResult {
  success: boolean;
  error?: string;
}

// Rate limiting state
let lastCallTime = 0;
const MIN_CALL_INTERVAL_MS = 5000; // 5 seconds between calls

/**
 * Triggers the grid alert ding on Home Assistant Google Home speaker group
 */
export async function triggerGridAlert(
  settings: AlertSettings
): Promise<TriggerResult> {
  // Rate limiting check
  const now = Date.now();
  if (now - lastCallTime < MIN_CALL_INTERVAL_MS) {
    console.warn("Rate limit: Too many alert triggers");
    return {
      success: false,
      error: "Rate limit exceeded. Please wait before triggering another alert.",
    };
  }

  const haIp = process.env.HA_TAILSCALE_IP;
  const haToken = process.env.HA_TOKEN;

  if (!haIp || !haToken) {
    console.error("Missing HA_TAILSCALE_IP or HA_TOKEN environment variables");
    return {
      success: false,
      error: "Home Assistant not configured. Please set HA_TAILSCALE_IP and HA_TOKEN.",
    };
  }

  const url = `http://${haIp}:8123/api/services/script/turn_on`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_id: "script.play_grid_alert_ding",
        variables: {
          target_group: settings.speakerGroup,
          alert_volume: settings.volume,
        },
      }),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `Home Assistant API error: ${response.status} ${response.statusText}`,
        errorText
      );

      // Retry once after 2 seconds
      console.log("Retrying in 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const retryResponse = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${haToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: "script.play_grid_alert_ding",
          variables: {
            target_group: settings.speakerGroup,
            alert_volume: settings.volume,
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!retryResponse.ok) {
        return {
          success: false,
          error: `Home Assistant API error: ${retryResponse.status}`,
        };
      }
    }

    lastCallTime = now;
    console.log(
      `Alert triggered successfully on ${settings.speakerGroup} at volume ${settings.volume}`
    );

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("Home Assistant request timed out");
        return {
          success: false,
          error: "Request to Home Assistant timed out",
        };
      }
      console.error("Error triggering Home Assistant alert:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Unknown error triggering alert",
    };
  }
}

/**
 * Test function for the alert button
 */
export async function testAlert(
  settings: AlertSettings
): Promise<TriggerResult> {
  console.log("Test alert triggered");
  return triggerGridAlert(settings);
}

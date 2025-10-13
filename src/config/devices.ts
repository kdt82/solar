export type FroniusDevice = {
  id: string;
  label: string;
  url: string;
  headers?: Record<string, string>;
};

// Helper functions that evaluate environment variables at runtime
function getNelsonHeaders(): Record<string, string> | undefined {
  const cfId = process.env.FRONIUS_NELSONS_CF_ID;
  const cfSecret = process.env.FRONIUS_NELSONS_CF_SECRET;
  
  if (cfId && cfSecret) {
    return {
      "CF-Access-Client-Id": cfId,
      "CF-Access-Client-Secret": cfSecret,
    };
  }
  return undefined;
}

function getGrannyHeaders(): Record<string, string> | undefined {
  const cfId = process.env.FRONIUS_GRANNY_CF_ID;
  const cfSecret = process.env.FRONIUS_GRANNY_CF_SECRET;
  
  if (cfId && cfSecret) {
    return {
      "CF-Access-Client-Id": cfId,
      "CF-Access-Client-Secret": cfSecret,
    };
  }
  return undefined;
}

/**
 * Gets the list of Fronius devices to poll.
 * This function evaluates environment variables at runtime, ensuring
 * Railway environment variables are available when the function is called.
 */
export function getDevices(): FroniusDevice[] {
  return [
    {
      id: "nelsons-house",
      label: "Nelsons House",
      url: process.env.FRONIUS_NELSONS_URL ?? "http://192.168.50.97",
      headers: getNelsonHeaders(),
    },
    {
      id: "granny-flat",
      label: "Granny Flat",
      url: process.env.FRONIUS_GRANNY_URL ?? "http://192.168.50.27",
      headers: getGrannyHeaders(),
    },
  ];
}

/**
 * Gets the property label for display.
 * This function evaluates environment variables at runtime.
 */
export function getPropertyLabel(): string {
  return process.env.FRONIUS_PROPERTY_LABEL ?? "5 Oxford Road";
}

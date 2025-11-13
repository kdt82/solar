import { SocksProxyAgent } from "socks-proxy-agent";

/**
 * Custom fetch function that routes through Tailscale's SOCKS5 proxy when enabled.
 * Falls back to standard fetch when Tailscale is not in use.
 */
export function createProxiedFetch(): typeof fetch {
  const tailscaleEnabled = process.env.TAILSCALE_ENABLED !== "0";
  const socksProxy = "socks5://localhost:1055";

  if (!tailscaleEnabled) {
    console.log("[fetch] Tailscale disabled, using standard fetch");
    return fetch;
  }

  console.log(`[fetch] Tailscale enabled, routing through SOCKS5 proxy: ${socksProxy}`);
  
  // Create a SOCKS proxy agent
  const agent = new SocksProxyAgent(socksProxy);

  // Return a wrapped fetch function that uses the proxy agent
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const fetchInit: RequestInit = {
      ...init,
      // @ts-expect-error - agent is valid but types don't match perfectly
      dispatcher: agent,
    };

    return fetch(input, fetchInit);
  };
}

// Export a singleton instance
export const proxiedFetch = createProxiedFetch();


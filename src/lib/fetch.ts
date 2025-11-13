import { SocksProxyAgent } from "socks-proxy-agent";
import { fetch as undiciFetch } from "undici";

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
  
  // Create a SOCKS proxy agent for undici
  const agent = new SocksProxyAgent(socksProxy);

  // Return a wrapped fetch function that uses undici with the SOCKS proxy
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      
      // Use undici's fetch with the dispatcher (agent)
      const response = await undiciFetch(url, {
        ...init,
        // @ts-expect-error - dispatcher is valid for undici but types don't align perfectly
        dispatcher: agent,
      });

      return response as Response;
    } catch (error) {
      console.error("[fetch] SOCKS5 proxy fetch failed:", error);
      throw error;
    }
  };
}

// Export a singleton instance
export const proxiedFetch = createProxiedFetch();


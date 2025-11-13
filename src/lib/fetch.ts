import { SocksClient } from "socks";
import * as net from "net";

/**
 * Custom fetch function that routes through Tailscale's SOCKS5 proxy when enabled.
 * Falls back to standard fetch when Tailscale is not in use.
 */
export function createProxiedFetch(): typeof fetch {
  const tailscaleEnabled = process.env.TAILSCALE_ENABLED !== "0";

  if (!tailscaleEnabled) {
    console.log("[fetch] Tailscale disabled, using standard fetch");
    return fetch;
  }

  console.log(`[fetch] Tailscale enabled, will route through SOCKS5 proxy: socks5://localhost:1055`);
  
  // Return a wrapped fetch function that creates a SOCKS tunnel per request
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const parsedUrl = new URL(urlString);
    
    try {
      console.log(`[fetch] Attempting SOCKS5 proxied request to: ${urlString}`);
      
      // Create SOCKS connection
      const socksConnection = await SocksClient.createConnection({
        proxy: {
          host: "localhost",
          port: 1055,
          type: 5,
        },
        command: "connect",
        destination: {
          host: parsedUrl.hostname,
          port: parseInt(parsedUrl.port) || (parsedUrl.protocol === "https:" ? 443 : 80),
        },
      });

      // Use the SOCKS socket with fetch via a custom agent
      const controller = new AbortController();
      const signal = init?.signal || controller.signal;
      
      // Create a simple HTTP request through the SOCKS tunnel
      const method = init?.method || "GET";
      const headers = new Headers(init?.headers);
      
      const requestLine = `${method} ${parsedUrl.pathname}${parsedUrl.search} HTTP/1.1\r\n`;
      const hostHeader = `Host: ${parsedUrl.hostname}\r\n`;
      const connectionHeader = `Connection: close\r\n`;
      
      let headersString = "";
      headers.forEach((value, key) => {
        headersString += `${key}: ${value}\r\n`;
      });
      
      const httpRequest = requestLine + hostHeader + headersString + connectionHeader + "\r\n";
      
      return new Promise((resolve, reject) => {
        const socket = socksConnection.socket as net.Socket;
        let responseData = Buffer.alloc(0);
        
        socket.on("data", (chunk: Buffer) => {
          responseData = Buffer.concat([responseData, chunk]);
        });
        
        socket.on("end", () => {
          try {
            // Find the header/body separator
            const separatorIndex = responseData.indexOf(Buffer.from("\r\n\r\n"));
            if (separatorIndex === -1) {
              throw new Error("Invalid HTTP response: no header/body separator found");
            }
            
            // Parse headers
            const headBuffer = responseData.subarray(0, separatorIndex);
            const headString = headBuffer.toString('utf-8');
            const [statusLine, ...headerLines] = headString.split("\r\n");
            const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
            const status = statusMatch ? parseInt(statusMatch[1]) : 200;
            
            const responseHeaders: Record<string, string> = {};
            headerLines.forEach((line) => {
              const colonIndex = line.indexOf(":");
              if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                responseHeaders[key.toLowerCase()] = value;
              }
            });
            
            // Extract body based on Content-Length if present
            const bodyStart = separatorIndex + 4; // Skip "\r\n\r\n"
            let bodyBuffer: Buffer;
            
            if (responseHeaders['content-length']) {
              const contentLength = parseInt(responseHeaders['content-length']);
              bodyBuffer = responseData.subarray(bodyStart, bodyStart + contentLength);
            } else {
              // No Content-Length, take everything after headers
              bodyBuffer = responseData.subarray(bodyStart);
            }
            
            const bodyString = bodyBuffer.toString('utf-8');
            
            console.log(`[fetch] ✓ Success: ${urlString} - Status: ${status}`);
            
            resolve(new Response(bodyString, {
              status,
              headers: responseHeaders,
            }));
          } catch (parseError) {
            console.error(`[fetch] Error parsing response:`, parseError);
            reject(parseError);
          }
        });
        
        socket.on("error", (error) => {
          console.error(`[fetch] ✗ Socket error:`, error);
          reject(error);
        });
        
        signal.addEventListener("abort", () => {
          socket.destroy();
          reject(new Error("Request aborted"));
        });
        
        socket.write(httpRequest);
      });
      
    } catch (error) {
      console.error(`[fetch] ✗ SOCKS5 proxy fetch FAILED for ${urlString}`);
      console.error(`[fetch] Error type: ${error?.constructor?.name}`);
      console.error(`[fetch] Error message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[fetch] Error stack:`, error instanceof Error ? error.stack : 'N/A');
      
      if (error && typeof error === 'object') {
        console.error(`[fetch] Error details:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      }
      
      throw error;
    }
  };
}

// Export a singleton instance
export const proxiedFetch = createProxiedFetch();


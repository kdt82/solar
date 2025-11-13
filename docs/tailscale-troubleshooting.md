# Tailscale Troubleshooting Guide

## Summary of Railway Deployment Issues (November 2024)

### Problem
After switching ISPs, the Railway deployment could connect to one Fronius inverter (Nelson's House) but not the other (Granny Flat), despite both being on the same local network and reachable via Tailscale.

### Root Cause
The issue was **NOT related to the ISP change** - it was a bug in our custom HTTP response parser.

**Technical Details:**
- Nelson's House inverter sends HTTP responses with `Content-Length` headers
- Granny Flat inverter uses **HTTP chunked transfer encoding** instead
- Our custom SOCKS5 fetch implementation (`src/lib/fetch.ts`) only handled `Content-Length` responses
- Chunked responses include hex size markers (e.g., `463\r\n`) before each chunk of data
- Our parser was including these size markers in the JSON body, causing parse errors:
  ```
  Error: Unexpected non-whitespace character after JSON at position 5 (line 2 column 1)
  ```

### Why This Worked Before
Previously, we used standard Node.js HTTP libraries that automatically handled chunked encoding. When we implemented custom SOCKS5 proxy routing for Tailscale, we had to write a raw HTTP parser that initially only supported `Content-Length` headers.

### Solution
Updated `src/lib/fetch.ts` to properly parse HTTP chunked transfer encoding:
1. Detect `Transfer-Encoding: chunked` header
2. Parse chunk size markers (hex format)
3. Extract only the data, skipping size markers
4. Concatenate all chunks into clean response body

**Commit:** `0c60dfa` - "Add HTTP chunked transfer encoding support for Granny Flat inverter"

---

## Tailscale + Railway Setup Overview

### Architecture
```
Railway Container (Alpine Linux)
  ↓ runs Tailscale in userspace mode
  ↓ SOCKS5 proxy on localhost:1055
  ↓ routes traffic through VPN tunnel
  ↓ via DERP relay (San Francisco)
  ↓ to Raspberry Pi (subnet router)
  ↓ to local network (192.168.50.0/24)
  ↓ to Fronius inverters
```

### Key Components

1. **Tailscale on Railway**
   - Runs in userspace networking mode (`--tun=userspace-networking`)
   - Provides SOCKS5 proxy on `localhost:1055`
   - Uses ephemeral auth keys with `tag:railway`

2. **Raspberry Pi Subnet Router**
   - Advertises local network routes (`192.168.50.0/24`)
   - Runs 24/7 at home
   - Hostname: `solar-subnet-router`

3. **Custom SOCKS5 Fetch** (`src/lib/fetch.ts`)
   - Intercepts all HTTP requests from the application
   - Routes them through Tailscale's SOCKS5 proxy
   - Manually constructs HTTP requests and parses responses
   - Required because Node.js `fetch()` doesn't natively support SOCKS5 proxies

4. **Tailscale ACL**
   - Auto-approves subnet routes for devices with `tag:railway`
   - Allows Railway containers to access local network

---

## Troubleshooting Steps

### If Inverters Stop Working After ISP Change

**Step 1: Check if it's actually an ISP issue**

SSH to Raspberry Pi and test connectivity:
```bash
# Check if Pi can reach Railway
sudo tailscale ping solar-railway-4

# Check if Pi can reach Tailscale control plane
curl -v https://controlplane.tailscale.com/

# Check Tailscale network diagnostics
sudo tailscale netcheck
```

**Expected results:**
- Pi should be able to ping Railway via DERP relay
- Should reach control plane over HTTPS (port 443)
- Should show UDP: true, DERP latency values

**If any fail:** ISP may be blocking VPN traffic. Contact ISP or try alternative configuration.

---

**Step 2: Check Railway connectivity**

Look for these in Railway logs:
```
✓ Tailscale connected! Found subnet router in peer list.
[SOCKS5 Test] ✓ SOCKS5 proxy CAN route to subnet!
```

**If missing:** Tailscale initialization failed on Railway.

---

**Step 3: Check for HTTP parsing issues**

Look for errors like:
```
Error fetching data from http://192.168.50.X: Unexpected non-whitespace character after JSON
```

This indicates an HTTP parsing problem, not a network issue.

Check Railway logs for:
```
[fetch] Using Content-Length: ...
[fetch] No Content-Length header, taking all data from ...
```

**If response body starts with numbers (e.g., `463`)**: Chunked encoding issue. Verify `src/lib/fetch.ts` has chunked encoding support.

---

### If ISP IS Blocking VPN Traffic

Some ISPs block:
- UDP traffic on non-standard ports
- WireGuard protocol
- VPN detection via DPI (Deep Packet Inspection)

**Workarounds:**

1. **DERP-only mode** (already working in our setup)
   - Tailscale falls back to DERP relays over HTTPS (port 443)
   - This is already happening: `pong via DERP(sfo)` in logs

2. **Force DERP-only on Pi** (if needed)
   ```bash
   sudo tailscale up \
     --authkey=YOUR_KEY \
     --hostname=solar-subnet-router \
     --advertise-routes=192.168.50.0/24 \
     --accept-dns=false \
     --force-reauth \
     --netfilter-mode=off
   ```

3. **Check router/firewall**
   - Ensure UDP ports aren't blocked on home router
   - Check if UPnP is enabled (helps with NAT traversal)

---

## Common Issues & Solutions

### Issue: "No route to 192.168.50.0/24 found!"

**Cause:** Userspace networking doesn't modify system routing table. This is **expected** and **normal**.

**Solution:** Ignore this diagnostic. Traffic routes through SOCKS5 proxy, not system routes.

---

### Issue: "Failed to send handshake initiation: no UDP or DERP addr"

**Cause:** Railway container can't establish connection to Pi.

**Check:**
1. Is Pi online and connected to Tailscale?
   ```bash
   sudo tailscale status
   ```

2. Are routes approved in Tailscale admin console?
   - Go to https://login.tailscale.com/admin/machines
   - Click `solar-subnet-router`
   - Verify `192.168.50.0/24` is approved

3. Is ACL configured correctly?
   - `tagOwners` includes `tag:railway`
   - `autoApprovers` allows `tag:railway` to use routes

---

### Issue: "Socks5 proxy rejected connection - Failure"

**Cause:** SOCKS5 proxy can't route to destination.

**Check:**
1. Is destination IP in advertised subnet? (must be `192.168.50.X`)
2. Is subnet route approved?
3. Can Pi reach the destination?
   ```bash
   # From Pi
   curl http://192.168.50.97
   ```

---

### Issue: Application works locally but not on Railway

**Cause:** `TAILSCALE_ENABLED` environment variable.

**Solution:** 
- Railway: `TAILSCALE_ENABLED=1`
- Local: `TAILSCALE_ENABLED=0` (in `.env.local`)

---

## Local Development Setup

To test locally **without** Tailscale:

1. Create `.env.local`:
   ```env
   # Disable Tailscale for local development
   TAILSCALE_ENABLED=0
   
   # Use direct local network access
   FRONIUS_NELSONS_URL=http://192.168.50.97
   FRONIUS_GRANNY_URL=http://192.168.50.27
   ```

2. Ensure you're on the same network as the inverters

3. Run: `npm run dev`

---

## Monitoring & Diagnostics

### Check Railway Deployment Health

Key log lines to look for:
```
✓ Tailscale connected! Found subnet router in peer list.
[SOCKS5 Test] ✓ SOCKS5 proxy CAN route to subnet!
[fetch] ✓ Success: http://192.168.50.97/... - Status: 200
```

### Check Raspberry Pi Health

```bash
# Tailscale status
sudo tailscale status

# Network diagnostics
sudo tailscale netcheck

# Check if routes are being advertised
sudo tailscale status | grep -A5 "advertised routes"

# System logs
sudo journalctl -u tailscaled -n 50
```

### Tailscale Admin Console

https://login.tailscale.com/admin/machines

Check:
- All devices show as "Connected"
- Subnet routes are "Approved"
- No unusual offline/online cycling

---

## Emergency Recovery

### If nothing works, regenerate everything:

1. **Generate new Tailscale auth key**
   - Go to https://login.tailscale.com/admin/settings/keys
   - Create new auth key with:
     - Ephemeral: ✓
     - Reusable: ✓
     - Tags: `tag:railway`

2. **Update Railway environment variable**
   - Update `TAILSCALE_AUTH_KEY` in Railway project settings
   - Trigger new deployment

3. **Restart Pi Tailscale**
   ```bash
   sudo tailscale down
   sudo tailscale up \
     --authkey=YOUR_NEW_KEY \
     --hostname=solar-subnet-router \
     --advertise-routes=192.168.50.0/24 \
     --accept-dns=false
   ```

4. **Check ACL** at https://login.tailscale.com/admin/acls

---

## Files to Check When Troubleshooting

| File | Purpose | Check For |
|------|---------|-----------|
| `src/lib/fetch.ts` | SOCKS5 fetch implementation | HTTP parsing logic, chunked encoding support |
| `start.sh` | Tailscale initialization | Connection wait logic, SOCKS5 proxy export |
| `Dockerfile` | Container setup | Tailscale installation, entrypoint |
| `railway.toml` | Railway config | Start command, environment variables |
| `.env.local` | Local dev config | `TAILSCALE_ENABLED=0` |

---

## Contact & References

- **Tailscale Documentation:** https://tailscale.com/kb/
- **Fronius API Documentation:** Inverter web interface → API documentation
- **Railway Logs:** `railway logs` or dashboard

---

## Version History

### November 13, 2024
- **Issue:** Granny Flat inverter failing with JSON parse errors
- **Root Cause:** HTTP chunked transfer encoding not supported
- **Fix:** Added chunked encoding parser to `src/lib/fetch.ts`
- **Impact:** Both inverters now working on Railway deployment

### November 12-13, 2024
- **Issue:** Railway deployment couldn't connect to local inverters
- **Root Cause:** Multiple issues
  1. Missing Tailscale installation in Dockerfile
  2. `railway.toml` overriding startup command
  3. Insufficient wait time for Tailscale connection
  4. ACL not configured for auto-approval
- **Fix:** Complete Tailscale integration setup
- **Impact:** Established successful Railway → Tailscale → Pi → Inverters connection


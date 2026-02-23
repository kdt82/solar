# UI Overhaul, CI/CD Setup & Tailscale Fixes

**Date:** February 23, 2026  
**Status:** ✅ Completed

---

## Overview

Major session covering four areas:
1. Hinen Solar Battery integration + `UnifiedEnergyFlow` animated SVG dashboard
2. GitHub Actions CI/CD pipeline to VPS
3. Favicon/PWA manifest update
4. Tailscale auth key expiry + container crash fixes

---

## 1. Hinen Solar Battery Integration

### New files

**`src/lib/hinen.ts`**  
Typed API client for the Hinen proxy running on the Pi (`http://192.168.50.140:5555`).

Key exports:
- Types: `HinenStatus`, `HinenBattery`, `HinenGrid`, `HinenSolar`, `HinenRawProperties`
- Functions: `getHinenStatus()`, `getHinenStatistics()`, `getHinenDevices()`, `deriveNelsonsFlows()`
- Base URL from `HINEN_PROXY_URL` env var (fallback: `http://192.168.50.140:5555`)

**`src/app/api/hinen/route.ts`**  
Server-side proxy to the Hinen endpoint.  
- `force-dynamic` export (no caching)
- Returns 503 if proxy is unreachable

**`src/hooks/useHinenData.ts`**  
SWR hook polling `/api/hinen` every 5s.  
Export: `useHinenData()` → `HinenStatus`

### Inverter hardware

- **Nelson's House**: Sungrow SH6KL-SG1-EU hybrid inverter
- **Battery**: 30 kWh capacity
- **Proxy Pi**: `192.168.50.140:5555` (local) / `100.103.219.54:5555` (Tailscale)

### Key Hinen raw properties used

| Property | Meaning |
|---|---|
| `GenerationPower` | Solar generation (W) |
| `TotalLoadPower` | Property load (W) |
| `BatteryPower` | +ve = charging, -ve = discharging (W) |
| `GridTotalPower` | +ve = import, -ve = export (W) |
| `BatCapacity` | Battery capacity (Wh) |

---

## 2. UnifiedEnergyFlow Component

Complete rewrite of `src/components/EnergyFlow.tsx` (~567 lines).

### Architecture

6-node SVG diagram in a `viewBox="0 0 870 570"`:

| Node | Position | Data source |
|---|---|---|
| Nelson's Solar | Top-left | Hinen `GenerationPower` |
| Granny Solar | Top-right | Fronius Granny Flat |
| Battery | Mid-left | Hinen `BatteryPower` + `BatCapacity` |
| Grid | Mid-right | Combined Nelson + Granny |
| Nelson's House | Bottom-left | Hinen `TotalLoadPower` |
| Granny Flat | Bottom-right | Fronius Granny Flat |

### Animated flows

Uses SVG `<animateMotion>` + `<mpath>` — 10 named bezier paths defined in `<defs>`:

| Path ID | Flow |
|---|---|
| `p-nsolar-battery` | Nelson Solar → Battery |
| `p-nsolar-nhouse` | Nelson Solar → Nelson House |
| `p-nsolar-grid` | Nelson Solar → Grid (arc over top) |
| `p-battery-nhouse` | Battery → Nelson House |
| `p-battery-grid` | Battery → Grid |
| `p-grid-battery` | Grid → Battery |
| `p-grid-nhouse` | Grid → Nelson House |
| `p-grid-ghouse` | Grid → Granny Flat |
| `p-gsolar-ghouse` | Granny Solar → Granny Flat |
| `p-gsolar-grid` | Granny Solar → Grid |

Dot speed/count scales with power level (see `dotCfg()` function).

### Flow colours

| Colour | Meaning |
|---|---|
| Amber `#f59e0b` | Solar generation |
| Green `#4ade80` | Battery discharge / grid export |
| Blue `#60a5fa` | Grid → Battery charging |
| Red `#f87171` | Grid import |

### Theme adaptation

After initial implementation used hardcoded dark colours. Fixed Feb 23:
- Background: `var(--panel)` (white in light, navy gradient in dark)
- Borders/dividers: `var(--panel-border)`
- SVG text fills: `var(--text)`, `var(--text-soft)`, `var(--muted)`
- Stat pills: `color: var(--text)`
- Combined badge: amber in dark, darker amber in light

### Legacy shim

`PropertyEnergyFlow` exported as `null` — kept for any stale imports.

---

## 3. GitHub Actions CI/CD

**File:** `.github/workflows/deploy.yml`

### Pipeline steps

```
1. Checkout code (sparse, no LFS)
2. SSH to root@194.163.146.126 port 22
3. cd /opt/apps/inverter
4. git pull origin main
5. docker compose build --no-cache
6. docker compose up -d --remove-orphans
7. Poll until container running + node -e "process.exit(0)" succeeds (24× 5s)
8. docker compose exec -T inverter npx prisma migrate deploy
9. docker image prune -f
```

### SSH key setup

- Key pair: `vps-deploy-key` (ed25519)
- Private key stored in GitHub secret `VPS_SSH_KEY`
- Public key added to VPS `~/.ssh/authorized_keys`
- `vps-deploy-key` removed from git tracking via `git rm --cached`, added to `.gitignore`

### Issues fixed

**Wrong deploy path:** Was `/opt/app`, corrected to `/opt/apps/inverter`.

**Exit 137 (OOM):** `prisma migrate deploy` ran immediately after `docker compose up -d`, before Node.js was ready inside the container. Fixed by adding a readiness poll loop (24× 5s intervals checking `docker compose exec -T inverter node -e "process.exit(0)"`).

---

## 4. Favicon & PWA Manifest

### New files in `/public/`

| File | Purpose |
|---|---|
| `favicon.ico` | Browser tab icon (48×48) |
| `favicon-96x96.png` | PNG favicon |
| `favicon.svg` | SVG favicon |
| `apple-touch-icon.png` | iOS home screen icon (180×180) |
| `site.webmanifest` | PWA manifest (replaces `manifest.json`) |
| `web-app-manifest-192x192.png` | PWA icon small |
| `web-app-manifest-512x512.png` | PWA icon large |

### `src/app/layout.tsx` metadata changes

```ts
manifest: "/site.webmanifest",
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "48x48" },
    { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    { url: "/favicon.svg", type: "image/svg+xml" },
  ],
  shortcut: "/favicon.ico",
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
},
appleWebApp: { title: "SolarSystem", ... }
```

### `site.webmanifest` fix

File was generated with `/public/web-app-manifest-...` paths — wrong for Next.js. Fixed to `/web-app-manifest-192x192.png` (root URL, no `/public/` prefix).

---

## 5. Tailscale Fixes

### Root cause

Tailscale auth key (`tskey-auth-k6ovuZVaKp11CNTRL-...`) was a **single-use** key — it got consumed on first deploy and all subsequent attempts failed with `invalid key: API key does not exist`.

### Fix 1 — Non-fatal failure (commit `eef750f`)

Changed `start.sh` from:
```sh
if ! tailscale up ${TS_FLAGS}; then
  exit 1   # killed the whole container
fi
```
To continuing with `TAILSCALE_ENABLED=0` on failure.

### Fix 2 — Skip proxy setup on failure (commit `525a551`)

The first fix had a logic gap: the `TAILSCALE_ENABLED=0` flag was set but the script continued into the wait loop and proxy config block (`export ALL_PROXY=socks5://...`), routing all Node.js traffic through a broken Tailscale tunnel.

Fixed by wrapping the post-`tailscale up` block in a second `if [ "${TAILSCALE_ENABLED}" != "0" ]` guard:

```sh
if ! tailscale up ${TS_FLAGS}; then
  echo "tailscale up failed; continuing without Tailscale" >&2
  TAILSCALE_ENABLED=0
fi

if [ "${TAILSCALE_ENABLED}" != "0" ]; then
  # wait loop, proxy setup, diagnostics...
fi  # end inner
fi  # end outer
```

**Result:** When Tailscale auth fails, the app starts normally — solar device data from the local network is unavailable, but the site stays up.

### New key requirements

Generate at `login.tailscale.com/admin/settings/keys`:
- **Reusable** ✓ (survives container restarts)
- **Ephemeral** ✓ (dead containers auto-remove from device list)

Update on VPS (not in git — `.env` is gitignored):
```bash
ssh root@194.163.146.126
nano /opt/apps/inverter/.env  # update TAILSCALE_AUTH_KEY=
docker compose -f /opt/apps/inverter/docker-compose.yml restart inverter
```

---

## 6. Data Card Bug Fix

**Symptom:** Property Consumption showing as negative (e.g., `-714 W`) in the PowerCard metrics list.

**Cause:** Fronius returns consumption as a negative value in the combined power flow response. The value was rendered raw.

**Fix:** Applied `Math.abs(snapshot.consumption)` in `PowerCard` metrics array.

---

## Commit History (this session)

| Commit | Description |
|---|---|
| `eef750f` | fix: make Tailscale failure non-fatal |
| `f424ecd` | feat: update favicon and PWA manifest |
| `8fe0feb` | fix: make energy flow theme-adaptive, fix negative consumption |
| `525a551` | fix: properly skip Tailscale proxy setup when tailscale up fails |

---

## Environment Variables (full reference)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | NextAuth session secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONIUS_NELSONS_URL` | Fronius inverter at Nelson's House |
| `FRONIUS_GRANNY_URL` | Fronius inverter at Granny Flat |
| `FRONIUS_PROPERTY_LABEL` | Display label |
| `FRONIUS_TIMEOUT_MS` | HTTP timeout for Fronius requests |
| `NEXT_PUBLIC_MAX_GENERATION` | Max generation (W) for gauge scaling |
| `NEXTAUTH_URL` | Public app URL |
| `PORT` | App port (3000) |
| `TAILSCALE_AUTH_KEY` | Must be **reusable + ephemeral** |
| `TAILSCALE_ENABLED` | Set to `0` to disable entirely |
| `HINEN_PROXY_URL` | Pi proxy local URL |
| `HINEN_PROXY_TAILSCALE` | Pi proxy Tailscale URL |
| `HINEN_BATTERY_MAX_CHARGE_W` | SH6KL max charge rate (5000W) |
| `HINEN_BATTERY_CAPACITY_WH` | Battery capacity (30720 Wh = 30 kWh) |

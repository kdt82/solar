# Dashboard Simplification, Proxy Caching & UI Fixes

**Date:** February 24, 2026  
**Status:** ✅ Completed

---

## Overview

Major session covering five areas:
1. Replace complex SVG energy diagram with `SimplifiedDashboard` card layout
2. Grid import/export label logic (sign fix + idle threshold)
3. Light mode CSS fixes + `DataSummaryTable` component + Performance History accordion
4. Hinen Pi proxy 30-second cache + `useHinenData` poll interval alignment
5. Favicon file-convention fix

---

## 1. SimplifiedDashboard Component

### Motivation

`UnifiedEnergyFlow` was a complex SVG (~567 lines) with many data paths and hard-to-read labels on mobile. Replaced with a portrait-friendly 3-row card layout.

### Layout (top → bottom)

| Row | Content |
|---|---|
| 1 | Solar generation circles — Nelsons House · Granny Flat |
| 2 | Battery SOC card · System hub (with flow connectors) · Grid card |
| 3 | Property usage circles — Nelsons House · Granny Flat |

### Files

- **`src/components/SimplifiedDashboard.tsx`** — new main dashboard component
- **`src/components/SimplifiedDashboard.module.css`** — all layout + animation styles

### Props

```ts
interface SimplifiedDashboardProps {
  nelsonSolarW: number;
  grannySolarW: number;
  nelsonLoadW: number;
  grannyLoadW: number;
  batteryW: number;      // +ve = charging, -ve = discharging
  batterySoc: number;    // raw SoC % from Hinen (0–100)
  gridW: number;         // +ve = importing, -ve = exporting
}
```

### Battery SOC display adjustment

Hardware reserves 12% for cell protection. Display formula removes this reserve so the user sees 0–100% of *usable* capacity:

```ts
const displayedSoc = Math.max(0, Math.round(((batterySoc - 12) / 88) * 100));
```

### FlowConnector component

Animated dot connector between Battery↔System and System↔Grid.

```ts
direction: "left" | "right" | "idle"
color: string
```

- 3 dots, 1.2 s cycle, staggered 0.4 s apart
- `flowRight` keyframes: `left: -10px → right: -10px` across container
- `flowLeft` keyframes: reverse direction
- `idle`: static dots, no animation

### Grid direction convention (confirmed from `src/lib/hinen.ts`)

```
gridW > 0  →  importing from grid
gridW < 0  →  exporting to grid
```

---

## 2. Grid Idle Threshold

Initially the grid card switched between "Importing" / "Exporting" at ±10 W, causing flickering labels at standby loads.

Raised threshold to **±250 W** — anything within that band shows **Idle** while watts continue to update numerically.

```ts
const isExporting = gridW < -250;
const isImporting = gridW > 250;
const gridLabel   = isExporting ? "Exporting" : isImporting ? "Importing" : "Idle";
```

Flow connector dots also reflect this — no animation in the idle band.

**Commit:** `0af50c1`

---

## 3. Light Mode CSS Fix

Previous circle styling used light tinted backgrounds which looked washed-out in light mode.

Fixed by switching to **solid colours with white text** (matching dark mode vibrancy):

```css
.solarCircle {
  background: #f59e0b;
  border: 3px solid #d97706;
  color: #fff;
}

.usageCircle {
  background: #ef4444;
  border: 3px solid #dc2626;
  color: #fff;
}
```

---

## 4. DataSummaryTable Component

New component rendering two table cards beneath the dashboard diagram.

### Files

- **`src/components/DataSummaryTable.tsx`**
- **`src/components/DataSummaryTable.module.css`**

### Props

```ts
interface DataSummaryTableProps {
  nelson?: DeviceSnapshot;
  granny?: DeviceSnapshot;
  hinenData?: HinenStatus;
  batterySocDisplayed: number;   // already-adjusted SOC (0–100)
}
```

### Solar Inverters table

Columns: Device · Generation · Usage · Status · Refresh

| Device | Refresh |
|---|---|
| Nelsons House | 5 sec (LAN) |
| 5A / Granny Flat | 5 sec (LAN) |

Status badge: green `Online` / red `Offline` dot based on `snap.status === "ok"`.

### Battery table

Columns: Device · SOC · Power · Status · Refresh

| Device | Refresh |
|---|---|
| Hinen SH6KL | 30 sec (cloud) |

Status badges: `Charging` (green) · `Discharging` (red) · `Idle` (gray)

### Status badge CSS classes

| Class | Colour |
|---|---|
| `.statusCharging` | Green |
| `.statusDischarging` | Red |
| `.statusIdle` | Gray |
| `.statusOnline` | Green |
| `.statusOffline` | Red |

Full dark mode support via `[data-theme="dark"]` selectors.

---

## 5. Performance History Accordion

Wrapped the `HistoricalSection` chart/table block in a collapsible accordion, **collapsed by default**, to reduce initial page height.

### State

```ts
const [historyOpen, setHistoryOpen] = useState(false);
```

### CSS classes added to `src/app/page.module.css`

`.accordionWrapper` · `.accordionToggle` · `.chevronDown` · `.chevronUp` · `.accordionBody`

---

## 6. Hinen Pi Proxy — 30-Second Cache

### Problem

Every 5-second browser poll → Next.js `/api/hinen` → Pi proxy → Hinen cloud API (au.iot-api.celinksmart.com).  
~12 live cloud hits per minute per user.

### Solution

Added an in-process TTL cache to the Flask proxy on the Pi.

**File:** `~/hinen-api/hinen-proxy.py`

**Additions after `tokens = TokenManager()`:**

```python
import threading
import time

_status_cache: dict = {"data": None, "expires_at": 0.0}
_status_lock = threading.Lock()
STATUS_CACHE_TTL = 30  # seconds
```

**Modified `/status` route logic:**

```python
with _status_lock:
    now = time.time()
    if _status_cache["data"] is not None and now < _status_cache["expires_at"]:
        return jsonify(_status_cache["data"])   # cache hit

# ... existing fetch logic ...

with _status_lock:
    _status_cache["data"] = result
    _status_cache["expires_at"] = time.time() + STATUS_CACHE_TTL
return jsonify(result)
```

**Restart:**

```bash
sudo systemctl restart hinen-proxy
sudo systemctl status hinen-proxy   # confirmed active
```

**Smoke test:**

```bash
curl -s http://localhost:5555/status | python3 -c "..."
# ok: True | soc: 54.0 | solar: 0.0 W
```

### Next.js poll interval alignment

Updated `src/hooks/useHinenData.ts` to match the 30 s cache TTL:

```ts
// before
refreshInterval: 5000,
dedupingInterval: 2500,

// after
refreshInterval: 30000,
dedupingInterval: 25000,
```

Fronius hooks remain at 5 s (direct LAN — no external API cost).

**Commit:** `29faf54`

---

## 7. Favicon / PWA Manifest Fix

### Problem

`src/app/icon.png` and `src/app/apple-icon.png` exist — these are Next.js **file-based metadata** icons that take precedence automatically.  
An explicit `icons` block in `layout.tsx` was also present, pointing to different files in `/public/`, creating a conflict where neither set worked reliably.

`site.webmanifest` also referenced `web-app-manifest-*.png` files with a mismatched theme colour.

### Fix

**`src/app/layout.tsx`** — removed the explicit `icons` block entirely. Next.js now auto-serves icons from `src/app/icon.png` and `src/app/apple-icon.png`.

**`public/site.webmanifest`** — updated to reference the actual available icon files and corrected theme colours:

```json
{
  "name": "SolarSystem",
  "icons": [
    { "src": "/icon-192.png",  "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png",  "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "theme_color": "#f59e0b",
  "background_color": "#1a1a2e",
  "display": "standalone"
}
```

**Commit:** `4a638c9`

---

## Commit History (this session)

| Commit | Description |
|---|---|
| `c1c60f0` | feat: simplified dashboard card layout (initial) |
| `8fbc337` | fix: grid sign convention + animated flow connectors |
| `73b6911` | feat: light mode fix, DataSummaryTable, history accordion |
| `29faf54` | feat: add 30s proxy cache + align poll intervals with cache TTL |
| `0af50c1` | fix: raise grid idle threshold to 250W |
| `4a638c9` | fix: use file-based favicon convention, fix manifest icon paths |

---

## Infrastructure Notes

### Pi proxy service

| Item | Value |
|---|---|
| File | `~/hinen-api/hinen-proxy.py` |
| Service | `hinen-proxy` (systemd) |
| Local URL | `http://192.168.50.140:5555` |
| Tailscale URL | `http://100.103.219.54:5555` |
| Port | 5555 |

### Data source refresh rates

| Source | Interval | Method |
|---|---|---|
| Fronius (Nelsons House) | 5 s | Direct LAN poll |
| Fronius (Granny Flat) | 5 s | Direct LAN poll |
| Hinen Battery (via Pi proxy) | 30 s | Cloud API via Pi cache |

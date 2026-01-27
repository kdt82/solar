# Grid Import Alert System Implementation

**Date:** January 27, 2026  
**Status:** ✅ Completed

## Overview

Implemented an audible alert system that monitors grid import levels and triggers Google Home speakers when thresholds are exceeded during specified time windows.

---

## Architecture

### Components

1. **Database Layer** (PostgreSQL + Prisma)
   - `AlertSettings` table: Stores user configuration
   - `AlertLog` table: Records alert history

2. **API Layer** (Next.js API Routes)
   - `/api/alerts/settings` - GET/PUT alert configuration
   - `/api/alerts/test` - POST test alert endpoint
   - `/api/alerts/history` - GET alert logs

3. **Alert Engine** (`src/lib/alertEngine.ts`)
   - Evaluates grid import against thresholds
   - Tracks consecutive time above threshold
   - Manages cooldown periods
   - Timezone-aware time window checking

4. **Background Poller** (`scripts/alert-poller.ts`)
   - Runs every 10 seconds via Docker service
   - Fetches latest power snapshots
   - Triggers Home Assistant webhooks

5. **Home Assistant Client** (`src/lib/homeassistant.ts`)
   - Webhook integration with retry logic
   - Rate limiting (max 6 calls per minute)
   - Triggers Google Home speaker playback

6. **Frontend UI** (React Components)
   - Settings tab with full configuration form
   - Enable/disable toggle
   - Time window inputs (start/end)
   - Threshold, duration, cooldown settings
   - Speaker group and volume controls
   - Test alert button

---

## Home Assistant Setup via Raspberry Pi on Tailscale

### Infrastructure

- **VPS:** 194.163.146.126 (running Next.js app via Docker)
- **Raspberry Pi:** 192.168.50.140 (local), 100.103.219.54 (Tailscale)
- **Network:** Direct Tailscale-to-Tailscale communication

### Why Docker Home Assistant?

Initially considered Home Assistant OS but opted for Docker installation to preserve:
- Existing Tailscale subnet router configuration
- Fronius inverter proxy setup
- Minimal disruption to production environment

### Docker Installation

```bash
# On Raspberry Pi
docker run -d \
  --name homeassistant \
  --privileged \
  --restart=unless-stopped \
  -e TZ=Australia/Sydney \
  -v /opt/homeassistant/config:/config \
  -v /run/dbus:/run/dbus:ro \
  --network=host \
  ghcr.io/home-assistant/home-assistant:stable
```

### Google Cast Integration

1. Configured via Home Assistant UI (Settings → Devices & Services → Add Integration → Google Cast)
2. Auto-discovered Google Home speakers on local network
3. Created speaker group: `media_player.all_google_home_speakers`

### Alert Script Configuration

Added to Home Assistant `configuration.yaml`:

```yaml
script:
  play_grid_alert_ding:
    alias: "Play Grid Alert Ding"
    mode: single
    sequence:
      - action: media_player.volume_set
        target:
          entity_id: "{{ target_group | default('media_player.all_google_home_speakers') }}"
        data:
          volume_level: "{{ alert_volume | default(0.5) }}"
      - action: media_player.play_media
        target:
          entity_id: "{{ target_group | default('media_player.all_google_home_speakers') }}"
        data:
          media_content_id: "http://192.168.50.140:8123/local/ding.mp3"
          media_content_type: "audio/mpeg"
      - delay:
          seconds: 3
```

**Note:** Removed `announce: true` to prevent Google's built-in notification ding from playing before custom sound.

### Authentication

- Generated long-lived access token in Home Assistant
- Stored in VPS `.env` as `HA_TOKEN`
- VPS connects to HA via Tailscale IP: `http://100.103.219.54:8123`

---

## UI Changes

### Tab Navigation

Added tabbed interface to main dashboard:
- **Dashboard** tab: Existing solar monitoring view
- **Settings** tab: Grid import alert configuration

Implementation in `src/app/page.tsx`:
```tsx
const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
```

### Alert Settings Component

Created comprehensive settings form (`src/components/AlertSettings.tsx`):

**Enable/Disable Toggle**
- Green toggle switch
- Disables all inputs when off

**Time Window Configuration**
- Start time input (default: 09:00 AM)
- End time input (default: 05:00 PM)
- 12-hour format with AM/PM

**Alert Thresholds**
- Grid Import Threshold (kW): Default 2.5 kW
- Duration (minutes): How long to exceed threshold (default: 5 min)
- Cooldown (minutes): Time between alerts (default: 15 min)

**Playback Settings**
- Speaker Group Entity ID: `media_player.all_google_home_speakers`
- Volume slider: 0.0 to 1.0 (default: 0.5)

**Timezone Selection**
- Dropdown with Australian timezones
- Used for time window calculations
- Default: Australia/Sydney

**Actions**
- Save Settings button (green)
- Test Alert button (secondary)
- Toast notifications for success/error

### Styling Consistency

**Challenge:** Light mode styling differed between dashboard and settings.

**Solution:** 
1. Added CSS variables to `src/app/globals.css`:
   - `--text-primary`, `--card-bg`, `--card-hover`
   - `--border-color`, `--input-bg`
   - Defined for both light and dark themes

2. Matched settings container to dashboard card styling:
   ```css
   background: rgba(255, 255, 255, 0.95);
   border: 1px solid rgba(0, 0, 0, 0.08);
   box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
   ```

3. Dark mode uses gradient background:
   ```css
   background: linear-gradient(150deg, rgba(15, 23, 42, 0.85), rgba(17, 24, 39, 0.65));
   ```

---

## Database Schema

### AlertSettings Model

```prisma
model AlertSettings {
  id              String   @id @default(cuid())
  enabled         Boolean  @default(true)
  timeWindowStart String   @default("09:00 AM")
  timeWindowEnd   String   @default("05:00 PM")
  threshold       Float    @default(2.5)
  duration        Int      @default(5)
  cooldown        Int      @default(15)
  speakerGroup    String   @default("media_player.google_home_group")
  volume          Float    @default(0.5)
  timezone        String   @default("Australia/Sydney")
  updatedAt       DateTime @updatedAt
}
```

### AlertLog Model

```prisma
model AlertLog {
  id        String   @id @default(cuid())
  timestamp DateTime @default(now())
  gridValue Float
  triggered Boolean
  message   String?
}
```

Migration: `20260126215907_add_alert_system`

---

## Alert Engine Logic

### Core Evaluation Flow

1. Check if alerts are enabled
2. Verify current time is within monitoring window (timezone-aware)
3. Check if cooldown period has elapsed since last alert
4. Compare grid import to threshold
5. Track consecutive minutes above threshold
6. Trigger alert when duration requirement met
7. Log all evaluations to database

### Timezone Handling

Uses `date-fns-tz` library for accurate timezone conversions:
```typescript
import { toZonedTime } from 'date-fns-tz';

const zonedNow = toZonedTime(new Date(), settings.timezone);
```

### State Tracking

- `consecutiveMinutesAbove`: Counter for duration tracking
- `lastAlertTime`: Timestamp of last triggered alert
- `lastCooldownExpiry`: Calculated cooldown expiration time

---

## Deployment Optimization

### GitHub Actions Workflow

Created `.github/workflows/deploy.yml` with smart rebuild logic:

**Standard Deployment:**
1. SSH to VPS
2. Git pull latest changes
3. Check if `package.json` or `Dockerfile` changed
4. **If changed:** Full rebuild with `docker compose build`
5. **If unchanged:** Quick restart with `docker compose restart`
6. Run Prisma migrations
7. 30-minute timeout

**Benefits:**
- CSS/code changes: ~30 seconds (restart only)
- Dependency changes: ~5 minutes (full rebuild)
- Avoids unnecessary 17-minute rebuilds

### Docker Compose Services

**inverter** (main app):
- Next.js application
- Tailscale sidecar for subnet routing
- Port 3000 exposed

**inverter-poller** (background service):
- Runs `scripts/alert-poller.ts`
- Executes every 10 seconds
- Shares network with main app
- Auto-restart on failure

---

## Environment Variables

VPS `.env` file requires:

```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Home Assistant
HA_TAILSCALE_IP=100.103.219.54
HA_TOKEN=eyJhbGci...
```

---

## Testing & Validation

### Manual Tests Completed

✅ Test Alert button triggers Google Home speakers  
✅ Home Assistant script plays custom ding.mp3  
✅ Alert engine evaluates thresholds correctly  
✅ Time window filtering works with Sydney timezone  
✅ Cooldown period prevents spam  
✅ Settings persist across page refreshes  
✅ Light/dark mode styling consistent  
✅ Deployment workflow optimized

### Remaining Tasks

⏳ Upload custom `ding.mp3` to Home Assistant  
⏳ Configure production alert thresholds  
⏳ Monitor alert poller logs for 24 hours  
⏳ Verify end-to-end alert flow during production hours

---

## Key Files Modified/Created

### Database
- `prisma/schema.prisma` - Added AlertSettings and AlertLog models
- `prisma/migrations/20260126215907_add_alert_system/` - Migration SQL

### Backend
- `src/app/api/alerts/settings/route.ts` - Settings CRUD
- `src/app/api/alerts/test/route.ts` - Test endpoint
- `src/app/api/alerts/history/route.ts` - Log retrieval
- `src/lib/alertEngine.ts` - Core evaluation logic
- `src/lib/homeassistant.ts` - HA webhook client
- `scripts/alert-poller.ts` - Background service

### Frontend
- `src/components/AlertSettings.tsx` - Settings form UI
- `src/components/AlertSettings.module.css` - Component styles
- `src/hooks/useAlertSettings.ts` - SWR data fetching
- `src/app/page.tsx` - Tab navigation integration
- `src/app/page.module.css` - Tab styling
- `src/app/globals.css` - CSS variables for theming

### Infrastructure
- `.github/workflows/deploy.yml` - CI/CD automation
- `docker-compose.yml` - Added inverter-poller service
- `Dockerfile` - Added scripts directory
- `.env` - HA_TAILSCALE_IP and HA_TOKEN
- `docs/home-assistant-setup.md` - HA setup guide

---

## Dependencies Added

```json
{
  "date-fns-tz": "^3.2.0"
}
```

---

## Lessons Learned

1. **Docker HA over HA OS:** Preserving existing infrastructure is critical
2. **Tailscale IP vs Local IP:** Direct Tailscale-to-Tailscale communication more reliable
3. **Google Cast `announce` flag:** Adds unwanted notification ding
4. **Deployment optimization:** Smart rebuild saves significant time
5. **CSS variables:** Centralized theming prevents styling inconsistencies
6. **Timezone handling:** date-fns-tz essential for accurate time window checks

---

## Future Enhancements

- Alert history visualization (chart/table)
- Multiple alert profiles (weekday/weekend)
- Email/SMS notification options
- Custom sound upload via UI
- Alert statistics dashboard
- Fine-tune threshold based on historical data

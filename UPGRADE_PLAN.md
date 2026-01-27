# Grid Import Alert System - Development Upgrade Plan

**Project:** Solar Dashboard - Grid Import Alert with Google Home Integration  
**Version:** 1.0.0  
**Date:** January 26, 2026  
**Status:** Planning Phase

---

## Executive Summary

Add audible alert system to existing solar dashboard that monitors grid import power and triggers a "ding" sound on all Google Home speakers when configurable thresholds are exceeded. Implementation uses Home Assistant on Raspberry Pi for Google Home control, connected to VPS dashboard via existing Tailscale network.

### Core Requirements
- ✅ Maintain existing dashboard functionality (zero breaking changes)
- ✅ Add Settings tab in dashboard UI next to "Last updated time"
- ✅ Monitor combined grid import (kW) against user-defined threshold
- ✅ Trigger alert only during configured time window
- ✅ Require continuous threshold breach for N minutes before triggering
- ✅ Implement cooldown period between alerts
- ✅ Target all Google Home speakers via Home Assistant speaker group
- ✅ Provide test button for immediate verification

---

## Architecture Overview

### Current State
- **Frontend:** Next.js 15 App Router (React 19), TypeScript, CSS Modules
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (running in Docker)
- **Data Source:** 2x Fronius inverters via Raspberry Pi over Tailscale
- **Deployment:** Docker Compose on VPS
- **Polling:** Client-side SWR polling every 5 seconds
- **Auth:** NextAuth.js with JWT sessions

### Target State
- **+Settings Tab:** New tab UI component with alert configuration controls
- **+Alert Settings Storage:** New Prisma models (`AlertSettings`, `AlertLog`)
- **+Settings API:** CRUD endpoints for alert configuration
- **+Alert Evaluation Engine:** Server-side logic tracking threshold breach state
- **+Alert Poller Service:** Separate Docker container running evaluation loop
- **+Home Assistant Integration:** Webhook client triggering HA scripts
- **+HA Setup on Pi:** Home Assistant OS with Google Cast + speaker group + alert script

---

## Implementation Phases

### Phase 1: Database Schema & Migrations ⚙️
**Goal:** Add persistent storage for alert settings and trigger logs  
**Estimated Time:** 30 minutes  
**Risk:** Low (additive only, no existing table modifications)

#### Tasks
1. **Update Prisma Schema** (`prisma/schema.prisma`)
   - Add `AlertSettings` model:
     ```prisma
     model AlertSettings {
       id                Int      @id @default(autoincrement())
       enabled           Boolean  @default(false)
       timeWindowStart   String   @default("00:00")  // HH:mm format
       timeWindowEnd     String   @default("23:59")
       threshold         Float    @default(2.5)      // kW
       duration          Int      @default(5)        // minutes
       cooldown          Int      @default(15)       // minutes
       speakerGroup      String   @default("media_player.google_home_group")
       volume            Float    @default(0.5)      // 0.0 - 1.0
       timezone          String   @default("Australia/Sydney")
       createdAt         DateTime @default(now())
       updatedAt         DateTime @updatedAt
     }
     ```
   - Add `AlertLog` model:
     ```prisma
     model AlertLog {
       id           Int      @id @default(autoincrement())
       timestamp    DateTime @default(now())
       gridValue    Float                              // kW at time of evaluation
       triggered    Boolean                            // true = alert sent, false = suppressed
       message      String                             // reason (e.g., "Alert triggered", "In cooldown")
       createdAt    DateTime @default(now())
       
       @@index([timestamp])
     }
     ```

2. **Generate and Run Migration**
   ```bash
   npx prisma migrate dev --name add_alert_system
   ```

3. **Verify Migration**
   - Check `prisma/migrations/` for new migration folder
   - Connect to PostgreSQL and verify tables exist
   - Test rollback plan: keep migration SQL for manual rollback if needed

#### Acceptance Criteria
- [x] `AlertSettings` table exists with default values
- [x] `AlertLog` table exists with indexed timestamp
- [x] `prisma generate` runs without errors
- [x] Existing tables (`User`, `Device`, `Snapshot`, etc.) are unchanged
- [x] Migration can be rolled back cleanly

---

### Phase 2: Backend API - Settings Endpoints 🔌
**Goal:** Create REST API for alert settings CRUD operations  
**Estimated Time:** 1-2 hours  
**Risk:** Low (new endpoints, no existing API modifications)

#### Tasks
1. **Create Settings API** (`src/app/api/alerts/settings/route.ts`)
   - **GET:** Fetch current settings (create default row if none exists)
   - **PUT:** Update settings with validation:
     - `enabled`: boolean
     - `timeWindowStart/End`: regex `/^([01]\d|2[0-3]):[0-5]\d$/`
     - `threshold`: 0 ≤ value ≤ 20 (kW)
     - `duration`: 1 ≤ value ≤ 120 (minutes)
     - `cooldown`: 1 ≤ 240 (minutes)
     - `speakerGroup`: non-empty string starting with "media_player."
     - `volume`: 0 ≤ value ≤ 1
     - `timezone`: valid timezone string (use `date-fns-tz`)
   - Return appropriate HTTP status codes (200, 400, 500)
   - Require authentication (NextAuth session)

2. **Create Test Alert API** (`src/app/api/alerts/test/route.ts`)
   - **POST:** Trigger immediate test alert
   - Fetch current settings from DB
   - Call Home Assistant webhook (create stub for now)
   - Log test event to `AlertLog` with message "Test alert triggered"
   - Return success/failure response

3. **Create Alert History API** (`src/app/api/alerts/history/route.ts`)
   - **GET:** Fetch last 50 `AlertLog` entries ordered by timestamp DESC
   - Include query param `?limit=N` (default 50, max 100)
   - Return JSON array with timestamp, gridValue, triggered, message

#### Acceptance Criteria
- [x] `GET /api/alerts/settings` returns defaults on first call
- [x] `PUT /api/alerts/settings` validates and persists changes
- [x] Invalid inputs return 400 with clear error messages
- [x] `POST /api/alerts/test` returns 200 on success
- [x] `GET /api/alerts/history` returns array of log entries
- [x] All endpoints require authentication
- [x] Postman/curl tests pass for all endpoints

---

### Phase 3: Frontend - Settings Tab UI 🎨
**Goal:** Add Settings tab to dashboard with full configuration controls  
**Estimated Time:** 3-4 hours  
**Risk:** Medium (UI integration with existing layout)

#### Tasks
1. **Create Alert Settings Component** (`src/components/AlertSettings.tsx`)
   - Tab interface integration (appears next to "Last updated time" display)
   - Form controls:
     - **Enable/Disable:** Toggle switch (checkbox styled as toggle)
     - **Time Window:** Two time inputs (HH:mm format) for start/end
     - **Grid Import Threshold:** Number input (kW, step 0.1, range 0-20)
     - **Duration:** Number input (minutes, range 1-120) with helper text
     - **Cooldown:** Number input (minutes, range 1-240) with helper text
     - **Speaker Group:** Text input with placeholder "media_player.google_home_group"
     - **Volume:** Range slider (0-1, step 0.1) with visual indicator
     - **Timezone:** Dropdown select with Australian timezones
   - Action buttons:
     - **Save Settings:** Validates, calls `PUT /api/alerts/settings`, shows toast
     - **Test Alert:** Calls `POST /api/alerts/test`, shows toast with result
   - Real-time validation with error messages
   - Loading states during API calls
   - Success/error toast notifications (consider adding toast library or use simple div)

2. **Create Component Styles** (`src/components/AlertSettings.module.css`)
   - Match existing dashboard aesthetic (CSS variables from `globals.css`)
   - Responsive layout (stack inputs on mobile)
   - Accessible form controls (labels, ARIA attributes)
   - Visual feedback for validation errors
   - Disabled state styling when alerts are disabled

3. **Create Custom Hook** (`src/hooks/useAlertSettings.ts`)
   - SWR-based data fetching for settings
   - Mutation functions for save/test operations
   - Optimistic UI updates
   - Error handling

4. **Integrate Tab Navigation** (`src/app/page.tsx`)
   - Add tab state management (`useState` for active tab)
   - Tab buttons: "Dashboard" | "Settings"
   - Position tabs next to "Last updated" timestamp in header area
   - Conditional rendering of dashboard content vs settings panel
   - Preserve existing layout when "Dashboard" tab is active

5. **Add Dependencies**
   - Update `package.json`: `"date-fns-tz": "^3.2.0"`
   - Run `npm install`

#### Acceptance Criteria
- [x] Settings tab appears next to "Last updated time"
- [x] Clicking Settings tab shows configuration form
- [x] All form controls are functional and validated
- [x] Save button persists changes and shows success toast
- [x] Test button triggers test alert and shows result
- [x] Form shows current saved values on load
- [x] Validation errors displayed inline
- [x] Responsive design works on mobile/tablet/desktop
- [x] Existing dashboard tab remains fully functional
- [x] No visual regressions in existing UI

---

### Phase 4: Alert Evaluation Engine 🧠
**Goal:** Implement logic to evaluate grid import against alert rules  
**Estimated Time:** 2-3 hours  
**Risk:** Medium (stateful logic requires careful testing)

#### Tasks
1. **Create Alert Engine Library** (`src/lib/alertEngine.ts`)
   - `AlertEngine` class with methods:
     - `evaluate(gridImportKw: number, settings: AlertSettings): EvaluationResult`
     - `reset()`: Clear state (for testing)
   - Internal state tracking:
     - `consecutiveMinutesAbove`: Counter for duration tracking
     - `lastTriggerTime`: Timestamp of last alert sent
     - `cooldownUntil`: Calculated cooldown expiry time
     - `lastBelowThreshold`: Track when condition cleared (prevents retrigger)
   - Time window check using `date-fns-tz`:
     ```typescript
     import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
     const nowInTz = utcToZonedTime(new Date(), settings.timezone);
     const currentTime = format(nowInTz, 'HH:mm');
     const inWindow = currentTime >= settings.timeWindowStart && 
                      currentTime <= settings.timeWindowEnd;
     ```
   - Duration tracking logic:
     ```typescript
     if (gridImportKw > settings.threshold) {
       consecutiveMinutesAbove += (pollIntervalSeconds / 60);
       if (consecutiveMinutesAbove >= settings.duration && !inCooldown) {
         // Trigger alert
       }
     } else {
       consecutiveMinutesAbove = 0;
       lastBelowThreshold = Date.now();
     }
     ```
   - Return structured result:
     ```typescript
     interface EvaluationResult {
       shouldTrigger: boolean;
       reason: string; // "Triggered", "In cooldown", "Below threshold", etc.
       state: {
         consecutiveMinutes: number;
         inCooldown: boolean;
         inTimeWindow: boolean;
       };
     }
     ```

2. **Create Alert Poller Script** (`scripts/alert-poller.ts`)
   - Standalone TypeScript script with infinite loop
   - Import Prisma client from `src/lib/prisma.ts`
   - Poll interval: 10 seconds
   - Logic:
     ```typescript
     while (true) {
       const settings = await prisma.alertSettings.findFirst();
       if (!settings?.enabled) {
         await sleep(10000);
         continue;
       }
       
       const latestSnapshot = await prisma.snapshot.findFirst({
         where: { deviceId: null }, // Combined snapshot
         orderBy: { timestamp: 'desc' }
       });
       
       if (!latestSnapshot) {
         await sleep(10000);
         continue;
       }
       
       const result = engine.evaluate(latestSnapshot.grid, settings);
       
       if (result.shouldTrigger) {
         await triggerHomeAssistant(settings);
         await logTrigger(latestSnapshot.grid, true, "Alert triggered");
       } else {
         await logTrigger(latestSnapshot.grid, false, result.reason);
       }
       
       await sleep(10000);
     }
     ```
   - Error handling with exponential backoff
   - Graceful shutdown on SIGTERM/SIGINT
   - Logging to console with timestamps

3. **Add Unit Tests** (`src/lib/__tests__/alertEngine.test.ts`)
   - Test scenarios:
     - Threshold not breached → no trigger
     - Threshold breached but duration not met → no trigger
     - Threshold breached for duration → trigger
     - Cooldown prevents retrigger
     - Time window outside hours → no trigger
     - Consecutive samples reset when below threshold
     - Timezone handling (mock date-fns-tz)

#### Acceptance Criteria
- [x] Alert engine correctly tracks consecutive time above threshold
- [x] Time window check uses correct timezone
- [x] Cooldown prevents rapid retriggering
- [x] State resets when grid import drops below threshold
- [x] Poller script runs continuously without crashes
- [x] Logs are written for every evaluation cycle
- [x] Unit tests achieve >90% coverage
- [x] Manual testing with mock data confirms behavior

---

### Phase 5: Home Assistant Integration 🏠
**Goal:** Implement webhook client to trigger Google Home ding via HA  
**Estimated Time:** 2 hours  
**Risk:** Medium (depends on HA setup, network connectivity)

#### Tasks
1. **Create HA Client Library** (`src/lib/homeassistant.ts`)
   - `triggerGridAlert(settings: AlertSettings)`: Main function
     ```typescript
     const response = await fetch(
       `http://${process.env.HA_TAILSCALE_IP}:8123/api/services/script/turn_on`,
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${process.env.HA_TOKEN}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           entity_id: 'script.play_grid_alert_ding',
           variables: {
             target_group: settings.speakerGroup,
             alert_volume: settings.volume,
           }
         }),
         signal: AbortSignal.timeout(5000),
       }
     );
     ```
   - Retry logic: 1 retry with 2-second delay on failure
   - Error handling: log to console and `AlertLog` table
   - `testAlert()`: Wrapper for test button (same logic)
   - Rate limiting: max 1 call per 5 seconds (safety)

2. **Update Environment Variables** (`.env`)
   - Add `HA_TAILSCALE_IP=100.x.x.x` (to be determined during HA setup)
   - Add `HA_TOKEN=eyJ0eXAi...` (to be generated during HA setup)
   - Document in README or separate HA_SETUP.md file

3. **Add Network Testing Script** (`scripts/test-ha-connection.ts`)
   - Simple script to verify Tailscale connectivity from VPS to Pi
   - Attempts to reach HA API and print response
   - Usage: `npx ts-node scripts/test-ha-connection.ts`

#### Acceptance Criteria
- [x] `triggerGridAlert()` successfully calls HA webhook
- [x] Timeout prevents hanging on network issues
- [x] Retry logic handles transient failures
- [x] Rate limiting prevents spam
- [x] Error messages are descriptive and logged
- [x] Test script confirms VPS→Pi connectivity over Tailscale
- [x] Environment variables documented

---

### Phase 6: Docker Configuration Updates 🐳
**Goal:** Add alert poller as separate Docker service  
**Estimated Time:** 1 hour  
**Risk:** Low (additive Docker Compose changes)

#### Tasks
1. **Update Dockerfile** (`Dockerfile`)
   - Ensure `ts-node` is available: already included via `npm ci`
   - Copy `scripts/` directory to container:
     ```dockerfile
     COPY --from=builder /app/scripts ./scripts
     ```

2. **Update Docker Compose** (`docker-compose.yml`)
   - Add new service:
     ```yaml
     services:
       inverter:
         # existing config...
       
       inverter-poller:
         build: .
         container_name: inverter-poller
         restart: unless-stopped
         env_file: ./.env
         command: ["npx", "ts-node", "scripts/alert-poller.ts"]
         depends_on:
           - inverter
         networks:
           - backend
     ```

3. **Add Health Check Script** (`scripts/poller-health.ts`)
   - Create simple HTTP server on port 3001 responding to `/health`
   - Import and run in `alert-poller.ts` as background task
   - Update docker-compose.yml with healthcheck

4. **Test Local Build**
   ```bash
   docker-compose build
   docker-compose up -d
   docker-compose logs -f inverter-poller
   ```

#### Acceptance Criteria
- [x] Poller service builds without errors
- [x] Poller service starts and runs continuously
- [x] Poller has access to DATABASE_URL and other env vars
- [x] Poller can connect to PostgreSQL in backend network
- [x] Logs show evaluation cycles every 10 seconds
- [x] Service restarts automatically on crash
- [x] `docker-compose down` stops both services cleanly

---

### Phase 7: Home Assistant Setup (Raspberry Pi) 🥧
**Goal:** Install and configure HA with Google Cast integration  
**Estimated Time:** 2-3 hours  
**Risk:** High (hardware setup, first-time HA configuration)

#### Tasks
1. **Install Home Assistant OS on Raspberry Pi**
   - Download HA OS image for Raspberry Pi 4: https://www.home-assistant.io/installation/raspberrypi
   - Flash to microSD card using Raspberry Pi Imager
   - Boot Pi and wait for HA to initialize (~20 minutes)
   - Access HA web UI: `http://raspberrypi.local:8123` or `http://PI_IP:8123`
   - Complete onboarding wizard (create admin account)

2. **Configure Google Cast Integration**
   - Navigate: Settings → Devices & Services → Add Integration
   - Search for "Google Cast" and add
   - HA will auto-discover Google Home devices on LAN
   - Verify all devices appear in Devices list

3. **Create Speaker Group**
   - Navigate: Settings → Devices & Services → Helpers
   - Click "Create Helper" → Group → Media Player Group
   - Name: "Google Home Group"
   - Select all Google Home devices
   - Save (note entity_id: `media_player.google_home_group`)

4. **Add Alert Script to Configuration**
   - SSH to Pi or use File Editor add-on
   - Edit `/config/configuration.yaml`:
     ```yaml
     script:
       play_grid_alert_ding:
         alias: "Play Grid Alert Ding"
         sequence:
           - service: media_player.volume_set
             target:
               entity_id: "{{ target_group }}"
             data:
               volume_level: "{{ alert_volume }}"
           - service: media_player.play_media
             target:
               entity_id: "{{ target_group }}"
             data:
               media_content_id: "http://{{ HA_LOCAL_IP }}:8123/local/ding.mp3"
               media_content_type: "music"
           - delay:
               seconds: 3
         mode: single
     ```
   - Replace `{{ HA_LOCAL_IP }}` with Pi's local IP (e.g., 192.168.1.100)
   - Check Configuration: Developer Tools → Check Configuration
   - Restart Home Assistant

5. **Upload Alert Sound File**
   - Create `/config/www/` directory if it doesn't exist
   - Upload `ding.mp3` to `/config/www/ding.mp3`
   - Verify accessible at `http://PI_IP:8123/local/ding.mp3` in browser

6. **Generate Long-Lived Access Token**
   - Navigate: Profile (bottom left) → Security → Long-Lived Access Tokens
   - Click "Create Token"
   - Name: "Solar Dashboard Alert System"
   - Copy token immediately (shown only once)
   - Add to VPS `.env` file as `HA_TOKEN=...`

7. **Test Script Manually**
   - Navigate: Developer Tools → Services
   - Service: `script.turn_on`
   - Target entity: `script.play_grid_alert_ding`
   - Service data:
     ```yaml
     variables:
       target_group: media_player.google_home_group
       alert_volume: 0.5
     ```
   - Click "Call Service"
   - Verify ding plays on all Google Homes

8. **Configure Tailscale on Raspberry Pi**
   - Install Tailscale: `curl -fsSL https://tailscale.com/install.sh | sh`
   - Authenticate: `sudo tailscale up`
   - Note Tailscale IP: `tailscale ip -4` (e.g., 100.x.x.x)
   - Add to VPS `.env` file as `HA_TAILSCALE_IP=100.x.x.x`
   - Test from VPS: `curl http://100.x.x.x:8123/api/` (should return HA API info)

#### Acceptance Criteria
- [x] Home Assistant accessible at `http://PI_IP:8123`
- [x] Google Cast integration discovers all devices
- [x] Speaker group created with all devices
- [x] `ding.mp3` accessible at `/local/ding.mp3`
- [x] Alert script runs manually without errors
- [x] Ding plays on all Google Homes at configured volume
- [x] Tailscale IP address noted and accessible from VPS
- [x] Long-lived token generated and stored in VPS `.env`
- [x] Test webhook call from VPS triggers ding successfully

---

### Phase 8: Integration Testing & Validation ✅
**Goal:** End-to-end testing of complete alert system  
**Estimated Time:** 2-3 hours  
**Risk:** Medium (integration issues, edge cases)

#### Test Scenarios

1. **Settings Persistence Test**
   - Configure all settings in UI
   - Save settings
   - Refresh browser
   - Verify settings persist

2. **Test Alert Button**
   - Click "Test Alert" button
   - Verify ding plays on Google Homes
   - Check AlertLog for test entry
   - Verify toast shows success

3. **Time Window Test**
   - Set time window excluding current time
   - Manually trigger high grid import (or mock in DB)
   - Verify no alert triggered
   - Adjust time window to include current time
   - Verify alert triggers

4. **Threshold Test**
   - Set threshold to 1.0 kW
   - Wait for grid import to exceed 1.0 kW
   - Verify alert triggers after duration minutes
   - Set threshold to 20.0 kW (unreachable)
   - Verify no alerts for 30 minutes

5. **Duration Test**
   - Set duration to 3 minutes
   - Simulate grid import above threshold for 2 minutes
   - Verify no alert
   - Continue for 1 more minute
   - Verify alert triggers

6. **Cooldown Test**
   - Set cooldown to 5 minutes
   - Trigger alert
   - Keep grid import high
   - Verify no second alert for 5 minutes
   - Wait for cooldown to expire
   - Verify second alert triggers

7. **Disable Test**
   - Disable alerts in UI
   - Simulate high grid import
   - Verify no alerts for 10 minutes
   - Enable alerts
   - Verify alert triggers when conditions met

8. **Network Failure Test**
   - Stop Home Assistant temporarily
   - Trigger alert condition
   - Verify error logged in AlertLog
   - Restart Home Assistant
   - Verify subsequent alerts work

9. **Database Failure Test**
   - Stop PostgreSQL temporarily
   - Verify poller logs error and continues
   - Restart PostgreSQL
   - Verify poller resumes normal operation

10. **Load Test**
    - Monitor system resources during normal operation
    - Verify poller doesn't spike CPU/memory
    - Check database query performance
    - Verify no memory leaks over 24 hours

#### Acceptance Criteria
- [x] All 10 test scenarios pass
- [x] No errors in docker logs for 1 hour of operation
- [x] Alert history shows expected trigger/suppress events
- [x] System resources remain stable
- [x] Existing dashboard functionality unaffected

---

### Phase 9: Documentation & Deployment 📚
**Goal:** Document setup, deploy to production  
**Estimated Time:** 1-2 hours  
**Risk:** Low

#### Tasks
1. **Create Home Assistant Setup Guide** (`docs/home-assistant-setup.md`)
   - Installation steps
   - Google Cast configuration
   - Speaker group creation
   - Script configuration
   - Token generation
   - Troubleshooting section

2. **Update Main README** (`README.md`)
   - Add "Alert System" section
   - Document new environment variables
   - Link to HA setup guide
   - Update architecture diagram (if exists)

3. **Create Deployment Checklist**
   - Backup database
   - Pull latest code on VPS
   - Update `.env` with HA variables
   - Run Prisma migration
   - Rebuild Docker containers
   - Verify services start
   - Test alert system
   - Monitor logs for 24 hours

4. **Deploy to Production**
   - SSH to VPS
   - `cd /path/to/solar`
   - `git pull origin main`
   - Update `.env` with HA_TAILSCALE_IP and HA_TOKEN
   - `docker-compose down`
   - `docker-compose up -d --build`
   - `docker-compose exec inverter npx prisma migrate deploy`
   - `docker-compose logs -f`

5. **Post-Deployment Verification**
   - Access dashboard at production URL
   - Navigate to Settings tab
   - Configure test alert settings
   - Click "Test Alert" button
   - Verify ding plays on Google Homes
   - Monitor logs for errors

#### Acceptance Criteria
- [x] Documentation complete and reviewed
- [x] Production deployment successful
- [x] All services running and healthy
- [x] Test alert works in production
- [x] No errors in logs for 24 hours post-deployment

---

## Rollback Plan

### If Issues Found After Deployment

1. **Immediate Rollback (Critical Issues)**
   ```bash
   cd /path/to/solar
   git revert HEAD~N  # Revert to pre-alert commits
   docker-compose down
   docker-compose up -d --build
   ```

2. **Database Rollback**
   ```bash
   # If AlertSettings/AlertLog tables cause issues
   docker-compose exec inverter npx prisma migrate resolve --rolled-back <migration-name>
   # Manually drop tables
   docker-compose exec postgres psql -U admin -d inverter -c "DROP TABLE IF EXISTS AlertLog, AlertSettings;"
   ```

3. **Disable Alert System (Soft Rollback)**
   - Set `enabled: false` in AlertSettings via UI
   - Stop poller service: `docker-compose stop inverter-poller`
   - Keep settings data for future re-enablement

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing dashboard | Low | High | Comprehensive testing, feature flag, code review |
| Database migration failure | Low | Medium | Test migration in dev, backup prod DB before deploy |
| Home Assistant connectivity issues | Medium | Medium | Test Tailscale connectivity, implement retry logic |
| Google Home devices not responding | Medium | Low | Test with all devices, fallback to individual devices |
| Poller service crashes | Low | Medium | Add health checks, auto-restart policy, error logging |
| False positive alerts | Medium | Low | Tunable thresholds/duration, cooldown period |
| Alert spam | Low | Medium | Cooldown logic, rate limiting in HA client |
| Timezone bugs | Medium | Low | Comprehensive timezone testing, use date-fns-tz |

---

## Success Metrics

- ✅ Zero breaking changes to existing dashboard
- ✅ Settings UI responsive and intuitive (<3 clicks to configure)
- ✅ Alert triggers within 30 seconds of threshold breach (after duration met)
- ✅ False positive rate <5% over 7 days
- ✅ System uptime >99.9%
- ✅ Google Home response time <3 seconds
- ✅ Alert history provides clear audit trail
- ✅ User can configure without documentation (self-explanatory UI)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database Schema | 0.5 hours | None |
| Phase 2: Backend API | 2 hours | Phase 1 |
| Phase 3: Frontend UI | 4 hours | Phase 2 |
| Phase 4: Alert Engine | 3 hours | Phase 1, 2 |
| Phase 5: HA Integration | 2 hours | Phase 4 |
| Phase 6: Docker Config | 1 hour | Phase 4, 5 |
| Phase 7: HA Setup | 3 hours | Phase 5 |
| Phase 8: Testing | 3 hours | All phases |
| Phase 9: Documentation | 2 hours | All phases |
| **Total** | **20.5 hours** | |

**Buffer for unexpected issues:** +30% = **~27 hours total**

---

## Next Steps

1. ✅ Review this plan with stakeholders
2. ⬜ Set up development environment (local DB, test HA instance)
3. ⬜ Begin Phase 1 (Database Schema)
4. ⬜ Checkpoint review after Phase 3 (UI visible for feedback)
5. ⬜ Checkpoint review after Phase 7 (HA setup complete)
6. ⬜ Production deployment after Phase 9

---

## Notes & Decisions

- **Why separate poller service?** Isolates alert logic from web app, allows independent scaling/restart, cleaner separation of concerns
- **Why Home Assistant vs direct Google API?** HA abstracts Google Cast complexity, provides future extensibility (notifications, other actions), already handles OAuth
- **Why database for settings vs config file?** Allows UI-based configuration without code deployments, easier for non-technical users
- **Why 10-second polling interval?** Balances responsiveness with system load; aligned with 5-second client polling cadence
- **Why timezone in settings?** VPS may run in different timezone than user; explicit timezone prevents confusion

---

**Document Version:** 1.0  
**Last Updated:** January 26, 2026  
**Author:** Development Team  
**Status:** Awaiting Approval ✋

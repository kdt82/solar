# Home Assistant Setup Guide for Solar Dashboard Alerts

This guide walks you through setting up Home Assistant on your Raspberry Pi to enable Google Home alerts for the solar dashboard grid import monitoring system.

## Prerequisites

- Raspberry Pi (Pi 4 recommended, 2GB+ RAM)
- microSD card (32GB+ recommended)
- Google Home devices on your local network
- Tailscale account (already configured on your VPS)

---

## Step 1: Install Home Assistant OS

### Download and Flash

1. Download **Home Assistant OS** for Raspberry Pi:
   - Visit: https://www.home-assistant.io/installation/raspberrypi
   - Select your Pi model (likely Pi 4)
   - Download the `.img.xz` file

2. Flash to microSD card using **Raspberry Pi Imager**:
   - Download: https://www.raspberrypi.com/software/
   - Select "Use custom" and choose the downloaded HA OS image
   - Select your microSD card
   - Click "Write"

3. Insert microSD into Pi and power on

### Initial Setup

1. Wait ~20 minutes for first boot (Home Assistant prepares the system)

2. Access Home Assistant web UI:
   - Try: `http://homeassistant.local:8123`
   - Or: `http://RASPBERRY_PI_IP:8123`
   - Find Pi IP from your router's DHCP client list if needed

3. Complete onboarding wizard:
   - Create admin account (save credentials!)
   - Set location (for weather, etc.)
   - Skip optional integrations for now

---

## Step 2: Configure Google Cast Integration

### Add Google Cast

1. Navigate: **Settings → Devices & Services → Add Integration**

2. Search for "**Google Cast**" and click

3. Home Assistant will auto-discover Google Home devices on your LAN
   - Ensure devices are powered on and connected to same network as Pi

4. Verify all devices appear:
   - Navigate: **Settings → Devices & Services → Google Cast**
   - Click "X devices" to see list
   - Each device will have entity ID like: `media_player.living_room_speaker`

### Create Speaker Group

1. Navigate: **Settings → Devices & Services → Helpers**

2. Click "**+ Create Helper**" button

3. Select: **Group → Media Player Group**

4. Configure group:
   - **Name**: `Google Home Group` (or your preference)
   - **Entity ID**: Will auto-generate as `media_player.google_home_group`
   - **Members**: Select all Google Home devices you want to include
   - Click "Create"

5. **Note the entity ID** — you'll enter this in the dashboard Settings UI

---

## Step 3: Add Alert Sound File

### Prepare Audio File

1. **Option A**: Use provided `ding.mp3`
   - If you don't have one, create/download a short ding sound (1-3 seconds)
   - Format: MP3, WAV, or OGG
   - Keep file small (<1MB)

2. **Option B**: Use TTS for testing (temporary)
   - Skip this step and use TTS in script (less ideal for quick alerts)

### Upload to Home Assistant

#### Method 1: File Editor Add-on (Recommended)

1. Install File Editor add-on:
   - **Settings → Add-ons → Add-on Store**
   - Search "File Editor" (official add-on)
   - Click "Install"

2. Start File Editor:
   - Click "Start"
   - Optional: Enable "Show in sidebar"

3. Upload ding file:
   - Open File Editor from sidebar
   - Navigate to `/config/www/` (create folder if missing)
   - Click upload icon
   - Select `ding.mp3`

#### Method 2: SSH/Terminal (Advanced)

1. Enable SSH access:
   - **Settings → Add-ons → SSH & Web Terminal**
   - Install and start

2. SCP file to Pi:
   ```bash
   scp ding.mp3 root@RASPBERRY_PI_IP:/config/www/
   ```

### Verify File Accessibility

1. Open browser: `http://RASPBERRY_PI_IP:8123/local/ding.mp3`
   - Should play or download the audio file
   - If 404, check file path: `/config/www/ding.mp3`

---

## Step 4: Create Alert Script

### Edit Configuration File

1. Access `configuration.yaml`:
   - **File Editor add-on**: Click `configuration.yaml` in file tree
   - Or SSH: `nano /config/configuration.yaml`

2. Add the following script at the end of the file:

```yaml
script:
  play_grid_alert_ding:
    alias: "Play Grid Alert Ding"
    description: "Plays a ding sound on Google Home speakers for grid import alerts"
    mode: single
    fields:
      target_group:
        description: "Media player entity ID or group"
        example: "media_player.google_home_group"
      alert_volume:
        description: "Volume level (0.0 - 1.0)"
        example: 0.5
    sequence:
      # Step 1: Set volume for alert
      - service: media_player.volume_set
        target:
          entity_id: "{{ target_group }}"
        data:
          volume_level: "{{ alert_volume }}"
      
      # Step 2: Play the ding sound
      - service: media_player.play_media
        target:
          entity_id: "{{ target_group }}"
        data:
          media_content_id: "http://{{ HA_LOCAL_IP }}:8123/local/ding.mp3"
          media_content_type: "music"
      
      # Step 3: Wait for sound to finish
      - delay:
          seconds: 3
```

3. **Replace `{{ HA_LOCAL_IP }}`** with your Pi's local IP:
   - Example: `http://192.168.1.100:8123/local/ding.mp3`
   - Find IP: **Settings → System → Network** in Home Assistant

### Validate Configuration

1. Navigate: **Developer Tools → YAML → Check Configuration**

2. Click "**Check Configuration**" button

3. Look for errors related to the script section:
   - ✅ "Configuration valid" = success
   - ❌ Errors shown = fix YAML syntax (check indentation)

### Restart Home Assistant

1. Navigate: **Settings → System → Restart**

2. Click "**Restart Home Assistant**"

3. Wait ~1 minute for restart to complete

---

## Step 5: Test the Script Manually

### Run Script from UI

1. Navigate: **Developer Tools → Services**

2. Select service: `script.turn_on`

3. Choose target:
   - **Entity**: `script.play_grid_alert_ding`

4. Enter service data (YAML tab):
```yaml
variables:
  target_group: media_player.google_home_group
  alert_volume: 0.5
```

5. Click "**Call Service**"

6. **Expected result**: All Google Homes in the group play the ding sound at 50% volume

### Troubleshooting

**No sound?**
- Check Google Home devices are online (they should show in Devices & Services)
- Verify `ding.mp3` URL is accessible from browser
- Try higher volume (0.8 instead of 0.5)
- Check speaker group includes at least one device

**Error: "Unable to find service"?**
- Ensure script was added to `configuration.yaml` correctly
- Verify Home Assistant restarted after editing config

---

## Step 6: Generate Long-Lived Access Token

### Create Token

1. Navigate: **Profile** (click your name in bottom-left corner)

2. Scroll down to: **Long-Lived Access Tokens**

3. Click "**Create Token**"

4. Enter name: `Solar Dashboard Alert System`

5. Click "**OK**"

6. **IMPORTANT**: Copy the token immediately!
   - Format: `eyJ0eXAiOiJKV1QiLCJ...` (long string)
   - This is shown **only once** — save securely
   - If lost, delete and create new token

### Add Token to VPS

1. SSH to your VPS:
   ```bash
   ssh user@your-vps-ip
   ```

2. Navigate to solar project:
   ```bash
   cd /path/to/solar
   ```

3. Edit `.env` file:
   ```bash
   nano .env
   ```

4. Uncomment and set variables:
   ```env
   HA_TAILSCALE_IP=100.x.x.x  # Your Pi's Tailscale IP (see next step)
   HA_TOKEN=eyJ0eXAiOiJKV1QiLCJ...  # Token from above
   ```

5. Save and exit (Ctrl+O, Enter, Ctrl+X)

---

## Step 7: Configure Tailscale on Raspberry Pi

### Install Tailscale

1. SSH to Raspberry Pi:
   ```bash
   ssh root@RASPBERRY_PI_IP
   ```

2. Install Tailscale:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

3. Authenticate:
   ```bash
   tailscale up
   ```
   - Follow the URL shown to authenticate in browser
   - Use same Tailscale account as your VPS

### Get Tailscale IP

1. On Raspberry Pi, run:
   ```bash
   tailscale ip -4
   ```
   - Example output: `100.101.102.103`

2. **Note this IP** — this is your `HA_TAILSCALE_IP`

3. Update VPS `.env` file with this IP (see Step 6)

### Test Connectivity from VPS

1. SSH to VPS

2. Test ping:
   ```bash
   ping 100.x.x.x  # Your Pi's Tailscale IP
   ```
   - Should see replies (Ctrl+C to stop)

3. Test HA API:
   ```bash
   curl http://100.x.x.x:8123/api/
   ```
   - Should return JSON with HA version info
   - If "401 Unauthorized" = normal (no token in request)
   - If connection refused = check Tailscale setup

---

## Step 8: Update Dashboard Settings

### Configure Alert Settings in UI

1. Access your solar dashboard: `https://solar.bespokeaistudios.online`

2. Click "**Settings**" tab (next to "Last updated" time)

3. Configure alert parameters:
   - **Enable/Disable**: Toggle ON
   - **Time Window Start**: `00:00` (or your preference)
   - **Time Window End**: `23:59` (or your preference)
   - **Grid Import Threshold**: `2.5` kW (adjust based on your usage)
   - **Duration**: `5` minutes (how long above threshold before alert)
   - **Cooldown**: `15` minutes (time between repeated alerts)
   - **Speaker Group Entity**: `media_player.google_home_group`
   - **Volume**: `0.5` (50% — adjust to preference)
   - **Timezone**: `Australia/Sydney` (or your local timezone)

4. Click "**Save Settings**"

5. Click "**Test Alert**" button:
   - Should immediately play ding on all Google Homes
   - If successful, you'll see green success toast
   - If error, check browser console and VPS logs

---

## Step 9: Deploy and Monitor

### Rebuild Docker Containers

1. SSH to VPS

2. Navigate to project:
   ```bash
   cd /path/to/solar
   ```

3. Stop containers:
   ```bash
   docker-compose down
   ```

4. Rebuild with new code:
   ```bash
   docker-compose up -d --build
   ```

5. Run database migration:
   ```bash
   docker-compose exec inverter npx prisma migrate deploy
   ```

6. Check logs:
   ```bash
   docker-compose logs -f inverter-poller
   ```

### Monitor Alert Poller

Expected log output:
```
[Alert Poller] Starting alert evaluation service...
[Alert Poller] Poll interval: 10 seconds
[Alert Poller] Grid: 1.25 kW | Grid import (1.25 kW) below threshold (2.5 kW) | State: ...
```

When threshold exceeded:
```
[Alert Poller] Grid: 2.75 kW | Above threshold for 3.0 of 5 minutes | State: ...
...
[Alert Poller] 🔔 TRIGGERING ALERT!
```

---

## Troubleshooting

### Alert Not Triggering

1. **Check Settings Tab**: Ensure "Enabled" toggle is ON
2. **Check Time Window**: Verify current time is within configured window
3. **Check Threshold**: Ensure grid import actually exceeds threshold
4. **Check Logs**: `docker-compose logs -f inverter-poller`

### Google Homes Not Playing Sound

1. **Test Script in HA**: Run script manually (Step 5) to isolate issue
2. **Check Speaker Group**: Verify devices are in the group
3. **Check Volume**: Try higher volume (0.8 or 1.0)
4. **Check Network**: Ensure Pi and Google Homes on same LAN

### VPS Can't Reach Home Assistant

1. **Test Tailscale**: `ping 100.x.x.x` from VPS
2. **Check HA Running**: Access `http://100.x.x.x:8123` from VPS browser
3. **Verify Token**: Ensure `HA_TOKEN` in `.env` is correct
4. **Check Firewall**: Tailscale should handle this, but verify no blocks

---

## Maintenance

### Update Alert Sound

1. Replace `/config/www/ding.mp3` with new audio file
2. No restart needed — takes effect immediately

### Modify Script Logic

1. Edit `configuration.yaml`
2. Check configuration
3. Restart Home Assistant

### View Alert History

Access dashboard Settings tab → scroll to see recent alert logs (if implemented).

---

## Security Notes

- **Long-lived tokens** have no expiry — rotate periodically
- **Tailscale** provides encrypted tunnel — no public exposure needed
- **Never commit** `.env` file with real tokens to git

---

## Additional Resources

- Home Assistant docs: https://www.home-assistant.io/docs/
- Tailscale docs: https://tailscale.com/kb/
- Google Cast integration: https://www.home-assistant.io/integrations/cast/

---

**Setup Complete!** 🎉

Your solar dashboard will now alert you via Google Home speakers when grid import exceeds your configured threshold.

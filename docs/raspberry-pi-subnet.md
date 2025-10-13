# Raspberry Pi Subnet Router Setup

Use these steps to let the Railway service reach the local Fronius inverters through Tailscale. The Pi becomes a subnet router that advertises the `192.168.50.0/24` LAN to your tailnet.

## 1. Prepare the Pi

Ensure the Pi:

- Runs Raspberry Pi OS Lite (Bookworm or Bullseye) with internet access.
- Has a static DHCP reservation on the home router (recommended).
- Sits on the same LAN as the inverters (e.g. `192.168.50.x`).

Update packages and reboot if the kernel upgrades:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

## 2. Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

For unattended installations you can pre-create a reusable auth key in the Tailscale admin console (`https://login.tailscale.com/admin/settings/keys`). Keep it scoped to `Server` role, reusable, and **without** expiry if the Pi should stay online.

## 3. Enable IP forwarding

Subnet routing requires IPv4 forwarding:

```bash
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-tailscale-ipforward.conf
sudo sysctl --system
```

If you run a firewall such as `ufw`, allow Tailscale traffic:

```bash
sudo ufw allow in on tailscale0
sudo ufw allow out on tailscale0
```

## 4. Bring the Pi onto the tailnet

Run `tailscale up` once to authenticate and advertise the LAN route. Replace placeholders before running the command.

```bash
sudo tailscale up \
  --authkey=tskey-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --hostname=solar-subnet-router \
  --advertise-routes=192.168.50.0/24 \
  --accept-dns=false
```

Notes:

- If you prefer the interactive login flow, drop `--authkey` and complete the browser prompt. Afterwards, re-run `tailscale up` with the same flags minus `--authkey`.
- `--accept-dns=false` keeps the Pi from overriding your LAN DNS settings.
- Adjust the subnet if your inverter LAN differs.

## 5. Approve the advertised route

Open the Tailscale admin console under **Machines**, locate the Pi, and approve the `192.168.50.0/24` route. If ACLs require explicit permissions, add something like:

```json
{
  "tagOwners": {
    "tag:subnet-router": ["admin@example.com"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:railway-service"],
      "dst": ["192.168.50.0/24:*"]
    }
  ],
  "autoApprovers": {
    "routes": {
      "192.168.50.0/24": ["tag:subnet-router"]
    }
  }
}
```

Tag the Pi with `tag:subnet-router` and the Railway container with `tag:railway-service`, or adjust to match your existing policy file.

## 6. Verify connectivity

From the Pi:

```bash
tailscale status
tailscale netcheck
```

From the Railway shell (or any other node on the tailnet):

```bash
curl http://192.168.50.27/solar_api/GetPowerFlowRealtimeData.fcgi
curl http://192.168.50.97/solar_api/GetPowerFlowRealtimeData.fcgi
```

Successful responses confirm that the routes are live.

## 7. Keep the route persistent

`tailscale up` writes its settings to `/var/lib/tailscale/tailscaled.state`, so the route survives reboots automatically. Ensure the Tailscale service starts on boot:

```bash
sudo systemctl enable tailscaled
sudo systemctl restart tailscaled
```

You can later adjust flags without re-authenticating:

```bash
sudo tailscale set --advertise-routes=192.168.50.0/24
```

## 8. Troubleshooting tips

- **Route not reachable:** Re-check that the route is approved in the admin console and that ACLs permit the Railway node to reach `192.168.50.0/24`.
- **Inverters still unreachable:** Confirm the Pi can ping the inverter IPs locally; if not, investigate LAN cabling, DHCP leases, or inverter network settings.
- **Railway container offline:** Verify `TAILSCALE_AUTH_KEY` is populated and that the Railway service logs include `Connected` before it attempts to poll the inverters.
- **DNS conflicts:** Leave `--accept-dns=false` or configure MagicDNS appropriately to avoid overriding LAN DNS.

Once the Pi advertises the subnet and the Railway service joins the tailnet, the dashboard can poll both inverters securely over Tailscale.

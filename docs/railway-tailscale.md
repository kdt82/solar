# Railway + Tailscale Setup

Follow these steps to let the Railway deployment join your Tailscale tailnet and reach the Fronius inverters that sit behind the Raspberry Pi subnet router.

## 1. Prerequisites

- A Railway account with a project that can run Docker-based services.
- This repository pushed to GitHub (or another git host that Railway can pull from).
- A Tailscale account with admin access to generate auth keys and approve routes.
- An existing subnet router (e.g. the Raspberry Pi from `docs/raspberry-pi-subnet.md`) advertising `192.168.50.0/24`.

## 2. Create the Railway service

1. In Railway, create a new project and select **Deploy from GitHub**.
2. Point Railway to this repository. The platform will detect the included `Dockerfile`.
3. Add a persistent volume mounted at `/data` so SQLite snapshots survive restarts (size: 1–2 GB is usually enough).

## 3. Configure environment variables

Populate these variables under **Variables** → **New Variable**:

| Variable | Value suggestion | Notes |
| --- | --- | --- |
| `PORT` | `3000` | Railway injects this automatically; confirm it exists. |
| `SOLAR_DB_PATH` | `/data/solar.db` | Matches the mounted volume. |
| `FRONIUS_PROPERTY_LABEL` | e.g. `5 Oxford Road` | Shown in the dashboard banner. |
| `FRONIUS_NELSONS_URL` | `http://192.168.50.97` | Internal Fronius endpoint. |
| `FRONIUS_GRANNY_URL` | `http://192.168.50.27` | Internal Fronius endpoint. |
| `FRONIUS_TIMEOUT_MS` | `3500` | Adjust if the inverters respond slowly. |
| `NEXT_PUBLIC_MAX_GENERATION` | e.g. `12000` | Scales the live production gauge. |
| `TAILSCALE_ENABLED` | `1` | Leave enabled so the entrypoint joins Tailscale. |
| `TAILSCALE_STATE_DIR` | `/tmp` | Tailscale state lives on the ephemeral FS. |
| `TAILSCALE_HOSTNAME` | `solar-railway` | Optional, appears in the Tailscale admin console. |
| `TAILSCALE_AUTH_KEY` | `tskey-ephemeral-…` | Required. See next section. |
| `TAILSCALE_ADDITIONAL_FLAGS` | *(leave blank unless needed)* | Optional extra flags; the entrypoint already sets `--accept-dns=false` if you do not provide your own value. |

If either inverter is behind Cloudflare Access, add the corresponding `FRONIUS_*_CF_ID` and `FRONIUS_*_CF_SECRET` values as well.

## 4. Generate a Tailscale auth key

1. Open `https://login.tailscale.com/admin/settings/keys`.
2. Click **Generate auth key**.
3. Choose **Ephemeral** so the key automatically expires once the service disconnects.
4. Restrict the key to the **Server** role and leave **Reusable** disabled for better security.
5. Copy the `tskey-…` string into the Railway `TAILSCALE_AUTH_KEY` variable.

The `start.sh` entrypoint refuses to boot without this value when Tailscale is enabled.

## 5. Understand the startup flow

Railway builds the Docker image and runs `start.sh`, which:

1. Launches `tailscaled` in userspace networking mode.
2. Runs `tailscale up` with the environment variables you defined.
3. Holds the process open until `npm start` runs the Next.js production server.

If `TAILSCALE_ENABLED` is set to `0`, the script skips these steps and starts the web server immediately.

## 6. Deploy and approve the route

1. Trigger a deployment in Railway (e.g. by pushing to the tracked branch).
2. Watch the service logs; you should see lines like `Running tailscale up …` followed by `Tailscale is up.` and `ready - started server`.
3. In the Tailscale admin console → **Machines**, find the `solar-railway` node.
4. Approve any pending subnet routes (e.g. `192.168.50.0/24`) and tag the node if your ACLs require it (e.g. `tag:railway-service`).

Ensure your ACL file allows the Railway tag to talk to the subnet router, similar to the example in `docs/raspberry-pi-subnet.md`. Only populate `TAILSCALE_ADDITIONAL_FLAGS` when you need extra options (for example `--advertise-tags=tag:railway-service`). The entrypoint automatically skips its default `--accept-dns=false` when you supply your own `--accept-dns` flag, but avoid duplicating other flags because `tailscale up` will still abort on conflicting values.

## 7. Verify inverter connectivity

From the Railway service shell (`railway run sh` or the web console):

```bash
curl --fail http://192.168.50.27/solar_api/GetPowerFlowRealtimeData.fcgi
curl --fail http://192.168.50.97/solar_api/GetPowerFlowRealtimeData.fcgi
```

Successful responses confirm the tailnet path is working. The application logs should also show regular polling without `ECONNREFUSED` or timeout errors.

## 8. Ongoing maintenance tips

- Rotate the Tailscale auth key whenever you rotate other Railway secrets.
- Keep the Raspberry Pi subnet router online; the Railway node depends on that route advertisement.
- If you deploy multiple Railway environments (e.g. staging/production), generate distinct auth keys and hostnames per environment.
- Review Railway logs after upgrades to ensure `tailscale up` still succeeds; failures usually indicate an expired key or changes in ACLs.

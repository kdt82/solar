## Fronius Solar Dashboard

Next.js 15 dashboard that proxy-polls two Fronius inverters, persists snapshots to SQLite, and visualises live plus historical metrics for both dwellings.

## Local Development

```bash
npm install
npm run dev
```

The app expects the Fronius endpoints to be reachable from your machine. Copy `.env.local.example` to `.env.local` and adjust the IP addresses if required.

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `FRONIUS_PROPERTY_LABEL` | Display name for the property banner | `5 Oxford Road` |
| `FRONIUS_NELSONS_URL` | Base URL for dwelling one inverter | `http://192.168.50.97` |
| `FRONIUS_GRANNY_URL` | Base URL for dwelling two inverter | `http://192.168.50.27` |
| `FRONIUS_TIMEOUT_MS` | Request timeout when polling devices | `3500` |
| `NEXT_PUBLIC_MAX_GENERATION` | Gauge scaling for live cards | `12000` |
| `SOLAR_DB_PATH` | SQLite file path. Points to `/data/solar.db` when running in containers/Railway | `./data/solar.db` |
| `TAILSCALE_AUTH_KEY` | (Railway/container) Ephemeral auth key used to join the Tailscale network. Required when Tailscale is enabled | |
| `TAILSCALE_HOSTNAME` | Optional hostname to report to Tailscale | `solar-railway` |
| `TAILSCALE_STATE_DIR` | Directory to persist the Tailscale state file | `/tmp` |
| `TAILSCALE_ADDITIONAL_FLAGS` | Extra flags passed to `tailscale up` | `--accept-dns=false` |
| `TAILSCALE_ENABLED` | Set to `0` to skip Tailscale startup (defaults to `1`) | `1` |
| `FRONIUS_NELSONS_CF_ID` / `FRONIUS_NELSONS_CF_SECRET` | Optional headers for Cloudflare Access protecting the Nelsons inverter hostname | |
| `FRONIUS_GRANNY_CF_ID` / `FRONIUS_GRANNY_CF_SECRET` | Optional headers for Cloudflare Access protecting the Granny inverter hostname | |

The application creates the containing directory automatically.

## Production Build

```bash
npm run build
npm start
```

## Railway Deployment Prep

The repository contains a multi-stage `Dockerfile` tailored for Railway. Railway’s default build flow will detect it and use the following sequence:

1. Install dependencies with `npm ci --omit=dev` (native build tooling is pre-installed for `better-sqlite3`).
2. Run `npm run build`.
3. Launch the service through an entry script that brings up Tailscale and then runs `npm start` on port `3000`.

Recommended Railway configuration once the repository is pushed to GitHub:

1. Create a new Railway project directly from the GitHub repo.
2. In the service settings add the environment variables above. Override `SOLAR_DB_PATH` with `/data/solar.db` so the SQLite database lives on the mounted persistent volume.
3. Attach a Railway volume (e.g. `/data`, 1 GB is usually plenty) to preserve historical records between deploys.
4. Set `TAILSCALE_AUTH_KEY` (Railway secret) to an ephemeral auth key generated from the Tailscale admin console. Optionally define `TAILSCALE_HOSTNAME`, `TAILSCALE_STATE_DIR`, or `TAILSCALE_ADDITIONAL_FLAGS`.
5. Ensure the `PORT` variable is set to `3000` (Railway injects this automatically).
6. On a device inside your home network, install Tailscale and run `tailscale up --advertise-routes=192.168.50.0/24 --accept-dns=false`. Approve the subnet route in the Tailscale admin console so the Railway node can reach the Fronius IPs.
   - Detailed Raspberry Pi setup instructions live in `docs/raspberry-pi-subnet.md`.
7. Follow `docs/railway-tailscale.md` for a full Railway + Tailscale deployment walkthrough.

No deployment has been triggered from this workspace; pushing to GitHub keeps the setup ready for future Railway runs.

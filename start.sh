#!/bin/sh
set -eu

if [ "${TAILSCALE_ENABLED:-1}" != "0" ]; then
  if [ -z "${TAILSCALE_AUTH_KEY:-}" ]; then
    echo "TAILSCALE_AUTH_KEY must be set when Tailscale is enabled." >&2
    exit 1
  fi

  STATE_DIR=${TAILSCALE_STATE_DIR:-/tmp}
  mkdir -p "${STATE_DIR}"

  PATH="/usr/sbin:/usr/bin:${PATH}"

  /usr/sbin/tailscaled --tun=userspace-networking --state="${STATE_DIR}/tailscale.state" &
  TAILSCALED_PID=$!

  cleanup() {
    kill "${TAILSCALED_PID}" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT INT TERM

  sleep 2

  TS_FLAGS="
    --authkey=${TAILSCALE_AUTH_KEY}
    --hostname=${TAILSCALE_HOSTNAME:-solar-railway}
    --accept-routes
  "

  ADDITIONAL_FLAGS="${TAILSCALE_ADDITIONAL_FLAGS:-}"

  case " ${ADDITIONAL_FLAGS} " in
    *" --accept-dns"*|*" --accept-dns="*)
      ;;
    *)
      TS_FLAGS="${TS_FLAGS} --accept-dns=false"
      ;;
  esac

  if [ -n "${ADDITIONAL_FLAGS}" ]; then
    TS_FLAGS="${TS_FLAGS} ${ADDITIONAL_FLAGS}"
  fi

  # shellcheck disable=SC2086 # intentional splitting of TS_FLAGS into words
  if ! tailscale up ${TS_FLAGS}; then
    echo "tailscale up failed; exiting" >&2
    exit 1
  fi
  
  echo "Tailscale is up. Testing connectivity to Fronius devices..."
  
  # Test connectivity to the Fronius devices
  FRONIUS_NELSONS_URL="${FRONIUS_NELSONS_URL:-http://192.168.50.97}"
  FRONIUS_GRANNY_URL="${FRONIUS_GRANNY_URL:-http://192.168.50.27}"
  
  echo "Testing connection to Nelsons House: ${FRONIUS_NELSONS_URL}"
  if wget -q --spider --timeout=5 "${FRONIUS_NELSONS_URL}/solar_api/v1/GetPowerFlowRealtimeData.fcgi" 2>/dev/null; then
    echo "✓ Nelsons House is reachable"
  else
    echo "✗ WARNING: Cannot reach Nelsons House at ${FRONIUS_NELSONS_URL}"
    echo "  This may indicate:"
    echo "  - Raspberry Pi subnet router is offline"
    echo "  - Subnet routes not approved in Tailscale admin"
    echo "  - Fronius inverter is offline"
  fi
  
  echo "Testing connection to Granny Flat: ${FRONIUS_GRANNY_URL}"
  if wget -q --spider --timeout=5 "${FRONIUS_GRANNY_URL}/solar_api/v1/GetPowerFlowRealtimeData.fcgi" 2>/dev/null; then
    echo "✓ Granny Flat is reachable"
  else
    echo "✗ WARNING: Cannot reach Granny Flat at ${FRONIUS_GRANNY_URL}"
  fi
  
  echo "Connectivity tests complete. Starting application..."
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"

export HOST
export HOSTNAME="${HOSTNAME:-${HOST}}"
export PORT

exec npm start

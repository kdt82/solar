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

  /usr/sbin/tailscaled --tun=userspace-networking --socks5-server=localhost:1055 --state="${STATE_DIR}/tailscale.state" &
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
  
  echo "Tailscale is up. Configuring routing..."
  
  # Configure Node.js to use Tailscale's SOCKS5 proxy
  # This routes all network requests through Tailscale
  export ALL_PROXY="socks5://localhost:1055"
  export HTTP_PROXY="socks5://localhost:1055"
  export HTTPS_PROXY="socks5://localhost:1055"
  
  echo "Configured to route through Tailscale SOCKS5 proxy on localhost:1055"
  echo "Starting application..."
  
  echo ""
  echo "Testing connectivity to Fronius devices (non-blocking)..."
  
  # Test connectivity to the Fronius devices in background
  # These tests won't block startup but will show in logs
  (
    sleep 3
    FRONIUS_NELSONS_URL="${FRONIUS_NELSONS_URL:-http://192.168.50.97}"
    FRONIUS_GRANNY_URL="${FRONIUS_GRANNY_URL:-http://192.168.50.27}"
    
    echo "[Connectivity Test] Testing Nelsons House: ${FRONIUS_NELSONS_URL}"
    if timeout 10 wget -qO- "${FRONIUS_NELSONS_URL}/solar_api/v1/GetPowerFlowRealtimeData.fcgi" > /dev/null 2>&1; then
      echo "[Connectivity Test] ✓ Nelsons House is REACHABLE"
    else
      EXIT_CODE=$?
      echo "[Connectivity Test] ✗ FAILED: Cannot reach Nelsons House at ${FRONIUS_NELSONS_URL} (exit code: $EXIT_CODE)"
      echo "[Connectivity Test] Attempting to diagnose..."
      echo "[Connectivity Test] Route table for 192.168.50.0/24:"
      ip route get 192.168.50.97 2>&1 || echo "No route found"
      echo "[Connectivity Test] Testing if subnet router is reachable:"
      ping -c 2 100.101.76.116 2>&1 || echo "Cannot ping subnet router"
    fi
    
    echo "[Connectivity Test] Testing Granny Flat: ${FRONIUS_GRANNY_URL}"
    if timeout 10 wget -qO- "${FRONIUS_GRANNY_URL}/solar_api/v1/GetPowerFlowRealtimeData.fcgi" > /dev/null 2>&1; then
      echo "[Connectivity Test] ✓ Granny Flat is REACHABLE"
    else
      echo "[Connectivity Test] ✗ FAILED: Cannot reach Granny Flat at ${FRONIUS_GRANNY_URL}"
    fi
    
    echo "[Connectivity Test] Tests complete."
  ) &
  
  echo "Starting application (connectivity tests running in background)..."
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"

export HOST
export HOSTNAME="${HOSTNAME:-${HOST}}"
export PORT

exec npm start

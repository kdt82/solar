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

  if ! tailscale up \
    --authkey="${TAILSCALE_AUTH_KEY}" \
    --hostname="${TAILSCALE_HOSTNAME:-solar-railway}" \
    --accept-routes \
    --accept-dns=false \
    ${TAILSCALE_ADDITIONAL_FLAGS:-}; then
    echo "tailscale up failed; exiting" >&2
    exit 1
  fi
fi

exec npm start

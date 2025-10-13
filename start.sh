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
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"

export HOST
export HOSTNAME="${HOSTNAME:-${HOST}}"
export PORT

exec npm start

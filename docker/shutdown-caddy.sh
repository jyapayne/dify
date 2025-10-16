#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$SCRIPT_DIR/caddy/state"
PID_FILE="$STATE_DIR/pids/caddy.pid"
STARTUP_LOG="$STATE_DIR/logs/startup.log"
SHUTDOWN_LOG="$STATE_DIR/logs/shutdown.log"

mkdir -p "$(dirname "$PID_FILE")" "$(dirname "$SHUTDOWN_LOG")"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$SHUTDOWN_LOG"
}

error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$SHUTDOWN_LOG" >&2
}

if [ ! -f "$PID_FILE" ]; then
    log "No Caddy PID file found; nothing to stop."
    exit 0
fi

PID="$(cat "$PID_FILE")"
if ! kill -0 "$PID" >/dev/null 2>&1; then
    log "Caddy process (PID $PID) not running; removing stale PID file."
    rm -f "$PID_FILE"
    exit 0
fi

log "Stopping Caddy (PID $PID)..."
if caddy stop --pidfile "$PID_FILE" >/dev/null 2>&1; then
    log "Caddy stopped successfully."
    rm -f "$PID_FILE"
else
    error "Failed to stop Caddy via caddy stop; attempting manual kill."
    kill "$PID" >/dev/null 2>&1 || true
    sleep 2
    if kill -0 "$PID" >/dev/null 2>&1; then
        error "Unable to stop Caddy (PID $PID)."
        exit 1
    fi
    log "Caddy process terminated."
    rm -f "$PID_FILE"
fi

log "Shutdown complete. Logs available at $STARTUP_LOG and $SHUTDOWN_LOG."

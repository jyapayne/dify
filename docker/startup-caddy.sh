#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CADDY_DIR="$SCRIPT_DIR/caddy"
STATE_DIR="$CADDY_DIR/state"
LOG_DIR="$STATE_DIR/logs"
PID_DIR="$STATE_DIR/pids"
CADDYFILE_PATH="$STATE_DIR/Caddyfile"
PID_FILE="$PID_DIR/caddy.pid"
STARTUP_LOG="$LOG_DIR/startup.log"
CONFIG_PATH="${CADDY_SITE_CONFIG:-$CADDY_DIR/sites.json}"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$LOG_DIR" "$PID_DIR"
export LOG_DIR
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH:-}"

# Provide defaults for configuration variables consumed by sites.json
export DIFY_ADDRESS="${DIFY_ADDRESS:-dify.jojomaw.com}"
export DIFY_REDIRECT="${DIFY_REDIRECT:-true}"
export DIFY_AUTO_HTTPS="${DIFY_AUTO_HTTPS:-true}"
export DIFY_HEALTH_URL="${DIFY_HEALTH_URL:-http://127.0.0.1/health}"
export DIFY_SKIP_HEALTHCHECK="${DIFY_SKIP_HEALTHCHECK:-false}"
export DIFY_APP_URL="${DIFY_APP_URL:-http://127.0.0.1}"
export DIFY_ACME_CHALLENGE="${DIFY_ACME_CHALLENGE:-true}"
export DIFY_API_UPSTREAM="${DIFY_API_UPSTREAM:-127.0.0.1:5001}"
export DIFY_FILES_UPSTREAM="${DIFY_FILES_UPSTREAM:-127.0.0.1:5001}"
export DIFY_MCP_UPSTREAM="${DIFY_MCP_UPSTREAM:-127.0.0.1:5001}"
export DIFY_FRONTEND_UPSTREAM="${DIFY_FRONTEND_UPSTREAM:-127.0.0.1:3000}"
export DIFY_EXPLORE_UPSTREAM="${DIFY_EXPLORE_UPSTREAM:-127.0.0.1:3000}"
export DIFY_PLUGIN_DAEMON_UPSTREAM="${DIFY_PLUGIN_DAEMON_UPSTREAM:-127.0.0.1:5002}"
export DIFY_HOOK_URL_HEADER="${DIFY_HOOK_URL_HEADER:-{scheme}://{host}{uri}}"

export HACKAPROMPT_ADDRESS="${HACKAPROMPT_ADDRESS:-chat.jojomaw.com}"
export HACKAPROMPT_REDIRECT="${HACKAPROMPT_REDIRECT:-true}"
export HACKAPROMPT_AUTO_HTTPS="${HACKAPROMPT_AUTO_HTTPS:-false}"
export HACKAPROMPT_HEALTH_URL="${HACKAPROMPT_HEALTH_URL:-http://127.0.0.1:8080/health}"
export HACKAPROMPT_SKIP_HEALTHCHECK="${HACKAPROMPT_SKIP_HEALTHCHECK:-false}"
export HACKAPROMPT_APP_URL="${HACKAPROMPT_APP_URL:-http://127.0.0.1:8080}"
export HACKAPROMPT_ACME_CHALLENGE="${HACKAPROMPT_ACME_CHALLENGE:-true}"
export HACKAPROMPT_API_UPSTREAM="${HACKAPROMPT_API_UPSTREAM:-127.0.0.1:5501}"
export HACKAPROMPT_APP_ROOT="${HACKAPROMPT_APP_ROOT:-/opt/hackaprompt-chat-viewer}"
export HACKAPROMPT_FRONTEND_ROOT="${HACKAPROMPT_FRONTEND_ROOT:-/opt/hackaprompt-chat-viewer/frontend}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$STARTUP_LOG"
}

error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$STARTUP_LOG" >&2
}

usage() {
    cat <<'EOF'
Usage: startup-caddy.sh [options]

Options:
  --config PATH         Path to the multi-site configuration file (default: docker/caddy/sites.json).
  --regenerate          Force regeneration of the Caddy configuration file.
  --skip-healthcheck    Skip all post-start health checks.
  --validate-only       Regenerate the configuration, run 'caddy validate', and exit.
  -h, --help            Show this help message and exit.

Environment variables:
  CADDY_SITE_CONFIG     Alternative default path to the sites configuration file.
  LOG_DIR               Directory to hold generated log files.
EOF
}

FORCE_REGENERATE=false
GLOBAL_SKIP_HEALTHCHECK=false
VALIDATE_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --config)
            CONFIG_PATH="$2"
            shift 2
            ;;
        --regenerate)
            FORCE_REGENERATE=true
            shift
            ;;
        --skip-healthcheck)
            GLOBAL_SKIP_HEALTHCHECK=true
            shift
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            FORCE_REGENERATE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            exit 1
            ;;
    esac
done

if [ ! -f "$CONFIG_PATH" ]; then
    error "Configuration file not found: $CONFIG_PATH"
    exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
    error "Caddy binary not found in PATH. Install Caddy before running this script."
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    error "python3 is required to render the multi-site configuration"
    exit 1
fi

should_regenerate() {
    if [ "$FORCE_REGENERATE" = true ]; then
        return 0
    fi
    if [ ! -f "$CADDYFILE_PATH" ]; then
        return 0
    fi
    if ! caddy validate --config "$CADDYFILE_PATH" >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

render_caddyfile() {
    local metadata_file="$1"
    python3 - <<PY
from pathlib import Path
from docker.caddy.render_caddy import render_sites, render_metadata_lines

config_path = Path("${CONFIG_PATH}").expanduser().resolve()
log_dir = Path("${LOG_DIR}").expanduser().resolve()
output_path = Path("${CADDYFILE_PATH}").expanduser().resolve()
metadata_path = Path("${1}").expanduser().resolve()

caddy_text, metadata_entries = render_sites(config_path, log_dir)
output_path.write_text(caddy_text, encoding="utf-8")
metadata_path.write_text("\n".join(render_metadata_lines(metadata_entries)) + "\n", encoding="utf-8")
PY
}

load_metadata() {
    python3 - <<PY
from pathlib import Path
from docker.caddy.load_metadata import load_metadata

config_path = Path("${CONFIG_PATH}").expanduser().resolve()
for entry in load_metadata(config_path):
    print(entry.serialize())
PY
}

SITE_METADATA=()

if should_regenerate; then
    log "Rendering Caddy configuration from $CONFIG_PATH"
    metadata_temp="$(mktemp)"
    if render_caddyfile "$metadata_temp"; then
        if command -v caddy >/dev/null 2>&1; then
            log "Formatting generated configuration..."
            caddy fmt --overwrite "$CADDYFILE_PATH" >/dev/null 2>&1 || true
        fi
        mapfile -t SITE_METADATA < "$metadata_temp"
        rm -f "$metadata_temp"
        log "Caddyfile written to $CADDYFILE_PATH"
    else
        rm -f "$metadata_temp"
        error "Failed to generate Caddyfile"
        exit 1
    fi
else
    log "Using existing Caddyfile; pass --regenerate to overwrite"
    mapfile -t SITE_METADATA < <(load_metadata)
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
    error "Caddy appears to be running already (PID $(cat "$PID_FILE"))"
    exit 1
fi

if [ "$VALIDATE_ONLY" = true ]; then
    log "Validating generated configuration..."
    if caddy validate --config "$CADDYFILE_PATH"; then
        log "Configuration validated successfully"
        exit 0
    else
        error "Configuration validation failed"
        exit 1
    fi
fi

log "Starting Caddy..."
if caddy start --config "$CADDYFILE_PATH" --pidfile "$PID_FILE" >/dev/null 2>&1; then
    if [ ! -f "$PID_FILE" ]; then
        error "Caddy reported success but no PID file was created"
        exit 1
    fi
    log "Caddy started successfully (PID $(cat "$PID_FILE"))"
else
    error "Failed to start Caddy"
    exit 1
fi

if [ "$GLOBAL_SKIP_HEALTHCHECK" = true ]; then
    log "Skipping all health checks (global override)"
else
    for entry in "${SITE_METADATA[@]}"; do
        IFS='|' read -r site_name health_url skip_flag app_url <<< "$entry"
        skip_flag=$(printf '%s' "$skip_flag" | tr '[:upper:]' '[:lower:]')
        if [ "$skip_flag" = "true" ]; then
            log "Skipping health check for $site_name (configuration)"
            continue
        fi
        if [ -z "$health_url" ]; then
            log "No health URL provided for $site_name; skipping check"
            continue
        fi
        log "Waiting for $site_name to pass health check at $health_url"
        success=false
        for attempt in {1..30}; do
            if curl -s -k "$health_url" >/dev/null 2>&1; then
                log "$site_name reported healthy"
                success=true
                break
            fi
            sleep 1
        done
        if [ "$success" = false ]; then
            error "$site_name failed health check"
            exit 1
        fi
    done
fi

for entry in "${SITE_METADATA[@]}"; do
    IFS='|' read -r site_name _ _ app_url <<< "$entry"
    if [ -n "$app_url" ]; then
        log "$site_name available at: $app_url"
    else
        log "$site_name available (no app URL configured)"
    fi
fi

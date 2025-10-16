# Caddy Multi-Site Configuration

The Caddy helpers under `docker/` can now generate a single Caddyfile that serves multiple services. Instead of hard-coding upstreams in the shell script, each site to be exposed is described declaratively inside `docker/caddy/sites.json`.

## Layout

```
docker/
  startup-caddy.sh      # Generates Caddyfile + runs caddy start --config ...
  shutdown-caddy.sh     # Stops the running Caddy instance
  caddy/
    sites.json          # Default site definitions (Dify + HackAPrompt example)
    state/              # Generated Caddyfile, logs, pid files
```

Provide an alternative configuration file with `--config` or `CADDY_SITE_CONFIG` if you want a different set of sites.

```
# Use a staging configuration
./docker/startup-caddy.sh --config /path/to/staging-sites.json --regenerate
```

## Config File Format

The configuration file is JSON with a top-level `sites` array. Each site object supports the keys below (all optional unless marked **required**):

| Key | Type | Description |
| --- | ---- | ----------- |
| `name` | string | Display name used in logs; defaults to `site`. |
| `address` | string **required** | Caddy address such as `example.com` or `:8080`. |
| `auto_https` | bool/string | Disable auto HTTPS when serving plain HTTP (default: `true`). |
| `https_redirect` | bool/string | Emit an HTTP→HTTPS redirect block when a hostname is present. |
| `acme_challenge` | bool/string | Adds a handler for `/.well-known/acme-challenge/*`. |
| `headers` | object | Key/value pairs emitted inside a `header { ... }` block. |
| `health_path` | string | Path exposed as a simple `respond` handler (default `/health`). |
| `health_check` | object | `{ "url": "https://...", "skip": false }` controls post-start checks. |
| `app_url` | string | Logged after startup for operator convenience. |
| `log_file` | string | Custom log path; defaults to `$LOG_DIR/<name>-access.log`. |
| `api_routes` | array | Each entry `{ "path": "/api/*", "upstream": "host:port" }` creates a `handle` block with `reverse_proxy`. |
| `static_routes` | array | Each entry `{ "path": "/images/*", "root": "/var/www" }`; add `"browse": true` to enable directory listing. |
| `frontend` | object | `{"type":"reverse_proxy","upstream":"host:port"}` or `{"type":"static","root":"/dir","try_files":[...]} `. |
| `cache_static` | object | `{ "paths": ["*.js", ...], "header": "public, max-age=..." }`. |

All string values are expanded with `os.path.expandvars`, which means you can reference environment variables—`"${LOG_DIR}/dify-access.log"`, `"${DIFY_API_UPSTREAM:-127.0.0.1:5001}"`, etc.

## Example

```
{
  "sites": [
    {
      "name": "dify",
      "address": "${DIFY_ADDRESS:-:80}",
      "https_redirect": "${DIFY_REDIRECT:-false}",
      "api_routes": [
        { "path": "/api/*", "upstream": "${DIFY_API_UPSTREAM:-127.0.0.1:5001}" }
      ],
      "frontend": {
        "type": "reverse_proxy",
        "upstream": "${DIFY_FRONTEND_UPSTREAM:-127.0.0.1:3000}"
      },
      "health_check": {
        "url": "${DIFY_HEALTH_URL:-http://127.0.0.1/health}",
        "skip": "${DIFY_SKIP_HEALTHCHECK:-false}"
      },
      "app_url": "${DIFY_APP_URL:-http://127.0.0.1}"
    },
    {
      "name": "hackaprompt",
      "address": "${HACKAPROMPT_ADDRESS:-:8080}",
      "frontend": {
        "type": "static",
        "root": "${HACKAPROMPT_FRONTEND_ROOT:-/opt/hackaprompt-chat-viewer/frontend}",
        "try_files": ["{path}", "{path}/", "/index.html"]
      },
      "api_routes": [
        { "path": "/api/*", "upstream": "${HACKAPROMPT_API_UPSTREAM:-127.0.0.1:5002}" }
      ],
      "static_routes": [
        { "path": "/images/*", "root": "${HACKAPROMPT_APP_ROOT:-/opt/hackaprompt-chat-viewer}" }
      ]
    }
  ]
}
```

## Health Checks & Logs

After Caddy starts, the script runs a curl-based health check for each site unless `--skip-healthcheck` is passed globally or the site entry sets `"skip": true`. Each check waits up to 30 seconds.

Logs are written to `docker/caddy/state/logs/` by default. Adjust `log_file` per site if you want a different location.

## Stopping Caddy

```
./docker/shutdown-caddy.sh
```

The shutdown helper remains unchanged; it simply reads the PID file and stops the running Caddy instance.

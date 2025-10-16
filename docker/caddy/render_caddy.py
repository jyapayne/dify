"""Render a multi-site Caddyfile from JSON configuration.

This module is invoked by docker/startup-caddy.sh. It reads a JSON config,
expands environment variables, and writes out a Caddyfile plus site metadata
used for health checks and logging.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, List, Tuple
from urllib.parse import urlparse


@dataclass
class SiteMetadata:
    """Compact representation of site health/check details."""

    name: str
    health_url: str
    skip_healthcheck: bool
    app_url: str

    def serialize(self) -> str:
        return "|".join(
            [
                self.name,
                self.health_url,
                "true" if self.skip_healthcheck else "false",
                self.app_url,
            ]
        )


DEFAULT_PATTERN = re.compile(r"\${([^}:]+):-([^}]*)}")


def _expand_string(raw: str) -> str:
    def replace(match: re.Match[str]) -> str:
        var, default = match.group(1), match.group(2)
        current = os.environ.get(var)
        return current if current not in (None, "") else default

    substituted = DEFAULT_PATTERN.sub(replace, raw)
    return os.path.expandvars(substituted)


def _expand(value):  # type: ignore[no-untyped-def]
    if isinstance(value, str):
        return _expand_string(value)
    if isinstance(value, list):
        return [_expand(v) for v in value]
    if isinstance(value, dict):
        return {k: _expand(v) for k, v in value.items()}
    return value


def _to_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    value_str = str(value).strip().lower()
    if value_str in {"true", "1", "yes", "y", "on"}:
        return True
    if value_str in {"false", "0", "no", "n", "off"}:
        return False
    return default


def _iter_headers(value) -> Iterator[Tuple[str, str]]:  # type: ignore[no-untyped-def]
    if isinstance(value, dict):
        for key, val in value.items():
            if key and val is not None:
                yield str(key), str(val)
        return
    if isinstance(value, (list, tuple)):
        for item in value:
            if isinstance(item, dict):
                name = item.get("name") or item.get("header")
                val = item.get("value")
                if name and val is not None:
                    yield str(name), str(val)
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                name, val = item
                if name and val is not None:
                    yield str(name), str(val)
    elif value is not None:
        raise ValueError("Unsupported header specification: %r" % (value,))


def render_sites(config_path: Path, log_dir: Path) -> tuple[str, List[SiteMetadata]]:
    with config_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    raw_sites = data.get("sites", [])
    if not raw_sites:
        raise ValueError("No sites defined in configuration file")

    log_dir.mkdir(parents=True, exist_ok=True)

    blocks: List[str] = []
    metadata: List[SiteMetadata] = []

    for raw_site in raw_sites:
        site = _expand(raw_site)
        name = site.get("name") or "site"
        address = site.get("address")
        if not address:
            raise ValueError(f"Site '{name}' is missing the required 'address' field")

        https_redirect = _to_bool(site.get("https_redirect"), default=False)
        acme_challenge = _to_bool(site.get("acme_challenge"), default=False)

        address = address.strip()

        log_file = site.get("log_file")
        log_path = Path(log_file) if log_file else log_dir / f"{name}-access.log"
        if not log_path.is_absolute():
            log_path = log_dir / log_path
        log_path.parent.mkdir(parents=True, exist_ok=True)

        lines: List[str] = [f"{address} {{"]
        lines.append("    encode gzip")

        headers = site.get("headers") or {}
        if headers:
            lines.append("    header {")
            for key, value in headers.items():
                lines.append(f'        {key} "{value}"')
            lines.append("    }")

        health_path = site.get("health_path", "/health")
        if health_path:
            lines.append(f'    respond {health_path} "OK" 200')

        if acme_challenge:
            lines.extend(
                [
                    "    handle /.well-known/acme-challenge/* {",
                    "        file_server",
                    "    }",
                ]
            )

        for route in site.get("api_routes") or []:
            path = route.get("path")
            upstream = route.get("upstream")
            if not path or not upstream:
                continue
            headers_up = list(_iter_headers(route.get("headers_up")))
            headers_down = list(_iter_headers(route.get("headers_down")))
            lines.append(f"    handle {path} {{")
            if headers_up or headers_down:
                lines.append(f"        reverse_proxy {upstream} {{")
                for key, val in headers_up:
                    lines.append(f"            header_up {key} {val}")
                for key, val in headers_down:
                    lines.append(f"            header_down {key} {val}")
                lines.append("        }")
            else:
                lines.append(f"        reverse_proxy {upstream}")
            lines.append("    }")

        for route in site.get("static_routes") or []:
            path = route.get("path")
            root = route.get("root")
            if not path or not root:
                continue
            browse = _to_bool(route.get("browse"))
            lines.append(f"    handle {path} {{")
            lines.append(f"        root * {root}")
            lines.append("        file_server browse" if browse else "        file_server")
            lines.append("    }")

        if site.get("explore_route"):
            explore = site["explore_route"]
            upstream = explore.get("upstream")
            if upstream:
                lines.append("    handle /explore* {")
                lines.append(f"        reverse_proxy {upstream}")
                lines.append("    }")

        if site.get("hooks_route"):
            hook = site["hooks_route"]
            path = hook.get("path", "/e/*")
            upstream = hook.get("upstream")
            if upstream:
                headers_up = list(_iter_headers(hook.get("headers_up")))
                headers_down = list(_iter_headers(hook.get("headers_down")))
                lines.append(f"    handle {path} {{")
                if headers_up or headers_down:
                    lines.append(f"        reverse_proxy {upstream} {{")
                    for key, val in headers_up:
                        lines.append(f"            header_up {key} {val}")
                    for key, val in headers_down:
                        lines.append(f"            header_down {key} {val}")
                    lines.append("        }")
                else:
                    lines.append(f"        reverse_proxy {upstream}")
                lines.append("    }")

        frontend = site.get("frontend") or {}
        frontend_type = frontend.get("type", "reverse_proxy")
        if frontend_type == "reverse_proxy":
            upstream = frontend.get("upstream")
            if upstream:
                rp_lines = ["    handle {"]
                headers_up = list(_iter_headers(frontend.get("headers_up")))
                headers_down = list(_iter_headers(frontend.get("headers_down")))
                if headers_up or headers_down:
                    rp_lines.append(f"        reverse_proxy {upstream} {{")
                    for key, val in headers_up:
                        rp_lines.append(f"            header_up {key} {val}")
                    for key, val in headers_down:
                        rp_lines.append(f"            header_down {key} {val}")
                    rp_lines.append("        }")
                else:
                    rp_lines.append(f"        reverse_proxy {upstream}")
                rp_lines.append("    }")
                lines.extend(rp_lines)
        elif frontend_type == "static":
            root = frontend.get("root")
            if root:
                lines.append("    handle {")
                lines.append(f"        root * {root}")
                try_files = frontend.get("try_files") or []
                if try_files:
                    lines.append("        try_files " + " ".join(try_files))
                lines.append("        file_server")
                lines.append("    }")

        cache_static = site.get("cache_static") or {}
        cache_paths = cache_static.get("paths") or []
        cache_header = cache_static.get("header")
        if cache_paths and cache_header:
            lines.append("    @static {")
            lines.append("        path " + " ".join(cache_paths))
            lines.append("    }")
            lines.append(f'    header @static Cache-Control "{cache_header}"')

        lines.extend(
            [
                "    log {",
                f"        output file {log_path} {{",
                "            roll_size 100mb",
                "            roll_keep 10",
                "            roll_keep_for 720h",
                "        }",
                "        format json",
                "    }",
                "}",
            ]
        )

        blocks.append("\n".join(lines))

        host_for_redirect = ""
        redirect_port = None
        if not address.startswith(":"):
            parsed_address = urlparse(address if "://" in address else f"https://{address}")
            host_for_redirect = parsed_address.hostname or ""
            redirect_port = parsed_address.port

        if https_redirect and host_for_redirect:
            port_segment = f":{redirect_port}" if redirect_port and redirect_port != 443 else ""
            blocks.append(
                "\n".join(
                    [
                        f"http://{host_for_redirect}{port_segment} {{",
                        f"    redir https://{host_for_redirect}{{uri}}",
                        "}",
                    ]
                )
            )

        health_cfg = site.get("health_check") or {}
        metadata.append(
            SiteMetadata(
                name=name,
                health_url=health_cfg.get("url", ""),
                skip_healthcheck=_to_bool(health_cfg.get("skip"), default=False),
                app_url=site.get("app_url", ""),
            )
        )

    return "\n\n".join(blocks) + "\n", metadata


def render_metadata_lines(entries: Iterable[SiteMetadata]) -> List[str]:
    return [entry.serialize() for entry in entries]

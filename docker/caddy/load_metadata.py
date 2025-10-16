"""Load site metadata without rewriting the Caddyfile."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List

from .render_caddy import SiteMetadata, _expand, _to_bool


def load_metadata(config_path: Path) -> List[SiteMetadata]:
    with config_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    sites = data.get("sites", [])
    metadata: List[SiteMetadata] = []
    for raw_site in sites:
        site = _expand(raw_site)
        health_cfg = site.get("health_check") or {}
        metadata.append(
            SiteMetadata(
                name=site.get("name", "site"),
                health_url=health_cfg.get("url", ""),
                skip_healthcheck=_to_bool(health_cfg.get("skip"), default=False),
                app_url=site.get("app_url", ""),
            )
        )
    return metadata

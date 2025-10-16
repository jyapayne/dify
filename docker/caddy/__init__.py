"""Utilities for generating multi-site Caddy configurations."""

from .render_caddy import SiteMetadata, render_sites, render_metadata_lines
from .load_metadata import load_metadata

__all__ = [
    "SiteMetadata",
    "render_sites",
    "render_metadata_lines",
    "load_metadata",
]

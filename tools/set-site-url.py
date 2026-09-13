#!/usr/bin/env python3
"""Stamp the production origin into every page's share tags.

Why this exists rather than letting config.js do it.

`config.js` fills `data-site-url` attributes at runtime, and that works for
anything that runs the page. Nothing that renders a link preview does. Facebook,
X, Telegram, Slack, iMessage and Discord all fetch the raw HTML and read the
meta tags out of it without executing a line of script, so an `og:image` that
only exists after `applyConfig` resolves is an `og:image` no crawler has ever
seen.

The site has no build step to substitute a value at deploy time, so this is the
substitution: run it once when the domain is known, commit the result.

    python tools/set-site-url.py https://kerb.example

It rewrites `og:image`, `twitter:image`, `og:url` and `canonical` in every HTML
file to absolute URLs, and sets `meta.siteUrl` in `config/kerb.config.json` so
the runtime path agrees with the baked one. Running it again with a different
origin rewrites cleanly, because each tag carries the path it belongs to in
`data-site-url` and that is what gets joined to the new origin.
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", ".git", ".vercel"}


def html_files():
    for p in ROOT.rglob("*.html"):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        yield p


def stamp(text, origin):
    """Rewrite every tag that declares the path it should point at.

    The attribute is the source of truth, not the current value, so this is
    idempotent and survives being pointed at a new origin.
    """
    changed = 0

    def meta_sub(m):
        nonlocal changed
        tag, path = m.group(0), m.group("path")
        new_tag = re.sub(
            r'content="[^"]*"', f'content="{origin}{path}"', tag, count=1
        )
        if new_tag != tag:
            changed += 1
        return new_tag

    def link_sub(m):
        nonlocal changed
        tag, path = m.group(0), m.group("path")
        new_tag = re.sub(r'href="[^"]*"', f'href="{origin}{path}"', tag, count=1)
        if new_tag != tag:
            changed += 1
        return new_tag

    text = re.sub(
        r'<meta\b[^>]*\bdata-site-url="(?P<path>[^"]*)"[^>]*>', meta_sub, text
    )
    text = re.sub(
        r'<link\b[^>]*\bdata-site-url="(?P<path>[^"]*)"[^>]*>', link_sub, text
    )
    return text, changed


def main():
    if len(sys.argv) != 2:
        print(__doc__.strip().splitlines()[-3].strip())
        return 2

    origin = sys.argv[1].rstrip("/")
    if not origin.startswith(("http://", "https://")):
        print(f"error: origin must start with https://, got {origin!r}")
        return 1

    total_files = total_tags = 0
    for path in html_files():
        text = path.read_text(encoding="utf-8")
        new, changed = stamp(text, origin)
        if changed:
            path.write_text(new, encoding="utf-8")
            total_files += 1
            total_tags += changed
            print(f"{path.relative_to(ROOT)}: {changed} tags")

    cfg_path = ROOT / "config" / "kerb.config.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    cfg.setdefault("meta", {})["siteUrl"] = origin
    cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")

    print(f"\n{total_tags} tags across {total_files} files")
    print(f"meta.siteUrl set to {origin}")
    print("\nRegenerate the docs if their shell changed: python tools/build-docs.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())

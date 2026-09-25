"""build-docs.py

Renders content/docs/**/*.md into static HTML under docs/.

This is an authoring tool, not a build step. The output is committed and the
deployed site serves plain files: Vercel runs no command, installs nothing and
compiles nothing. Run this by hand whenever the markdown changes.

    python tools/build-docs.py

Nav order and grouping come from content/docs/SUMMARY.md, so that the same file
drives both GitBook and this site.
"""

import html
import pathlib
import re
import shutil
import sys

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "docs"
OUT = ROOT / "docs"

SITE_TITLE = "Kerb"
DOCS_ROOT_URL = "/docs"


# ---------------------------------------------------------------------------
# SUMMARY.md drives the order and the grouping
# ---------------------------------------------------------------------------

def read_summary():
    """Returns (groups, pages).

    groups is [(group_title_or_None, [page, ...]), ...]
    pages is a flat list in reading order, each a dict.
    """
    text = (SRC / "SUMMARY.md").read_text(encoding="utf-8")
    groups = []
    current = (None, [])
    pages = []

    for line in text.split("\n"):
        stripped = line.strip()

        heading = re.match(r"^##\s+(.+)$", stripped)
        if heading:
            if current[1]:
                groups.append(current)
            current = (heading.group(1).strip(), [])
            continue

        entry = re.match(r"^\*\s+\[([^\]]+)\]\(([^)]+)\)\s*$", stripped)
        if entry:
            title, rel = entry.group(1), entry.group(2)
            page = {
                "title": title,
                "src": rel,
                "url": url_for(rel),
                "group": current[0],
            }
            current[1].append(page)
            pages.append(page)

    if current[1]:
        groups.append(current)

    for i, page in enumerate(pages):
        page["prev"] = pages[i - 1] if i > 0 else None
        page["next"] = pages[i + 1] if i + 1 < len(pages) else None

    return groups, pages


def url_for(rel):
    """content/docs path -> site URL."""
    rel = rel.replace("\\", "/")
    if rel == "README.md":
        return DOCS_ROOT_URL
    return f"{DOCS_ROOT_URL}/{rel[:-3]}"


def out_path_for(rel):
    """content/docs path -> output file."""
    rel = rel.replace("\\", "/")
    if rel == "README.md":
        return OUT / "index.html"
    return OUT / rel[:-3] / "index.html"


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------

def render(md_text):
    md = markdown.Markdown(
        extensions=["extra", "toc", "sane_lists"],
        extension_configs={
            "toc": {"permalink": "#", "toc_depth": "2-3"},
        },
    )
    body = md.convert(md_text)
    return body, getattr(md, "toc", ""), getattr(md, "toc_tokens", [])


def rewrite_links(body, src_rel):
    """Turn relative .md links into clean site URLs."""
    here = pathlib.PurePosixPath(src_rel.replace("\\", "/")).parent

    def sub(m):
        href = m.group(1)
        if href.startswith(("http://", "https://", "#", "mailto:", "/")):
            return m.group(0)
        anchor = ""
        if "#" in href:
            href, anchor = href.split("#", 1)
            anchor = "#" + anchor
        if not href.endswith(".md"):
            return m.group(0)
        target = (here / href) if str(here) != "." else pathlib.PurePosixPath(href)
        normalised = str(pathlib.PurePosixPath(*_normalise(target.parts)))
        return f'href="{url_for(normalised)}{anchor}"'

    return re.sub(r'href="([^"]+)"', sub, body)


def _normalise(parts):
    out = []
    for p in parts:
        if p == ".":
            continue
        if p == "..":
            if out:
                out.pop()
            continue
        out.append(p)
    return out


def strip_h1_anchor(body):
    """The page URL is already the anchor for its own title, and leaving the
    permalink in puts a stray hash inside the h1 accessible name."""
    return re.sub(
        r'(<h1[^>]*>.*?)<a class="headerlink"[^>]*>[^<]*</a>(</h1>)',
        r'\1\2',
        body,
        flags=re.S,
    )


def wrap_tables(body):
    """Tables scroll inside their own container rather than the page."""
    return re.sub(
        r"(<table>.*?</table>)",
        r'<div class="docs-table-wrap">\1</div>',
        body,
        flags=re.S,
    )


# ---------------------------------------------------------------------------
# Page shell
# ---------------------------------------------------------------------------

def depth_prefix(out_file):
    """Relative path back to the repository root from an output file."""
    rel = out_file.relative_to(OUT).parent
    up = len(rel.parts) + 1  # +1 because everything lives under docs/
    return "../" * up


def nav_html(groups, active_url, prefix):
    chunks = []
    for title, pages in groups:
        chunks.append('<div class="docs-nav-group">')
        if title:
            chunks.append(f'<span class="label">{html.escape(title)}</span>')
        chunks.append('<ul class="docs-nav-list">')
        for page in pages:
            current = ' aria-current="page"' if page["url"] == active_url else ""
            chunks.append(
                f'<li><a class="docs-rail-link" href="{page["url"]}"{current}>'
                f'{html.escape(page["title"])}</a></li>'
            )
        chunks.append("</ul></div>")
    return "\n".join(chunks)


def crumbs_html(page):
    parts = [f'<a href="{DOCS_ROOT_URL}">Docs</a>']
    if page["group"]:
        parts.append(f'<span class="sep">/</span><span>{html.escape(page["group"])}</span>')
    if page["url"] != DOCS_ROOT_URL:
        parts.append(f'<span class="sep">/</span><span>{html.escape(page["title"])}</span>')
    return "".join(parts)


def pager_html(page):
    prev, nxt = page["prev"], page["next"]
    if not prev and not nxt:
        return ""
    out = ['<nav class="docs-pager" aria-label="Page">']
    if prev:
        out.append(
            f'<a class="panel panel-hover docs-pager-link" href="{prev["url"]}">'
            f'<span class="label">Previous</span>'
            f'<span class="docs-pager-title">{html.escape(prev["title"])}</span></a>'
        )
    if nxt:
        cls = "docs-pager-link docs-pager-link--next"
        out.append(
            f'<a class="panel panel-hover {cls}" href="{nxt["url"]}">'
            f'<span class="label">Next</span>'
            f'<span class="docs-pager-title">{html.escape(nxt["title"])}</span></a>'
        )
    out.append("</nav>")
    return "\n".join(out)


def toc_html(toc_markup):
    if not toc_markup or "<li>" not in toc_markup:
        return ""
    return (
        '<aside class="docs-toc" aria-label="On this page">'
        '<span class="label">On this page</span>'
        f"{toc_markup}"
        "</aside>"
    )


SHELL = """<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:site_name" content="Kerb">
<meta property="og:url" content="" data-site-url="{url}">
<link rel="canonical" href="" data-site-url="{url}">
<link rel="icon" href="{p}assets/img/favicon.ico" sizes="48x48">
<link rel="icon" href="{p}assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="{p}assets/img/favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="{p}assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#080404">
<meta property="og:image" content="{p}assets/img/og.png" data-site-url="/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Kerb. First send waits. The rest fly.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{p}assets/img/og-x.png" data-site-url="/assets/img/og-x.png">
<link rel="stylesheet" href="{p}assets/css/tokens.css">
<link rel="stylesheet" href="{p}assets/css/base.css">
<link rel="stylesheet" href="{p}assets/css/components.css">
<link rel="stylesheet" href="{p}assets/css/sections.css">
<script>
  try {{
    document.documentElement.dataset.theme =
      localStorage.getItem('kerb-theme') === 'light' ? 'light' : 'dark';
  }} catch (e) {{
    document.documentElement.dataset.theme = 'dark';
  }}
</script>
</head>
<body>

<a class="skip-link" href="#content">Skip to content</a>

<div class="page-frame">

  <nav class="nav-morph site-nav" aria-label="Primary" data-nav>
    <div class="nav-lead">
      <a class="nav-brand" href="/" aria-label="Kerb, home">
        <img class="brand-lockup brand-lockup--dark" src="{p}assets/img/logo-lockup-dark.png" alt="" width="560" height="242" decoding="async">
        <img class="brand-lockup brand-lockup--light" src="{p}assets/img/logo-lockup-light.png" alt="" width="560" height="242" decoding="async">
      </a>
    </div>

    <div class="nav-desktop">
      <a class="nav-link panel-hover" href="/#how">How it works</a>
      <a class="nav-link panel-hover" href="/#limits">Limits</a>
      <a class="nav-link panel-hover" href="/#contracts">Contracts</a>
      <a class="nav-link panel-hover" href="/docs" aria-current="page">Docs</a>
    </div>

    <div class="nav-tail">
      <span class="nav-desktop-block">
        <button type="button" class="icon-btn panel-hover" data-theme-toggle aria-label="Light theme" title="Light theme">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
            <polygon points="17 10 17 14 16 14 16 15 15 15 15 16 14 16 14 17 10 17 10 16 9 16 9 15 8 15 8 14 7 14 7 10 8 10 8 9 9 9 9 8 10 8 10 7 14 7 14 8 15 8 15 9 16 9 16 10 17 10"></polygon>
            <path d="m21,11v-1h1v-1h1v-2h-3v-1h-2v-2h-1V1h-2v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-2v3h-1v2h-2v1H1v2h1v1h1v1h1v2h-1v1h-1v1h-1v2h3v1h2v2h1v3h2v-1h1v-1h1v-1h2v1h1v1h1v1h2v-3h1v-2h2v-1h3v-2h-1v-1h-1v-1h-1v-2h1Zm-3,4h-1v1h-1v1h-1v1h-6v-1h-1v-1h-1v-1h-1v-6h1v-1h1v-1h1v-1h6v1h1v1h1v1h1v6Z"></path>
          </svg>
        </button>
      </span>
      <a class="btn-solid btn--nav" href="/app" data-app-link>Open App</a>
    </div>
  </nav>

  <div id="content">
    <main class="site-main">
      <div class="frame docs-shell">

        <div class="docs-nav">
          <details class="docs-nav-toggle"{nav_open}>
            <summary>Documentation</summary>
            <div class="docs-nav-inner">
{nav}
            </div>
          </details>
        </div>

        <div class="docs-body">
          <article class="docs-article">
            <div class="docs-crumbs">{crumbs}</div>
            <div class="docs-prose">
{body}
            </div>
{pager}
          </article>
        </div>

{toc}

      </div>
    </main>
  </div>

</div>

<div class="toast-region" aria-live="polite"></div>

<script type="module" src="{p}assets/js/main.js"></script>
</body>
</html>
"""


def first_paragraph(md_text):
    """A plain text description from the first prose paragraph."""
    body = re.sub(r"^#.*$", "", md_text, flags=re.M)
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    for block in body.split("\n\n"):
        block = " ".join(block.split())
        if not block or block.startswith(("|", ">", "*", "-", "#")):
            continue
        block = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", block)
        block = block.replace("`", "").replace("**", "")
        return html.escape(block[:155].rstrip())
    return "Kerb documentation."


def build():
    if not SRC.exists():
        sys.exit(f"missing source: {SRC}")

    groups, pages = read_summary()

    # clear previously generated output, leave the internal build notes alone
    for page in pages:
        target = out_path_for(page["src"])
        if target.exists():
            target.unlink()
    for d in ("concepts", "protocol", "implementation", "integration", "reference"):
        shutil.rmtree(OUT / d, ignore_errors=True)

    OUT.mkdir(parents=True, exist_ok=True)
    written = []

    for page in pages:
        md_text = (SRC / page["src"]).read_text(encoding="utf-8")
        body, toc_markup, _ = render(md_text)
        body = rewrite_links(body, page["src"])
        body = strip_h1_anchor(body)
        body = wrap_tables(body)

        out_file = out_path_for(page["src"])
        out_file.parent.mkdir(parents=True, exist_ok=True)
        prefix = depth_prefix(out_file)

        title = page["title"]
        if page["url"] == DOCS_ROOT_URL:
            full_title = f"{SITE_TITLE} docs"
        else:
            full_title = f"{title} | {SITE_TITLE} docs"

        out_file.write_text(
            SHELL.format(
                title=html.escape(full_title),
                description=first_paragraph(md_text),
                url=page["url"],
                p=prefix,
                nav=nav_html(groups, page["url"], prefix),
                nav_open=" open" if page["url"] == DOCS_ROOT_URL else "",
                crumbs=crumbs_html(page),
                body=body,
                pager=pager_html(page),
                toc=toc_html(toc_markup),
            ),
            encoding="utf-8",
        )
        written.append(out_file.relative_to(ROOT).as_posix())

    print(f"built {len(written)} pages")
    for w in written:
        print(f"  {w}")


if __name__ == "__main__":
    build()

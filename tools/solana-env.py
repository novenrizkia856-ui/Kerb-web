#!/usr/bin/env python3
"""Copy Solana settings from environment variables into config/kerb.config.json.

Why this exists. The site is static and has no build step, so nothing can
substitute a NEXT_PUBLIC_* variable into the page at deploy time the way a
framework build would. The browser reads config/kerb.config.json instead. This
script is the bridge for anyone who would rather keep the values in the
environment or in a .env file: run it, commit the result.

    python tools/solana-env.py            # reads the environment, then .env
    python tools/solana-env.py --check    # prints what would change, writes nothing

Only variables that are set are written. An unset variable leaves the JSON
value alone, and a variable set to the empty string clears it, which is how an
address goes back to its `Coming Soon` or `Not deployed` state.

Every value here is public by design: the JSON is served to every visitor.
Nothing secret belongs in it, so nothing secret belongs in these variables. An
RPC URL with a key in it is public too once it is in the page; use a provider
key that is restricted to this site's domain.
"""

import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "kerb.config.json"
DOTENV = ROOT / ".env"

# Environment variable -> key in the `solana` block of kerb.config.json.
KEYS = [
    "SOLANA_NETWORK",
    "SOLANA_RPC_URL",
    "EXPLORER_BASE_URL",
    "KERB_TOKEN_MINT",
    "KERB_TOKEN_SYMBOL",
    "KERB_PROGRAM_ID",
    "TREASURY_ADDRESS",
]


def read_dotenv(path):
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, _, value = line.partition("=")
        values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def lookup(name, dotenv):
    """NEXT_PUBLIC_<name> first, then the bare name, in the environment and then
    in .env. Returns None when the variable is not set anywhere."""
    for source in (os.environ, dotenv):
        for candidate in (f"NEXT_PUBLIC_{name}", name):
            if candidate in source:
                return source[candidate]
    return None


def main():
    check = "--check" in sys.argv[1:]
    dotenv = read_dotenv(DOTENV)
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    block = config.setdefault("solana", {})

    changed = []
    for key in KEYS:
        value = lookup(key, dotenv)
        if value is None or block.get(key) == value:
            continue
        changed.append((key, block.get(key), value))
        block[key] = value

    if not changed:
        print("kerb.config.json already matches the environment.")
        return 0

    for key, old, new in changed:
        print(f"solana.{key}: {old!r} -> {new!r}")

    if check:
        print("--check given, nothing written.")
        return 0

    CONFIG.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {CONFIG.relative_to(ROOT)}. Open the site and check the console for validation warnings.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

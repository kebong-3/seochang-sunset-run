#!/usr/bin/env python3
"""Serve SUNSET RUN locally with Python 3.9+ and the standard library only."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import webbrowser


ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
REQUIRED_FILES = (
    "index.html",
    "leaderboard.html",
    "Build/11.loader.js",
    "Build/11.data.unityweb",
    "Build/11.framework.js.unityweb",
    "Build/11.wasm.unityweb",
    "Quality/sunset-quality.js",
    "Community/community-api.mjs",
    "Community/sunset-community.js",
    "Community/sunset-community.css",
    "Community/leaderboard.js",
    "TemplateData/style.css",
    "TemplateData/icon.png",
    "TemplateData/logo.png",
    "TemplateData/haeon.png",
)


class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".unityweb": "application/octet-stream",
    }

    def end_headers(self):
        # Unity's loader decompresses .unityweb. Do not add Content-Encoding.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def port_number(value):
    try:
        port = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("port must be a number") from exc
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError("port must be between 1 and 65535")
    return port


def open_default_browser(url):
    try:
        opened = webbrowser.open(url, new=2)
    except Exception as exc:
        print("Could not open the default browser: {}".format(exc), flush=True)
        opened = False
    if not opened:
        print("Open this address manually: {}".format(url), flush=True)


def main():
    parser = argparse.ArgumentParser(
        description="Run SUNSET RUN on this computer only (127.0.0.1)."
    )
    parser.add_argument("--port", type=port_number, default=8000, help="port (default: 8000)")
    parser.add_argument(
        "--open", action="store_true", help="open the game in your default browser"
    )
    args = parser.parse_args()

    if sys.version_info < (3, 9):
        print("Python 3.9 or later is required.", file=sys.stderr)
        return 1

    missing = [name for name in REQUIRED_FILES if not (ROOT / name).is_file()]
    if missing:
        print("Required game files are missing:", file=sys.stderr)
        for name in missing:
            print("  - {}".format(name), file=sys.stderr)
        print(
            "Extract the complete game package, keeping Build, Community, Quality, "
            "TemplateData and tools beside index.html.",
            file=sys.stderr,
        )
        return 1

    handler = partial(GameHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer((HOST, args.port), handler)
    except OSError as exc:
        print("Could not start the local server: {}".format(exc), file=sys.stderr)
        print(
            "If the port is in use, try: python tools/serve.py --port 8001 --open",
            file=sys.stderr,
        )
        return 1

    url = "http://{}:{}/".format(HOST, args.port)
    print("SUNSET RUN local server", flush=True)
    print("Game: {}".format(url), flush=True)
    print("Folder: {}".format(ROOT), flush=True)
    print("Keep this window open while playing. Press Ctrl+C to stop.", flush=True)

    if args.open:
        opener = threading.Timer(0.2, open_default_browser, args=(url,))
        opener.daemon = True
        opener.start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLocal server stopped.", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

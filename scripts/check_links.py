#!/usr/bin/env python3
"""
Link checker for the Hyperfy Apps Explorer.

Checks all URLs the explorer depends on:
  - catalog.json
  - preview media per app
  - .hyp download URLs (GitHub raw CDN)

Usage:
  uv run python scripts/check_links.py                        # auto-starts server
  uv run python scripts/check_links.py --local-only           # skip GitHub raw URLs
  uv run python scripts/check_links.py --base http://localhost:8080/catalog
"""

import argparse
import http.server
import json
import socketserver
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed


def find_free_port():
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def start_server(port, directory="."):
    """Start a simple HTTP server in a background thread."""
    import os
    orig_dir = os.getcwd()
    os.chdir(directory)

    handler = http.server.SimpleHTTPRequestHandler
    handler.log_message = lambda *args: None  # silence logs

    httpd = socketserver.TCPServer(("", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    os.chdir(orig_dir)
    return httpd


def head_check(url, timeout=10):
    """Return (url, status_code, error_msg). status_code=0 on connection error."""
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("User-Agent", "hyperfy-link-checker/1.0")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return url, resp.status, None
    except urllib.error.HTTPError as e:
        return url, e.code, str(e)
    except Exception as e:
        return url, 0, str(e)


def main():
    parser = argparse.ArgumentParser(description="Check all explorer URLs for 200 OK")
    parser.add_argument(
        "--base",
        default=None,
        help="Base URL for catalog (default: auto-start server)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port for auto-started server (default: random free port)",
    )
    parser.add_argument(
        "--local-only",
        action="store_true",
        help="Skip external GitHub raw .hyp download URLs",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=32,
        help="ThreadPoolExecutor workers (default: 32)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Per-request timeout in seconds (default: 10)",
    )
    args = parser.parse_args()

    # Determine base URL
    server = None
    if args.base:
        base = args.base.rstrip("/")
    else:
        port = args.port or find_free_port()
        print(f"Starting local server on port {port}...")
        server = start_server(port, directory=".")
        time.sleep(0.3)  # let server start
        base = f"http://localhost:{port}/catalog"

    # Fetch catalog.json
    catalog_url = f"{base}/catalog.json"
    print(f"Fetching {catalog_url} ...")
    try:
        req = urllib.request.Request(catalog_url)
        req.add_header("User-Agent", "hyperfy-link-checker/1.0")
        with urllib.request.urlopen(req, timeout=args.timeout) as resp:
            data = json.load(resp)
            catalog_ok = True
    except Exception as e:
        print(f"  FAIL: {e}")
        if server:
            server.shutdown()
        sys.exit(1)

    apps = data.get("apps", [])
    print(f"  OK ({len(apps)} apps)\n")

    # Build work items: (url, category, label)
    tasks = []
    for app in apps:
        slug = app.get("slug", "?")

        preview = app.get("preview_url")
        if preview:
            # preview_url may be relative or absolute
            if preview.startswith("http"):
                preview_full = preview
            else:
                preview_full = f"{base}/{preview.lstrip('/')}"
            tasks.append((preview_full, "preview", slug))

        download = app.get("download_path")
        if download and not args.local_only:
            tasks.append((download, "hyp_download", slug))

    total = len(tasks)
    print(f"Checking {total} URLs ({args.workers} workers)...\n")

    # Results buckets: category -> list of (url, slug, status, err)
    results = {"preview": [], "hyp_download": []}
    done_count = 0
    lock = threading.Lock()

    def check_task(item):
        url, category, slug = item
        url_result, status, err = head_check(url, timeout=args.timeout)
        return url, category, slug, status, err

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(check_task, t): t for t in tasks}
        for future in as_completed(futures):
            url, category, slug, status, err = future.result()
            with lock:
                done_count += 1
                ok = 200 <= status < 400
                results[category].append((url, slug, status, err, ok))
                if not ok:
                    cat_label = category.ljust(12)
                    print(f"  FAIL [{cat_label}] {slug}: {status} {err or ''}")
                # Progress
                print(f"\r  Progress: {done_count}/{total}", end="", flush=True)

    print()  # newline after progress

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    # catalog.json
    print(f"  {'✓' if catalog_ok else '✗'} catalog.json         OK")

    any_local_fail = False
    categories = [
        ("preview",      "preview       "),
        ("hyp_download", "hyp download  "),
    ]
    for cat_key, cat_label in categories:
        items = results[cat_key]
        if not items:
            if cat_key == "hyp_download" and args.local_only:
                print(f"  - {cat_label}  (skipped, --local-only)")
            continue
        ok_items = [i for i in items if i[4]]
        fail_items = [i for i in items if not i[4]]
        total_cat = len(items)
        ok_count = len(ok_items)
        symbol = "✓" if not fail_items else "✗"
        print(f"  {symbol} {cat_label}  {ok_count}/{total_cat} OK", end="")
        if fail_items:
            print(f"  ← {len(fail_items)} FAIL")
            for url, slug, status, err, _ in fail_items[:10]:
                print(f"      {status}  {slug}  {url}")
            if len(fail_items) > 10:
                print(f"      ... and {len(fail_items) - 10} more")
            if cat_key != "hyp_download":
                any_local_fail = True
        else:
            print()

    print()
    if any_local_fail:
        print("RESULT: LOCAL FAILURES DETECTED — exit 1")
        if server:
            server.shutdown()
        sys.exit(1)
    else:
        print("RESULT: All local URLs OK")
        if server:
            server.shutdown()
        sys.exit(0)


if __name__ == "__main__":
    main()

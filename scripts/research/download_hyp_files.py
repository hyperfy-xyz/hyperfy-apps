#!/usr/bin/env python3
"""
Download missing .hyp files and optional media candidates from context/hyp_index.raw.json.

Usage:
  DISCORD_TOKEN=... uv run python scripts/research/download_hyp_files.py
  DISCORD_TOKEN=... uv run python scripts/research/download_hyp_files.py --media
  uv run python scripts/research/download_hyp_files.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_INDEX = PROJECT_ROOT / "context" / "hyp_index.raw.json"
DEFAULT_HYP_DIR = PROJECT_ROOT / "hyp-files"
DEFAULT_MEDIA_DIR = PROJECT_ROOT / "tmp" / "hyp_media_raw"


def load_dotenv_files(paths: list[Path]) -> list[Path]:
    """Load KEY=VALUE pairs from .env-style files into os.environ (without overriding existing vars)."""
    loaded: list[Path] = []

    for path in paths:
        if not path.exists() or not path.is_file():
            continue

        for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export "):].strip()
            if "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue

            # Strip inline comment for unquoted values only.
            if value and value[0] not in {'"', "'"} and " #" in value:
                value = value.split(" #", 1)[0].rstrip()

            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                quote = value[0]
                value = value[1:-1]
                if quote == '"':
                    value = value.encode("utf-8").decode("unicode_escape")

            os.environ.setdefault(key, value)

        loaded.append(path)

    return loaded


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_index(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Index not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"Index must be a JSON array: {path}")
    return data


def save_index(path: Path, entries: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entries, indent=2), encoding="utf-8")


def parse_ts(ts: str) -> float:
    if not ts:
        return 0.0
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def refresh_discord_urls(token: str, urls: list[str], *, user_agent: str) -> dict[str, str]:
    """
    Refresh Discord CDN URLs in batches.

    POST /api/v10/attachments/refresh-urls
    Body: {"attachment_urls": [ ... ]}
    """
    out: dict[str, str] = {}
    if not urls:
        return out

    batch_size = 50
    for i in range(0, len(urls), batch_size):
        batch = urls[i : i + batch_size]
        payload = json.dumps({"attachment_urls": batch}).encode("utf-8")

        req = urllib.request.Request(
            "https://discord.com/api/v10/attachments/refresh-urls",
            data=payload,
            headers={
                "Authorization": f"Bot {token}",
                "Content-Type": "application/json",
                "User-Agent": user_agent,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data.get("refreshed_urls", []):
                    original = item.get("original")
                    refreshed = item.get("refreshed")
                    if original and refreshed:
                        out[original] = refreshed
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                retry_after = float(exc.headers.get("Retry-After", 5))
                print(f"Rate limited. Sleeping {retry_after}s...")
                time.sleep(retry_after)
            else:
                print(f"Warning: URL refresh batch failed with HTTP {exc.code}")
        except Exception as exc:
            print(f"Warning: URL refresh batch failed: {exc}")

        if i + batch_size < len(urls):
            time.sleep(0.2)

    return out


def download_file(url: str, dest: Path, *, user_agent: str) -> tuple[bool, str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": user_agent})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                f.write(resp.read())
        return True, ""
    except urllib.error.HTTPError as exc:
        return False, f"HTTP {exc.code}: {exc.reason}"
    except Exception as exc:
        return False, str(exc)


def validate_hyp_file(path: Path) -> tuple[bool, str]:
    try:
        data = path.read_bytes()
        if len(data) < 8:
            return False, "file too small"
        header_size = struct.unpack("<I", data[:4])[0]
        if header_size <= 0:
            return False, "invalid header size"
        if 4 + header_size > len(data):
            return False, "header exceeds file length"
        header = json.loads(data[4 : 4 + header_size].decode("utf-8"))
        if not isinstance(header, dict):
            return False, "header json is not object"
        if "blueprint" not in header or "assets" not in header:
            return False, "missing blueprint/assets in header"
        if not isinstance(header["assets"], list):
            return False, "assets is not a list"
        return True, ""
    except Exception as exc:
        return False, str(exc)


def safe_filename(name: str) -> str:
    cleaned = []
    for ch in (name or ""):
        if ch.isalnum() or ch in {"-", "_", "."}:
            cleaned.append(ch)
        else:
            cleaned.append("_")
    out = "".join(cleaned).strip("._")
    return out or "media.bin"


def sanitize_slug(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "unknown-app"


def entry_slug(entry: dict[str, Any]) -> str:
    app_name = (entry.get("app_name") or "").strip()
    if app_name:
        return sanitize_slug(app_name)
    filename = (entry.get("filename") or "").strip()
    if filename:
        return sanitize_slug(Path(filename).stem)
    message_id = (entry.get("message_id") or "").strip()
    if message_id:
        return sanitize_slug(f"msg-{message_id}")
    return "unknown-app"


def rel_or_abs(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def candidate_group_key(cand: dict[str, Any], entry_idx: int, cand_idx: int) -> str | None:
    att_id = (cand.get("attachment_id") or "").strip()
    if att_id:
        return f"att:{att_id}"
    url = (cand.get("url") or "").strip()
    if url:
        return f"url:{url}"
    filename = (cand.get("filename") or "").strip()
    if filename:
        return f"fallback:{entry_idx}:{cand_idx}:{filename}"
    return None


def destination_name(cand: dict[str, Any], key: str) -> str:
    att_id = (cand.get("attachment_id") or "").strip()
    filename = safe_filename((cand.get("filename") or "").strip())
    if att_id:
        return f"{att_id}_{filename}"

    if key.startswith("url:"):
        url = key[4:]
        parsed_name = Path(urllib.parse.urlparse(url).path).name
        parsed_name = safe_filename(parsed_name)
        digest = hashlib.sha1(url.encode("utf-8"), usedforsecurity=False).hexdigest()[:12]
        if parsed_name:
            return f"url_{digest}_{parsed_name}"
        return f"url_{digest}.bin"

    digest = hashlib.sha1(key.encode("utf-8"), usedforsecurity=False).hexdigest()[:12]
    return f"media_{digest}_{filename}"


def run_hyp_phase(args: argparse.Namespace, entries: list[dict[str, Any]], token: str) -> int:
    hyp_dir = args.hyp_files_dir.resolve()
    hyp_dir.mkdir(parents=True, exist_ok=True)

    groups: dict[str, list[int]] = {}
    for i, entry in enumerate(entries):
        filename = (entry.get("filename") or "").strip()
        if not filename:
            continue
        groups.setdefault(filename, []).append(i)

    planned: list[tuple[str, int, str, list[int]]] = []
    existing_files = 0
    no_url = 0

    for filename, idxs in groups.items():
        canonical = hyp_dir / filename

        if canonical.exists() and not args.force:
            existing_files += 1
            rel = str(canonical.relative_to(PROJECT_ROOT))
            for idx in idxs:
                entries[idx]["status"] = "downloaded"
                entries[idx]["local_path"] = rel
            continue

        sorted_idxs = sorted(idxs, key=lambda x: parse_ts(str(entries[x].get("timestamp") or "")), reverse=True)
        chosen = None
        for idx in sorted_idxs:
            url = (entries[idx].get("url") or "").strip()
            if url:
                chosen = (idx, url)
                break

        if chosen is None:
            no_url += 1
            continue

        planned.append((filename, chosen[0], chosen[1], idxs))

    if args.limit is not None:
        planned = planned[: max(args.limit, 0)]

    print("HYP download plan")
    print(f"  index_entries: {len(entries)}")
    print(f"  unique_filenames: {len(groups)}")
    print(f"  already_present: {existing_files}")
    print(f"  no_url_candidates: {no_url}")
    print(f"  queued_downloads: {len(planned)}")

    if args.dry_run:
        for filename, _, _, _ in planned[:30]:
            print(f"  - {filename}")
        return 0

    if not planned:
        print("\nDownload summary")
        print("  downloaded: 0")
        print("  failed: 0")
        print(f"  destination: {hyp_dir}")
        return 0

    if not token:
        print("Error: DISCORD_TOKEN is required for non-dry-run downloads")
        return 1

    unique_urls = sorted({url for _, _, url, _ in planned})
    refreshed = refresh_discord_urls(token, unique_urls, user_agent="hyperfy-apps/etl-downloader")
    print(f"Refreshed URLs: {len(refreshed)}/{len(unique_urls)}")

    downloaded = 0
    failed = 0
    run_ts = now_iso()

    for i, (filename, chosen_idx, original_url, idxs) in enumerate(planned, start=1):
        canonical = hyp_dir / filename
        att_id = (entries[chosen_idx].get("attachment_id") or "unknown").strip()
        tmp_path = hyp_dir / f".tmp-{att_id}-{filename}"

        url = refreshed.get(original_url, original_url)
        print(f"[{i}/{len(planned)}] {filename}")

        ok, err = download_file(url, tmp_path, user_agent="hyperfy-apps/etl-downloader")
        if not ok:
            failed += 1
            entries[chosen_idx]["last_download_error"] = err
            print(f"  FAILED download: {err}")
            tmp_path.unlink(missing_ok=True)
            continue

        valid, why = validate_hyp_file(tmp_path)
        if not valid:
            failed += 1
            entries[chosen_idx]["last_download_error"] = f"invalid_hyp: {why}"
            print(f"  FAILED validation: {why}")
            tmp_path.unlink(missing_ok=True)
            continue

        shutil.move(str(tmp_path), str(canonical))
        rel = str(canonical.relative_to(PROJECT_ROOT))

        for idx in idxs:
            entries[idx]["status"] = "downloaded"
            entries[idx]["local_path"] = rel
            entries[idx]["downloaded_at"] = run_ts

        if url != original_url:
            entries[chosen_idx]["url_refreshed"] = url

        entries[chosen_idx].pop("last_download_error", None)
        downloaded += 1
        print("  OK")
        if args.rate_limit > 0:
            time.sleep(args.rate_limit)

    print("\nDownload summary")
    print(f"  downloaded: {downloaded}")
    print(f"  failed: {failed}")
    print(f"  destination: {hyp_dir}")

    return 0 if failed == 0 else 2


def run_media_phase(args: argparse.Namespace, entries: list[dict[str, Any]], token: str) -> int:
    media_dir = args.media_dir.resolve()
    if not args.dry_run:
        media_dir.mkdir(parents=True, exist_ok=True)

    groups: dict[tuple[str, str], list[tuple[int, int]]] = {}
    candidate_snapshots: dict[tuple[str, str], dict[str, Any]] = {}

    for entry_idx, entry in enumerate(entries):
        candidates = entry.get("media_candidates") or []
        if not isinstance(candidates, list):
            continue

        slug = entry_slug(entry)
        if args.media_primary_only and candidates:
            candidates = [candidates[0]]

        for cand_idx, cand in enumerate(candidates):
            if not isinstance(cand, dict):
                continue
            key = candidate_group_key(cand, entry_idx, cand_idx)
            if not key:
                continue
            grouped_key = (slug, key)
            groups.setdefault(grouped_key, []).append((entry_idx, cand_idx))
            candidate_snapshots.setdefault(grouped_key, cand)

    queued: list[tuple[tuple[str, str], str, Path]] = []
    already_present = 0
    migrated_legacy = 0
    no_url = 0

    for grouped_key, refs in groups.items():
        slug, key = grouped_key
        cand = candidate_snapshots[grouped_key]
        url = (cand.get("url") or "").strip()
        dest_name = destination_name(cand, key)
        dest = media_dir / slug / dest_name
        legacy_dest = media_dir / dest_name

        if dest.exists() and not args.media_force:
            already_present += 1
            rel = rel_or_abs(dest)
            for entry_idx, cand_idx in refs:
                c = entries[entry_idx]["media_candidates"][cand_idx]
                c["download_status"] = "downloaded"
                c["local_path"] = rel
            continue

        if legacy_dest.exists() and not args.media_force:
            if not args.dry_run:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(legacy_dest), str(dest))
            migrated_legacy += 1
            rel = rel_or_abs(dest)
            for entry_idx, cand_idx in refs:
                c = entries[entry_idx]["media_candidates"][cand_idx]
                c["download_status"] = "downloaded"
                c["local_path"] = rel
            continue

        if not url:
            no_url += 1
            for entry_idx, cand_idx in refs:
                c = entries[entry_idx]["media_candidates"][cand_idx]
                c["download_status"] = "pending"
            continue

        queued.append((grouped_key, url, dest))

    if args.media_limit is not None:
        queued = queued[: max(args.media_limit, 0)]

    print("\nMedia download plan")
    print(f"  index_entries: {len(entries)}")
    print(f"  unique_media_candidates: {len(groups)}")
    print(f"  app_folders: {len({slug for slug, _ in groups})}")
    print(f"  already_present: {already_present}")
    print(f"  migrated_legacy: {migrated_legacy}")
    print(f"  no_url_candidates: {no_url}")
    print(f"  queued_downloads: {len(queued)}")

    if args.dry_run:
        for _, _, dest in queued[:30]:
            print(f"  - {rel_or_abs(dest)}")
        return 0

    if not queued:
        print("\nMedia download summary")
        print("  downloaded: 0")
        print("  failed: 0")
        print(f"  migrated_legacy: {migrated_legacy}")
        print(f"  media_dir: {media_dir}")
        return 0

    if not token:
        print("Error: DISCORD_TOKEN is required for non-dry-run media downloads")
        return 1

    urls = sorted({u for _, u, _ in queued})
    refreshed = refresh_discord_urls(token, urls, user_agent="hyperfy-apps/media-downloader")
    print(f"Refreshed URLs: {len(refreshed)}/{len(urls)}")

    downloaded = 0
    failed = 0
    run_ts = now_iso()

    for i, (grouped_key, original_url, dest) in enumerate(queued, start=1):
        refs = groups[grouped_key]
        url = refreshed.get(original_url, original_url)
        print(f"[{i}/{len(queued)}] {rel_or_abs(dest)}")

        tmp = dest.with_name(f".tmp-{dest.name}")
        ok, err = download_file(url, tmp, user_agent="hyperfy-apps/media-downloader")
        if not ok:
            failed += 1
            for entry_idx, cand_idx in refs:
                c = entries[entry_idx]["media_candidates"][cand_idx]
                c["download_status"] = "failed"
                c["last_download_error"] = err
            print(f"  FAILED: {err}")
            tmp.unlink(missing_ok=True)
            continue

        shutil.move(str(tmp), str(dest))
        rel = rel_or_abs(dest)
        for entry_idx, cand_idx in refs:
            c = entries[entry_idx]["media_candidates"][cand_idx]
            c["download_status"] = "downloaded"
            c["local_path"] = rel
            c["downloaded_at"] = run_ts
            if url != original_url:
                c["url_refreshed"] = url
            c.pop("last_download_error", None)

        downloaded += 1
        print("  OK")
        if args.media_rate_limit > 0:
            time.sleep(args.media_rate_limit)

    print("\nMedia download summary")
    print(f"  downloaded: {downloaded}")
    print(f"  failed: {failed}")
    print(f"  migrated_legacy: {migrated_legacy}")
    print(f"  media_dir: {media_dir}")

    return 0 if failed == 0 else 2


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download missing .hyp files and optional media candidates into local folders"
    )
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX, help=f"Path to hyp index (default: {DEFAULT_INDEX})")
    parser.add_argument("--hyp-files-dir", type=Path, default=DEFAULT_HYP_DIR, help=f"Destination hyp-files dir (default: {DEFAULT_HYP_DIR})")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of filenames to download")
    parser.add_argument("--force", action="store_true", help="Force re-download even when files already exist")
    parser.add_argument("--rate-limit", type=float, default=1.5, help="Seconds between hyp downloads (default: 1.5)")

    parser.add_argument("--media", action="store_true", help="Also download media candidates in same run")
    parser.add_argument("--media-dir", type=Path, default=DEFAULT_MEDIA_DIR, help=f"Destination media dir (default: {DEFAULT_MEDIA_DIR})")
    parser.add_argument("--media-limit", type=int, default=None, help="Limit number of unique media items to download")
    parser.add_argument("--media-primary-only", action="store_true", help="Only download primary media candidate per entry")
    parser.add_argument("--media-force", action="store_true", help="Force redownload media even if destination exists")
    parser.add_argument("--media-rate-limit", type=float, default=0.6, help="Seconds between media downloads (default: 0.6)")

    parser.add_argument("--write-index", action="store_true", help="Persist updated status/local_path fields in index")
    parser.add_argument("--dry-run", action="store_true", help="Show planned actions without downloading")
    parser.add_argument("--env-file", action="append", default=[], help="Additional .env file to load (repeatable)")
    args = parser.parse_args()

    if args.force and not args.media_force:
        args.media_force = True

    env_paths: list[Path] = [PROJECT_ROOT / ".env", PROJECT_ROOT / ".env.local"]
    env_paths.extend(Path(p) for p in args.env_file)
    seen = set()
    deduped_paths: list[Path] = []
    for path in env_paths:
        resolved = path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        deduped_paths.append(resolved)

    loaded_env = load_dotenv_files(deduped_paths)
    if loaded_env:
        loaded_str = ", ".join(str(p) for p in loaded_env)
        print(f"Loaded env files: {loaded_str}")

    entries = load_index(args.index)
    token = os.environ.get("DISCORD_TOKEN", "").strip()

    hyp_rc = run_hyp_phase(args, entries, token)
    if hyp_rc == 1:
        return 1

    media_rc = 0
    if args.media:
        media_rc = run_media_phase(args, entries, token)
        if media_rc == 1:
            return 1

    if args.write_index:
        save_index(args.index, entries)
        print(f"Index saved: {args.index}")

    return 2 if hyp_rc == 2 or media_rc == 2 else 0


if __name__ == "__main__":
    raise SystemExit(main())

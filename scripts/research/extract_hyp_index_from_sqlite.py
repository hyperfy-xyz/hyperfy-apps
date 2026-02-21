#!/usr/bin/env python3
"""
Extract .hyp attachment metadata from Discord sqlite into a rich JSON index.

This is the SQLite-first extractor for hyperfy-apps.

Usage:
    uv run python scripts/research/extract_hyp_index_from_sqlite.py
    uv run python scripts/research/extract_hyp_index_from_sqlite.py --sqlite ./hyperfy-discord.sqlite
    uv run python scripts/research/extract_hyp_index_from_sqlite.py --after 2025-02-24 --before 2025-02-25
    uv run python scripts/research/extract_hyp_index_from_sqlite.py --channel-id 994775534733115412

Output:
    context/hyp_index.raw.json
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse


SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_PATH = PROJECT_ROOT / "context" / "hyp_index.raw.json"

MEDIA_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg",
    ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v",
}


def resolve_default_sqlite() -> Path:
    """Find the first available sqlite path from known locations."""
    candidates = [
        PROJECT_ROOT / "data" / "hyperfy-discord.sqlite",
        PROJECT_ROOT / "hyperfy-discord.sqlite",
        Path("/home/jin/repo/ai-news/data/hyperfy-discord.sqlite"),
        Path("/home/jin/repo/ai-news/hyperfy-discord.sqlite"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def parse_ymd(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Invalid date '{value}', expected YYYY-MM-DD") from exc


def to_epoch(dt: datetime) -> int:
    return int(dt.timestamp())


def parse_channel_filter(values: list[str] | None) -> set[str]:
    if not values:
        return set()
    out: set[str] = set()
    for value in values:
        for item in value.split(","):
            item = item.strip()
            if item:
                out.add(item)
    return out


def is_media_attachment(attachment: dict) -> bool:
    """Return True if attachment looks like image/video media."""
    filename = (attachment.get("filename") or "").lower()
    content_type = (attachment.get("content_type") or "").lower()

    if any(filename.endswith(ext) for ext in MEDIA_EXTENSIONS):
        return True
    if content_type.startswith("image/") or content_type.startswith("video/"):
        return True
    return False


def app_name_from_filename(filename: str) -> str:
    return Path(filename).stem if filename else "unknown"


def normalize_url_to_app_name(url: str) -> str:
    path = urlparse(url).path
    name = unquote(Path(path).name)
    return app_name_from_filename(name) if name else "unknown"


def parse_discord_attachment_id(url: str) -> str | None:
    """Parse attachment id from Discord CDN URL path if possible."""
    try:
        path_parts = [p for p in urlparse(url).path.split("/") if p]
        # /attachments/<channel_id>/<attachment_id>/<filename>
        if len(path_parts) >= 4 and path_parts[0] == "attachments":
            attachment_id = path_parts[2]
            return attachment_id if attachment_id.isdigit() else None
    except Exception:
        return None
    return None


def build_context_message(msg: dict, users: dict, relative_index: int) -> dict:
    uid = str(msg.get("uid", ""))
    user_info = users.get(uid, {})
    if not user_info and uid:
        user_info = users.get(int(uid), {}) if uid.isdigit() else {}
    author_name = user_info.get("nickname") or user_info.get("name", "unknown")
    return {
        "relative_index": relative_index,
        "message_id": msg.get("id", ""),
        "author_id": uid,
        "author_name": author_name,
        "timestamp": msg.get("ts", ""),
        "content": msg.get("content", ""),
    }


def build_media_candidate(attachment: dict, relative_index: int, same_author: bool, selection_reason: str) -> dict:
    return {
        "attachment_id": attachment.get("id", ""),
        "filename": attachment.get("filename", ""),
        "content_type": attachment.get("content_type"),
        "url": attachment.get("url", ""),
        "relative_index": relative_index,
        "same_author": same_author,
        "selection_reason": selection_reason,
        "download_status": "pending",
        "local_path": None,
    }


def extract_hyp_attachments(
    sqlite_path: Path,
    context_window: int,
    hyp_url_filter: set[str] | None = None,
    hyp_attachment_filter: set[str] | None = None,
    any_author_window: int = 5,
    after_date: datetime | None = None,
    before_date: datetime | None = None,
    channel_ids: set[str] | None = None,
    strict: bool = False,
):
    """Extract all .hyp attachments from Discord sqlite."""
    if not sqlite_path.exists():
        print(f"Error: SQLite file not found at {sqlite_path}")
        return [], set(), set(), {}

    if channel_ids is None:
        channel_ids = set()

    stats = {
        "rows_scanned": 0,
        "rows_parsed": 0,
        "rows_skipped_channel": 0,
        "parse_errors": 0,
        "malformed_rows": 0,
        "hyp_attachments_seen": 0,
        "duplicates_skipped": 0,
    }

    conn = sqlite3.connect(str(sqlite_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
        SELECT id, text, date, metadata FROM items
        WHERE type = 'discordRawData'
        AND text LIKE '%"filename":%'
        AND text LIKE '%.hyp"%'
    """
    params = []
    if after_date is not None:
        query += " AND date >= ?"
        params.append(to_epoch(after_date))
    if before_date is not None:
        before_exclusive = before_date + timedelta(days=1)
        query += " AND date < ?"
        params.append(to_epoch(before_exclusive))

    cursor.execute(query, params)

    hyp_entries = []
    seen_attachment_ids = set()
    matched_urls = set()
    matched_attachment_ids = set()

    for row in cursor.fetchall():
        stats["rows_scanned"] += 1

        metadata = {}
        try:
            metadata = json.loads(row["metadata"] or "{}")
        except Exception:
            metadata = {}

        try:
            data = json.loads(row["text"])
            stats["rows_parsed"] += 1
        except json.JSONDecodeError:
            stats["parse_errors"] += 1
            if strict:
                raise
            continue

        if not isinstance(data, dict):
            stats["malformed_rows"] += 1
            if strict:
                raise ValueError(f"Row {row['id']} payload is not an object")
            continue

        channel = data.get("channel", {})
        users = data.get("users", {})
        messages = data.get("messages", [])

        channel_id = str(channel.get("id") or metadata.get("channelId") or "")
        if channel_ids and channel_id not in channel_ids:
            stats["rows_skipped_channel"] += 1
            continue

        if not isinstance(users, dict):
            users = {}
        if not isinstance(messages, list):
            stats["malformed_rows"] += 1
            if strict:
                raise ValueError(f"Row {row['id']} messages is not an array")
            continue

        for idx, msg in enumerate(messages):
            if not isinstance(msg, dict):
                continue

            attachments = msg.get("attachments", [])
            if not isinstance(attachments, list):
                continue

            for att in attachments:
                if not isinstance(att, dict):
                    continue

                filename = att.get("filename", "")
                if not filename.lower().endswith(".hyp"):
                    continue

                stats["hyp_attachments_seen"] += 1
                att_id = att.get("id", "")
                if att_id in seen_attachment_ids:
                    stats["duplicates_skipped"] += 1
                    continue

                hyp_url = att.get("url", "")

                if hyp_url_filter is not None or hyp_attachment_filter is not None:
                    allowed_by_url = hyp_url_filter is not None and hyp_url in hyp_url_filter
                    allowed_by_attachment = hyp_attachment_filter is not None and att_id in hyp_attachment_filter
                    if not allowed_by_url and not allowed_by_attachment:
                        continue

                seen_attachment_ids.add(att_id)
                if hyp_url:
                    matched_urls.add(hyp_url)
                if att_id:
                    matched_attachment_ids.add(att_id)

                uid = str(msg.get("uid", ""))
                user_info = users.get(uid, {})
                if not user_info and uid:
                    user_info = users.get(int(uid), {}) if uid.isdigit() else {}
                user_name = user_info.get("nickname") or user_info.get("name", "unknown")
                message_content_raw = msg.get("content", "")

                start_idx = max(0, idx - context_window)
                end_idx = min(len(messages), idx + context_window + 1)
                context_messages = []
                for ctx_idx in range(start_idx, end_idx):
                    if ctx_idx == idx:
                        continue
                    context_messages.append(
                        build_context_message(messages[ctx_idx], users, ctx_idx - idx)
                    )

                context_legacy = [
                    f"{c['author_name']}: {c['content']}"
                    for c in context_messages
                    if c.get("content")
                ]

                media_candidates = []

                # 1) Same-message media first
                for other_att in attachments:
                    if other_att.get("id") == att_id:
                        continue
                    if is_media_attachment(other_att):
                        media_candidates.append(
                            build_media_candidate(other_att, 0, True, "same_message")
                        )

                # 2) Same-author nearby media within context_window
                for near_idx in range(start_idx, end_idx):
                    if near_idx == idx:
                        continue
                    near_msg = messages[near_idx]
                    if not isinstance(near_msg, dict):
                        continue
                    if near_msg.get("uid", "") != uid:
                        continue
                    for near_att in near_msg.get("attachments", []):
                        if not is_media_attachment(near_att):
                            continue
                        media_candidates.append(
                            build_media_candidate(
                                near_att,
                                near_idx - idx,
                                True,
                                "same_author_nearby",
                            )
                        )

                # 3) Fallback: any-author nearby media in wider window
                used_any_author_fallback = False
                if not media_candidates and any_author_window > 0:
                    any_start = max(0, idx - any_author_window)
                    any_end = min(len(messages), idx + any_author_window + 1)
                    for near_idx in range(any_start, any_end):
                        if near_idx == idx:
                            continue
                        near_msg = messages[near_idx]
                        if not isinstance(near_msg, dict):
                            continue
                        near_uid = near_msg.get("uid", "")
                        for near_att in near_msg.get("attachments", []):
                            if not is_media_attachment(near_att):
                                continue
                            media_candidates.append(
                                build_media_candidate(
                                    near_att,
                                    near_idx - idx,
                                    near_uid == uid,
                                    "any_author_fallback",
                                )
                            )
                    if media_candidates:
                        used_any_author_fallback = True

                deduped = []
                seen_media = set()
                for candidate in media_candidates:
                    key = candidate.get("attachment_id") or (
                        candidate.get("filename"),
                        candidate.get("relative_index"),
                        candidate.get("url"),
                    )
                    if key in seen_media:
                        continue
                    seen_media.add(key)
                    deduped.append(candidate)
                media_candidates = deduped

                primary_preview = None
                if media_candidates:
                    primary_preview = media_candidates[0].get("attachment_id") or media_candidates[0].get("filename")

                app_name = app_name_from_filename(filename)
                summary_path = PROJECT_ROOT / "context" / "hyp_summaries" / f"{app_name}.md"

                flags = []
                if not media_candidates:
                    flags.append("no_media_found")
                if used_any_author_fallback:
                    flags.append("media_fallback_any_author")

                entry = {
                    "filename": filename,
                    "app_name": app_name,
                    "attachment_id": att_id,
                    "url": hyp_url,
                    "size": att.get("size", 0),
                    "source_type": "discord",
                    "message_id": msg.get("id", ""),
                    "channel_name": channel.get("name") or metadata.get("channelName") or "unknown",
                    "channel_category": channel.get("category") or "",
                    "user_name": user_name,
                    "user_id": uid,
                    "timestamp": msg.get("ts", ""),
                    "message_content_raw": message_content_raw,
                    "message_content": message_content_raw,
                    "context_window": context_window,
                    "context_messages": context_messages,
                    "context": context_legacy,
                    "summary_path": str(summary_path.relative_to(PROJECT_ROOT)),
                    "summary_exists": summary_path.exists(),
                    "media_candidates": media_candidates,
                    "primary_preview": primary_preview,
                    "flags": flags,
                    "status": "pending",
                    "local_path": None,
                }
                hyp_entries.append(entry)

    conn.close()
    return hyp_entries, matched_urls, matched_attachment_ids, stats


def load_existing_index(output_path: Path):
    """Load existing index to preserve download status and media status."""
    if output_path.exists():
        with open(output_path, encoding="utf-8") as f:
            return json.load(f)
    return []


def merge_media_candidates(new_candidates: list[dict], old_candidates: list[dict]) -> list[dict]:
    """Preserve media download state when candidate identity matches."""
    old_by_key = {}
    for c in old_candidates:
        key = c.get("attachment_id") or c.get("filename")
        if key:
            old_by_key[key] = c

    merged = []
    for c in new_candidates:
        key = c.get("attachment_id") or c.get("filename")
        old = old_by_key.get(key)
        if old:
            c["download_status"] = old.get("download_status", c.get("download_status", "pending"))
            c["local_path"] = old.get("local_path")
            if old.get("url_refreshed"):
                c["url_refreshed"] = old.get("url_refreshed")
        merged.append(c)
    return merged


def merge_with_existing(new_entries, existing_entries):
    """Merge new entries with existing, preserving download and media status."""
    existing_by_id = {e.get("attachment_id"): e for e in existing_entries if e.get("attachment_id")}

    merged = []
    for entry in new_entries:
        att_id = entry.get("attachment_id")
        existing = existing_by_id.get(att_id)
        if existing:
            entry["status"] = existing.get("status", "pending")
            entry["local_path"] = existing.get("local_path")

            entry["media_candidates"] = merge_media_candidates(
                entry.get("media_candidates", []),
                existing.get("media_candidates", []),
            )

            existing_primary = existing.get("primary_preview")
            if existing_primary:
                candidate_keys = {
                    c.get("attachment_id") or c.get("filename")
                    for c in entry.get("media_candidates", [])
                }
                if existing_primary in candidate_keys:
                    entry["primary_preview"] = existing_primary

            new_flags = set(entry.get("flags", []))
            for flag in existing.get("flags", []):
                new_flags.add(flag)
            entry["flags"] = sorted(new_flags)

        merged.append(entry)

    return merged


def build_external_entries(hyp_urls: list[str], matched_urls: set[str], matched_attachment_ids: set[str]) -> list[dict]:
    """Create placeholder entries for URLs in hyp-list not found in discord archive."""
    external_entries = []
    for url in hyp_urls:
        parsed_attachment_id = parse_discord_attachment_id(url)
        if url in matched_urls:
            continue
        if parsed_attachment_id and parsed_attachment_id in matched_attachment_ids:
            continue

        app_name = normalize_url_to_app_name(url)
        filename = Path(urlparse(url).path).name or f"{app_name}.hyp"
        summary_path = PROJECT_ROOT / "context" / "hyp_summaries" / f"{app_name}.md"

        external_entries.append({
            "filename": filename,
            "app_name": app_name,
            "attachment_id": f"external::{url}",
            "url": url,
            "size": 0,
            "source_type": "external_url",
            "message_id": "",
            "channel_name": "",
            "channel_category": "",
            "user_name": "",
            "user_id": "",
            "timestamp": "",
            "message_content_raw": "",
            "message_content": "",
            "context_window": 2,
            "context_messages": [],
            "context": [],
            "summary_path": str(summary_path.relative_to(PROJECT_ROOT)),
            "summary_exists": summary_path.exists(),
            "media_candidates": [],
            "primary_preview": None,
            "flags": ["missing_discord_record", "no_media_found"],
            "status": "pending",
            "local_path": None,
        })

    return external_entries


def load_hyp_targets(path: Path | None):
    if not path:
        return None, None, None
    if not path.exists():
        print(f"Warning: hyp list not found at {path}")
        return [], set(), set()

    urls = []
    url_set = set()
    attachment_ids = set()

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        urls.append(line)
        url_set.add(line)
        attachment_id = parse_discord_attachment_id(line)
        if attachment_id:
            attachment_ids.add(attachment_id)

    return urls, url_set, attachment_ids


def main():
    parser = argparse.ArgumentParser(description="Extract .hyp entries from discord sqlite")
    parser.add_argument("--sqlite", type=Path, default=resolve_default_sqlite(), help="Path to Discord sqlite")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="Path to output index")
    parser.add_argument("--context-window", type=int, default=2, help="Nearby message window for context and same-author media")
    parser.add_argument("--any-author-window", type=int, default=5, help="Fallback window for any-author media when strict matching has none (0 disables)")
    parser.add_argument("--hyp-list", type=Path, default=None, help="Optional list of target .hyp URLs")
    parser.add_argument("--after", type=parse_ymd, default=None, help="Start day inclusive (YYYY-MM-DD)")
    parser.add_argument("--before", type=parse_ymd, default=None, help="End day inclusive (YYYY-MM-DD)")
    parser.add_argument("--channel-id", action="append", default=[], help="Optional channel filter. Can be repeated and/or comma-separated")
    parser.add_argument("--strict", action="store_true", help="Fail on parse/malformed rows")
    parser.add_argument("--stats", action="store_true", help="Print extraction stats")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without writing output")

    args = parser.parse_args()

    if args.after and args.before and args.after > args.before:
        raise SystemExit("--after must be less than or equal to --before")

    hyp_urls, hyp_url_filter, hyp_attachment_filter = load_hyp_targets(args.hyp_list)
    channel_filter = parse_channel_filter(args.channel_id)

    print(f"Extracting .hyp attachments from: {args.sqlite}")
    if args.after or args.before:
        print(f"Date filter: after={args.after.date() if args.after else None} before={args.before.date() if args.before else None}")
    if channel_filter:
        print(f"Channel filter: {', '.join(sorted(channel_filter))}")
    if hyp_urls is not None:
        print(f"Filtering to {len(hyp_urls)} URLs from: {args.hyp_list}")

    new_entries, matched_urls, matched_attachment_ids, stats = extract_hyp_attachments(
        sqlite_path=args.sqlite,
        context_window=max(0, args.context_window),
        hyp_url_filter=hyp_url_filter,
        hyp_attachment_filter=hyp_attachment_filter,
        any_author_window=max(0, args.any_author_window),
        after_date=args.after,
        before_date=args.before,
        channel_ids=channel_filter,
        strict=args.strict,
    )

    if hyp_urls is not None:
        external_entries = build_external_entries(hyp_urls, matched_urls, matched_attachment_ids)
        new_entries.extend(external_entries)

    print(f"Found {len(new_entries)} .hyp entries")

    existing = load_existing_index(args.output)
    if existing:
        print(f"Merging with {len(existing)} existing entries")
        entries = merge_with_existing(new_entries, existing)
    else:
        entries = new_entries

    entries.sort(key=lambda x: (x.get("timestamp", ""), x.get("filename", "")))

    downloaded = sum(1 for e in entries if e.get("status") == "downloaded")
    pending = sum(1 for e in entries if e.get("status") == "pending")
    with_media = sum(1 for e in entries if e.get("media_candidates"))
    summaries = sum(1 for e in entries if e.get("summary_exists"))
    missing_discord = sum(1 for e in entries if "missing_discord_record" in e.get("flags", []))

    print(f"  Downloaded hyp files: {downloaded}")
    print(f"  Pending hyp files: {pending}")
    print(f"  Entries with media candidates: {with_media}")
    print(f"  Entries with summaries: {summaries}")
    print(f"  Missing Discord records: {missing_discord}")

    if args.stats:
        print("  Extraction stats:")
        print(f"    rows_scanned: {stats['rows_scanned']}")
        print(f"    rows_parsed: {stats['rows_parsed']}")
        print(f"    rows_skipped_channel: {stats['rows_skipped_channel']}")
        print(f"    parse_errors: {stats['parse_errors']}")
        print(f"    malformed_rows: {stats['malformed_rows']}")
        print(f"    hyp_attachments_seen: {stats['hyp_attachments_seen']}")
        print(f"    duplicates_skipped: {stats['duplicates_skipped']}")

    if args.strict and (stats["parse_errors"] > 0 or stats["malformed_rows"] > 0):
        raise SystemExit("Strict mode failed due to parse/malformed rows")

    if args.dry_run:
        print("\nDry run enabled, not writing output.")
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)

    print(f"\nSaved {len(entries)} entries to: {args.output}")

    print("\nSample entries:")
    for entry in entries[:5]:
        media_count = len(entry.get("media_candidates", []))
        print(f"  - {entry['filename']} by {entry.get('user_name', 'unknown')} (media: {media_count})")


if __name__ == "__main__":
    main()

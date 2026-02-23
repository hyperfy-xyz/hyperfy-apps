#!/usr/bin/env python3
"""Build catalog artifacts in hyperfy-apps from sunset research outputs.

Pipeline:
1. Copy source research artifacts into scripts/context/ and tmp/
2. Optimize media into catalog/media/ with size gating
3. Generate per-app manifests in scripts/context/apps/<slug>/manifest.json
4. Generate global manifest index in tmp/manifests/apps-manifest.json
5. Generate missing-media checklist in tmp/issues/
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


MAX_BYTES_DEFAULT = 50 * 1024 * 1024
IMG_EXTS = {".png", ".jpg", ".jpeg"}
VID_EXTS = {".mp4", ".mov"}


@dataclass
class OptimizeResult:
    status: str
    optimized_rel: str | None
    reason: str
    original_size: int
    optimized_size: int | None


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sanitize_slug(value: str) -> str:
    value = (value or "app").strip()
    value = value.lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "app"


def strip_md(text: str) -> str:
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    text = re.sub(r"[*_>#-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_summary_excerpt(path: Path, max_len: int = 320) -> str:
    if not path.exists():
        return ""
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

    for line in content.splitlines():
        candidate = strip_md(line)
        if not candidate:
            continue
        if candidate.lower().startswith("extracted from"):
            continue
        if candidate.lower().startswith("metadata"):
            continue
        return candidate[:max_len]
    return ""


def load_filename_mappings(csv_path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not csv_path.exists():
        return out
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            old_name = (row.get("old_name") or "").strip().strip('"')
            new_name = (row.get("new_name") or "").strip().strip('"')
            if old_name and new_name:
                out[old_name.lower()] = new_name
    return out


def detect_v2_json(v2_dir: Path) -> Path | None:
    if not v2_dir.exists():
        return None
    jsons = sorted(p for p in v2_dir.glob("*.json") if p.is_file())
    return jsons[0] if jsons else None


def resolve_v2_slug(app_name: str, filename_stem: str, v2_slugs: set[str], mappings: dict[str, str]) -> str | None:
    candidates = {
        sanitize_slug(app_name),
        sanitize_slug(filename_stem),
    }

    # check filename mappings
    app_key = app_name.replace("_", " ").strip().lower()
    file_key = filename_stem.replace("_", " ").strip().lower()
    mapped = mappings.get(app_key) or mappings.get(file_key)
    if mapped:
        candidates.add(sanitize_slug(mapped))

    # exact match (v2 dirs are now all slugified)
    for c in candidates:
        if c and c in v2_slugs:
            return c

    # fallback: strip all non-alphanumeric and compare
    for c in candidates:
        c2 = re.sub(r"[^a-z0-9]", "", c)
        if not c2:
            continue
        for slug in v2_slugs:
            if re.sub(r"[^a-z0-9]", "", slug) == c2:
                return slug

    return None


def copy_artifacts(
    source_research: Path,
    context_dir: Path,
    tmp_dir: Path,
    dry_run: bool = False,
    use_local_index: bool = True,
    local_index_path: Path | None = None,
):
    src_index = source_research / "hyp_index.json"
    src_summaries = source_research / "hyp_summaries"
    src_media = source_research / "hyp_media"
    src_report = source_research / "hyp_media_report.md"

    dst_index = context_dir / "hyp_index.raw.json"
    dst_summaries = context_dir / "hyp_summaries"
    dst_media_raw = tmp_dir / "hyp_media_raw"
    dst_report = tmp_dir / "hyp_media_report.md"

    local_index = local_index_path or dst_index
    warnings: list[str] = []
    source_exists = source_research.exists()

    if not dry_run:
        context_dir.mkdir(parents=True, exist_ok=True)
        tmp_dir.mkdir(parents=True, exist_ok=True)

    # Index resolution: prefer local canonical index, fallback to source research import.
    if use_local_index and local_index.exists():
        index_path = local_index
        index_mode = "local"
    elif source_exists and src_index.exists():
        if dry_run:
            index_path = src_index
        else:
            shutil.copy2(src_index, dst_index)
            index_path = dst_index
        index_mode = "source-research"
    elif dst_index.exists():
        index_path = dst_index
        index_mode = "local-existing"
        warnings.append("source-research hyp_index.json missing; using existing scripts/context/hyp_index.raw.json")
    else:
        raise FileNotFoundError(
            "No usable index found. Provide --local-index (or generate it) or ensure --source-research/hyp_index.json exists."
        )

    # Summaries resolution: refresh from source when available, otherwise use existing local copy.
    if source_exists and src_summaries.exists():
        if dry_run:
            summaries_path = src_summaries
        else:
            if dst_summaries.exists():
                shutil.rmtree(dst_summaries)
            shutil.copytree(src_summaries, dst_summaries)
            summaries_path = dst_summaries
    elif dst_summaries.exists():
        summaries_path = dst_summaries
        warnings.append("source-research hyp_summaries missing; using existing context/hyp_summaries")
    else:
        summaries_path = dst_summaries
        warnings.append("No hyp_summaries found; summary excerpts will be empty")

    # Media resolution: optional in simplified pipeline.
    if source_exists and src_media.exists():
        if dry_run:
            media_raw_path = src_media
        else:
            if dst_media_raw.exists():
                shutil.rmtree(dst_media_raw)
            shutil.copytree(src_media, dst_media_raw)
            media_raw_path = dst_media_raw
    elif dst_media_raw.exists():
        media_raw_path = dst_media_raw
        warnings.append("source-research hyp_media missing; using existing tmp/hyp_media_raw")
    else:
        media_raw_path = dst_media_raw
        warnings.append("No hyp_media available; media optimization stage will be skipped automatically")

    # Media report is optional; keep best available copy.
    if source_exists and src_report.exists():
        if dry_run:
            report_path = src_report
        else:
            shutil.copy2(src_report, dst_report)
            report_path = dst_report
    elif dst_report.exists():
        report_path = dst_report
        warnings.append("source-research hyp_media_report.md missing; using existing tmp/hyp_media_report.md")
    else:
        report_path = dst_report
        warnings.append("No hyp_media_report.md available")

    return {
        "index": index_path,
        "summaries": summaries_path,
        "media_raw": media_raw_path,
        "report": report_path,
        "warnings": warnings,
        "index_mode": index_mode,
    }


def extract_media_rel(local_path: str) -> str | None:
    if not local_path:
        return None
    marker = "research/hyp_media/"
    if marker in local_path:
        return local_path.split(marker, 1)[1]
    if "tmp/hyp_media_raw/" in local_path:
        return local_path.split("tmp/hyp_media_raw/", 1)[1]
    if local_path.startswith("hyp_media/"):
        return local_path.split("hyp_media/", 1)[1]
    if local_path.startswith("catalog/discord/hyp_media/"):
        return local_path.split("catalog/discord/hyp_media/", 1)[1]
    return None


def collect_referenced_media_rels(hyp_index_path: Path) -> tuple[set[str], int]:
    entries = json.loads(hyp_index_path.read_text(encoding="utf-8"))
    referenced: set[str] = set()
    legacy_flat = 0
    for e in entries:
        for c in e.get("media_candidates", []):
            if not isinstance(c, dict):
                continue
            rel = extract_media_rel(c.get("local_path") or "")
            if not rel:
                continue
            # Enforce slug-folder convention: <slug>/<filename>
            if "/" not in rel:
                legacy_flat += 1
                continue
            referenced.add(rel)
    return referenced, legacy_flat


def run_cmd(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=False)


def human_size(num_bytes: int | None) -> str:
    if num_bytes is None:
        return "0 B"
    size = float(max(num_bytes, 0))
    units = ["B", "KB", "MB", "GB", "TB"]
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            if unit == "B":
                return f"{int(size)} {unit}"
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return "0 B"


def progress_bar(current: int, total: int, width: int = 24) -> str:
    if total <= 0:
        return "[" + ("-" * width) + "]"
    ratio = min(max(current / total, 0.0), 1.0)
    filled = int(width * ratio)
    return "[" + ("#" * filled) + ("-" * (width - filled)) + "]"


def optimize_file(src: Path, dst: Path) -> bool:
    ext = src.suffix.lower()
    dst.parent.mkdir(parents=True, exist_ok=True)

    if ext in VID_EXTS:
        cmd = [
            "ffmpeg", "-y", "-i", str(src),
            "-vf", "scale='min(1920,iw)':-2:force_original_aspect_ratio=decrease",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(dst),
        ]
        result = run_cmd(cmd)
        return result.returncode == 0

    if ext == ".png":
        cmd = ["pngquant", "--quality=65-85", "--output", str(dst), "--force", "--", str(src)]
        result = run_cmd(cmd)
        return result.returncode == 0

    if ext in {".jpg", ".jpeg"}:
        shutil.copy2(src, dst)
        result = run_cmd(["jpegoptim", "--max=85", "--strip-all", str(dst)])
        return result.returncode == 0

    shutil.copy2(src, dst)
    return True


def optimize_media_tree(
    media_raw: Path,
    media_out: Path,
    max_bytes: int,
    dry_run: bool = False,
    resume: bool = True,
    referenced_rels: set[str] | None = None,
):
    mapping: dict[str, OptimizeResult] = {}
    rows: list[dict[str, Any]] = []

    if not media_raw.exists():
        return mapping, rows

    all_sources = sorted(p for p in media_raw.rglob("*") if p.is_file())
    if referenced_rels is None:
        sources = all_sources
        skipped_unreferenced = 0
    else:
        sources = []
        for src in all_sources:
            rel = src.relative_to(media_raw).as_posix()
            if rel in referenced_rels:
                sources.append(src)
        skipped_unreferenced = len(all_sources) - len(sources)
    total = len(sources)
    if total == 0:
        print("Media optimization")
        print("  no source files found")
        if referenced_rels is not None and skipped_unreferenced:
            print(f"  skipped_unreferenced_files: {skipped_unreferenced}")
        return mapping, rows

    if not dry_run:
        if media_out.exists() and not resume:
            shutil.rmtree(media_out)
        media_out.mkdir(parents=True, exist_ok=True)

    is_tty = os.isatty(1)
    non_tty_step = max(1, total // 20)
    processed = 0
    count_images = 0
    count_png = 0
    count_videos = 0
    count_kept = 0
    count_excluded = 0
    count_failed = 0
    count_dry_run = 0
    bytes_before = 0
    bytes_after = 0
    bytes_excluded = 0

    print("Media optimization")
    if referenced_rels is not None and skipped_unreferenced:
        print(f"  skipped_unreferenced_files: {skipped_unreferenced}")

    for src in sources:
        rel = src.relative_to(media_raw).as_posix()
        dst = media_out / rel
        original_size = src.stat().st_size
        ext = src.suffix.lower()
        bytes_before += original_size

        if ext in VID_EXTS:
            count_videos += 1
        if ext == ".png":
            count_png += 1
        if ext in IMG_EXTS:
            count_images += 1

        if dry_run:
            count_dry_run += 1
            bytes_after += original_size
            mapping[rel] = OptimizeResult(
                status="dry_run",
                optimized_rel=rel,
                reason="dry-run",
                original_size=original_size,
                optimized_size=original_size,
            )
            rows.append({
                "relative_path": rel,
                "status": "dry_run",
                "reason": "dry-run",
                "original_size": original_size,
                "optimized_size": original_size,
            })
        else:
            if resume and dst.exists():
                optimized_size = dst.stat().st_size
                if optimized_size <= max_bytes:
                    count_kept += 1
                    bytes_after += optimized_size
                    mapping[rel] = OptimizeResult(
                        status="kept",
                        optimized_rel=rel,
                        reason="reused_existing",
                        original_size=original_size,
                        optimized_size=optimized_size,
                    )
                    rows.append({
                        "relative_path": rel,
                        "status": "kept",
                        "reason": "reused_existing",
                        "original_size": original_size,
                        "optimized_size": optimized_size,
                    })
                    processed += 1
                    line = (
                        f"  {progress_bar(processed, total)} {processed:>4}/{total:<4} "
                        f"img:{count_images:<4} png:{count_png:<4} vid:{count_videos:<4} "
                        f"kept:{count_kept:<4} excl:{count_excluded:<4} fail:{count_failed:<4}"
                    )
                    if is_tty:
                        print(f"\r{line}", end="", flush=True)
                    elif processed == total or processed % non_tty_step == 0:
                        print(line)
                    continue
                dst.unlink(missing_ok=True)

            ok = optimize_file(src, dst)
            if not ok:
                if dst.exists():
                    dst.unlink(missing_ok=True)
                count_failed += 1
                mapping[rel] = OptimizeResult(
                    status="failed",
                    optimized_rel=None,
                    reason="optimizer_failed",
                    original_size=original_size,
                    optimized_size=None,
                )
                rows.append({
                    "relative_path": rel,
                    "status": "failed",
                    "reason": "optimizer_failed",
                    "original_size": original_size,
                    "optimized_size": "",
                })
            else:
                optimized_size = dst.stat().st_size
                if optimized_size > max_bytes:
                    dst.unlink(missing_ok=True)
                    count_excluded += 1
                    bytes_excluded += original_size
                    mapping[rel] = OptimizeResult(
                        status="excluded",
                        optimized_rel=None,
                        reason=f"optimized_above_limit_{max_bytes}",
                        original_size=original_size,
                        optimized_size=optimized_size,
                    )
                    rows.append({
                        "relative_path": rel,
                        "status": "excluded",
                        "reason": f"optimized_above_limit_{max_bytes}",
                        "original_size": original_size,
                        "optimized_size": optimized_size,
                    })
                else:
                    count_kept += 1
                    bytes_after += optimized_size
                    mapping[rel] = OptimizeResult(
                        status="kept",
                        optimized_rel=rel,
                        reason="ok",
                        original_size=original_size,
                        optimized_size=optimized_size,
                    )
                    rows.append({
                        "relative_path": rel,
                        "status": "kept",
                        "reason": "ok",
                        "original_size": original_size,
                        "optimized_size": optimized_size,
                    })

        processed += 1
        line = (
            f"  {progress_bar(processed, total)} {processed:>4}/{total:<4} "
            f"img:{count_images:<4} png:{count_png:<4} vid:{count_videos:<4} "
            f"kept:{count_kept:<4} excl:{count_excluded:<4} fail:{count_failed:<4}"
        )
        if is_tty:
            print(f"\r{line}", end="", flush=True)
        elif processed == total or processed % non_tty_step == 0:
            print(line)

    if is_tty:
        print()

    size_saved = max(0, bytes_before - bytes_after)
    saved_pct = (size_saved / bytes_before * 100.0) if bytes_before else 0.0
    print("Media optimization summary")
    print(
        "  files: "
        f"total={total}, kept={count_kept}, excluded={count_excluded}, failed={count_failed}, dry_run={count_dry_run}"
    )
    print(f"  types: images={count_images}, png={count_png}, videos={count_videos}")
    print(f"  size_before: {human_size(bytes_before)}")
    print(f"  size_after: {human_size(bytes_after)}")
    print(f"  saved: {human_size(size_saved)} ({saved_pct:.1f}%)")
    print(f"  excluded_input_size: {human_size(bytes_excluded)}")

    return mapping, rows


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def pick_primary_candidate(candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not candidates:
        return None

    def rank(c: dict[str, Any]):
        reason = c.get("selection_reason")
        rel = abs(int(c.get("relative_index", 999) or 999))
        reason_rank = {
            "same_message": 0,
            "same_author_nearby": 1,
            "any_author_fallback": 2,
        }.get(reason, 3)
        return (reason_rank, rel)

    return sorted(candidates, key=rank)[0]


def find_existing_preview(repo_root: Path, slug: str) -> str | None:
    media_dir = repo_root / "catalog" / "media" / slug
    if not media_dir.exists():
        return None
    matches = sorted(media_dir.glob("preview.*"))
    if not matches:
        return None
    return f"catalog/media/{slug}/{matches[0].name}"


def build_catalog_manifests(
    repo_root: Path,
    hyp_index_path: Path,
    summaries_dir: Path,
    media_map: dict[str, OptimizeResult],
    max_bytes: int,
    merge_ai_summaries: bool = True,
    dry_run: bool = False,
):
    entries = json.loads(hyp_index_path.read_text(encoding="utf-8"))
    v2_root = repo_root / "v2" / "apps"
    v2_slugs = {p.name for p in v2_root.iterdir() if p.is_dir()} if v2_root.exists() else set()
    mappings = load_filename_mappings(repo_root / "tmp" / "filename-mappings.csv")

    apps_out_root = repo_root / "scripts" / "context" / "apps"
    manifests_out = repo_root / "tmp" / "manifests" / "apps-manifest.json"
    issue_out = repo_root / "tmp" / "issues" / "missing-media-checklist.md"

    if not dry_run:
        apps_out_root.mkdir(parents=True, exist_ok=True)

    compact_apps_by_slug: dict[str, dict[str, Any]] = {}
    missing_preview = []
    slug_collision_entries: dict[str, list[dict[str, Any]]] = {}

    for e in entries:
        app_name = e.get("app_name") or Path(e.get("filename", "app.hyp")).stem
        filename_stem = Path(e.get("filename", "app.hyp")).stem
        v2_slug = resolve_v2_slug(app_name, filename_stem, v2_slugs, mappings)

        preferred_slug = v2_slug or sanitize_slug(app_name)
        message_id = e.get("message_id") or e.get("attachment_id") or "unknown"
        app_id = f"{preferred_slug}-{message_id}"
        hyp_filename = e.get("filename")
        has_hyp_file = bool(hyp_filename and (repo_root / "v2" / "hyp-files" / hyp_filename).exists())
        slug_collision_entries.setdefault(preferred_slug, []).append({
            "app_id": app_id,
            "message_id": e.get("message_id"),
            "attachment_id": e.get("attachment_id"),
            "timestamp": e.get("timestamp"),
            "hyp_filename": hyp_filename,
            "has_hyp_file": has_hyp_file,
        })

        v2_dir = repo_root / "v2" / "apps" / v2_slug if v2_slug else None
        v2_json = detect_v2_json(v2_dir) if v2_dir else None
        v2_json_data: dict[str, Any] = {}
        if v2_json and v2_json.exists():
            try:
                v2_json_data = json.loads(v2_json.read_text(encoding="utf-8"))
            except Exception:
                v2_json_data = {}

        summary_rel = e.get("summary_path") or ""
        for prefix in ("research/hyp_summaries/", "scripts/context/hyp_summaries/", "./scripts/context/hyp_summaries/"):
            if summary_rel.startswith(prefix):
                summary_rel = summary_rel[len(prefix):]
                break
        summary_path = summaries_dir / summary_rel if summary_rel else None
        summary_excerpt = load_summary_excerpt(summary_path) if summary_path else ""

        author_name = (e.get("user_name") or "").strip() or (v2_json_data.get("author") or "").strip()
        author_conf = "high" if e.get("user_name") else ("medium" if v2_json_data.get("author") else "low")
        author_evidence = "discord" if e.get("user_name") else ("v2_json" if v2_json_data.get("author") else "unresolved")

        raw_msg = (e.get("message_content_raw") or "").strip()
        desc = raw_msg or summary_excerpt or (v2_json_data.get("desc") or "")
        desc_source = "discord_message" if raw_msg else ("summary_excerpt" if summary_excerpt else ("v2_json_desc" if v2_json_data.get("desc") else "empty"))

        mapped_media = []
        for c in e.get("media_candidates", []):
            local_path = c.get("local_path") or ""
            rel_media = extract_media_rel(local_path) or ""
            if not rel_media:
                continue

            opt = media_map.get(rel_media)
            excluded_large = False
            out_rel = None
            if opt and opt.optimized_rel and opt.status in {"kept", "dry_run"}:
                out_rel = f"catalog/media/{opt.optimized_rel}"
            elif opt and opt.status == "excluded":
                excluded_large = True

            mapped_media.append({
                "catalog_path": out_rel,
                "original_filename": c.get("filename"),
                "content_type": c.get("content_type"),
                "relative_index": c.get("relative_index"),
                "same_author": c.get("same_author"),
                "selection_reason": c.get("selection_reason"),
                "size_bytes": opt.optimized_size if opt and opt.optimized_size is not None else opt.original_size if opt else None,
                "optimized": bool(opt and opt.status == "kept"),
                "excluded_large": excluded_large,
                "download_status": c.get("download_status"),
                "attachment_id": c.get("attachment_id"),
            })

        usable_media = [m for m in mapped_media if m.get("catalog_path")]
        primary = pick_primary_candidate(usable_media)
        if primary is None:
            fallback_preview = find_existing_preview(repo_root, preferred_slug)
            if fallback_preview:
                primary = {
                    "catalog_path": fallback_preview,
                    "selection_reason": "existing_catalog_preview",
                }

        flags = set(e.get("flags", []))
        if not has_hyp_file:
            flags.add("missing_hyp_file")
        needs_media_review = primary is None
        if needs_media_review:
            missing_preview.append(e)

        needs_author_review = not bool(author_name)

        manifest = {
            "app_id": app_id,
            "app_slug": preferred_slug,
            "app_name": app_name,
            "source": {
                "hyp_filename": hyp_filename,
                "discord_attachment_id": e.get("attachment_id"),
                "discord_message_id": e.get("message_id"),
                "discord_channel": e.get("channel_name"),
                "discord_channel_category": e.get("channel_category"),
                "discord_timestamp": e.get("timestamp"),
                "discord_url": e.get("url"),
            },
            "author": {
                "display_name": author_name,
                "discord_user_id": e.get("user_id"),
                "confidence": author_conf,
                "evidence": author_evidence,
            },
            "description": {
                "short": desc,
                "raw_message_content": raw_msg,
                "summary_excerpt": summary_excerpt,
                "source_priority_used": desc_source,
            },
            "links": {
                "v2_app_dir": f"v2/apps/{v2_slug}" if v2_slug else None,
                "v2_json_path": str(v2_json.relative_to(repo_root)) if v2_json else None,
                "hyp_summary_path": (
                    f"scripts/context/hyp_summaries/{summary_rel}"
                    if (summary_rel and summary_path and summary_path.exists())
                    else None
                ),
            },
            "preview": {
                "primary_media_path": primary.get("catalog_path") if primary else None,
                "media_type": (Path(primary.get("catalog_path", "")).suffix.lower() if primary else None),
                "selection_reason": primary.get("selection_reason") if primary else None,
                "is_fallback_any_author": bool(primary and primary.get("selection_reason") == "any_author_fallback"),
            },
            "media": mapped_media,
            "status": {
                "has_preview": primary is not None,
                "has_hyp_file": has_hyp_file,
                "needs_media_review": needs_media_review,
                "needs_author_review": needs_author_review,
                "flags": sorted(flags),
                "notes": "",
            },
            "generated_at": now_iso(),
            "max_commit_size_bytes": max_bytes,
        }

        ai_summary = None
        ai_summary_path = repo_root / "tmp" / "ai-summaries" / f"{preferred_slug}.json"
        if merge_ai_summaries and ai_summary_path.exists():
            try:
                ai_summary = json.loads(ai_summary_path.read_text(encoding="utf-8"))
                manifest["ai"] = ai_summary
            except Exception:
                ai_summary = None

        compact_apps_by_slug[preferred_slug] = {
            "app_id": app_id,
            "app_slug": preferred_slug,
            "app_name": app_name,
            "author": author_name,
            "has_preview": primary is not None,
            "primary_preview": primary.get("catalog_path") if primary else None,
            "manifest_path": f"scripts/context/apps/{preferred_slug}/manifest.json",
            "v2_app_dir": f"v2/apps/{v2_slug}" if v2_slug else None,
            "has_hyp_file": has_hyp_file,
            "has_ai_summary": bool(ai_summary),
            "ai_summary_path": f"tmp/ai-summaries/{preferred_slug}.json" if ai_summary else None,
            "flags": sorted(flags),
        }

        if not dry_run:
            app_dir = apps_out_root / preferred_slug
            app_dir.mkdir(parents=True, exist_ok=True)
            (app_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    compact_apps = sorted(compact_apps_by_slug.values(), key=lambda x: x["app_name"].lower())

    collision_groups = []
    for slug, rows in sorted(slug_collision_entries.items()):
        if len(rows) <= 1:
            continue
        kept_app_id = compact_apps_by_slug[slug]["app_id"]
        collision_groups.append({
            "app_slug": slug,
            "kept_app_id": kept_app_id,
            "all_app_ids": [r["app_id"] for r in rows],
            "dropped_app_ids": [r["app_id"] for r in rows if r["app_id"] != kept_app_id],
            "source_rows": rows,
        })
    dropped_duplicate_count = sum(len(g["dropped_app_ids"]) for g in collision_groups)
    collision_out = repo_root / "tmp" / "manifests" / "slug-collision-report.json"

    global_manifest = {
        "version": 1,
        "generated_at": now_iso(),
        "counts": {
            "source_entries": len(entries),
            "apps": len(compact_apps),
            "with_preview": sum(1 for a in compact_apps if a["has_preview"]),
            "missing_preview": sum(1 for a in compact_apps if not a["has_preview"]),
            "with_hyp_file": sum(1 for a in compact_apps if a.get("has_hyp_file")),
            "missing_hyp_file": sum(1 for a in compact_apps if not a.get("has_hyp_file")),
            "slug_collisions": len(collision_groups),
            "dropped_duplicate_entries": dropped_duplicate_count,
        },
        "apps": compact_apps,
    }

    if not dry_run:
        manifests_out.parent.mkdir(parents=True, exist_ok=True)
        manifests_out.write_text(json.dumps(global_manifest, indent=2), encoding="utf-8")
        collision_out.parent.mkdir(parents=True, exist_ok=True)
        collision_out.write_text(
            json.dumps(
                {
                    "generated_at": now_iso(),
                    "source_entries": len(entries),
                    "unique_slugs": len(compact_apps),
                    "collision_groups": collision_groups,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    # Issue checklist
    lines = [
        "# Missing preview media for Hyperfy app explorer ingestion",
        "",
        f"Generated: {now_iso()}",
        "",
        "## Summary",
        f"- Total apps: {len(compact_apps)}",
        f"- Missing preview: {sum(1 for a in compact_apps if not a['has_preview'])}",
        "",
        "## Checklist",
        "",
    ]

    missing_compact = [a for a in compact_apps if not a["has_preview"]]
    for a in missing_compact:
        # lookup source details for readability
        entry = next((e for e in entries if sanitize_slug(e.get("app_name", "")) == sanitize_slug(a["app_name"]) and (e.get("message_id") or e.get("attachment_id") or "unknown") in a["app_id"]), None)
        author = (entry or {}).get("user_name") or a.get("author") or "unknown"
        ts = (entry or {}).get("timestamp") or "unknown"
        msg_id = (entry or {}).get("message_id") or "unknown"
        lines.append(f"- [ ] {a['app_name']} ({author}) - {ts} - message `{msg_id}`")

    issue_body = "\n".join(lines) + "\n"
    if not dry_run:
        issue_out.parent.mkdir(parents=True, exist_ok=True)
        issue_out.write_text(issue_body, encoding="utf-8")

    return {
        "global_manifest": global_manifest,
        "source_entry_count": len(entries),
        "unique_slug_count": len(compact_apps),
        "collision_count": len(collision_groups),
        "dropped_duplicate_count": dropped_duplicate_count,
        "missing_hyp_count": sum(1 for a in compact_apps if not a.get("has_hyp_file")),
        "collision_report_path": collision_out,
        "missing_count": len(missing_compact),
        "issue_path": issue_out,
    }


def main():
    parser = argparse.ArgumentParser(description="Build hyperfy-apps catalog from sunset research")
    parser.add_argument("--source-research", type=Path, default=Path("/home/jin/repo/hyperfy-archive/sunset/research"))
    parser.add_argument(
        "--use-local-index",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Prefer local canonical index (scripts/context/hyp_index.raw.json) over importing source-research/hyp_index.json",
    )
    parser.add_argument(
        "--local-index",
        type=Path,
        default=None,
        help="Override local index path (default: <repo-root>/scripts/context/hyp_index.raw.json)",
    )
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--max-bytes", type=int, default=MAX_BYTES_DEFAULT)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-optimize", action="store_true")
    parser.add_argument("--no-resume-optimize", action="store_true")
    parser.add_argument("--no-merge-ai-summaries", action="store_true")
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    catalog_root = repo_root / "catalog"
    context_dir = repo_root / "scripts" / "context"
    tmp_dir = repo_root / "tmp"
    local_index = args.local_index.resolve() if args.local_index else (context_dir / "hyp_index.raw.json")

    copied = copy_artifacts(
        source_research=args.source_research.resolve(),
        context_dir=context_dir,
        tmp_dir=tmp_dir,
        dry_run=args.dry_run,
        use_local_index=args.use_local_index,
        local_index_path=local_index,
    )

    referenced_media_rels: set[str] | None = None
    try:
        referenced_media_rels, legacy_flat_refs = collect_referenced_media_rels(copied["index"])
        if legacy_flat_refs:
            copied["warnings"].append(
                f"{legacy_flat_refs} media candidates still use legacy flat local_path entries; "
                "rerun download_hyp_files.py --media --write-index to migrate to tmp/hyp_media_raw/<slug>/..."
            )
    except Exception as exc:
        copied["warnings"].append(f"Could not collect referenced media rels from index: {exc}")
        referenced_media_rels = None

    media_map: dict[str, OptimizeResult]
    optimize_rows: list[dict[str, Any]]

    if args.skip_optimize:
        media_map, optimize_rows = {}, []
    else:
        media_out = catalog_root / "media"
        media_map, optimize_rows = optimize_media_tree(
            copied["media_raw"],
            media_out,
            max_bytes=args.max_bytes,
            dry_run=args.dry_run,
            resume=not args.no_resume_optimize,
            referenced_rels=referenced_media_rels,
        )

    if not args.dry_run and not args.skip_optimize:
        opt_csv = tmp_dir / "hyp_media_optimization.csv"
        exc_csv = tmp_dir / "hyp_media_excluded.csv"
        write_csv(
            opt_csv,
            optimize_rows,
            ["relative_path", "status", "reason", "original_size", "optimized_size"],
        )
        excluded_rows = [r for r in optimize_rows if r.get("status") == "excluded"]
        if excluded_rows:
            write_csv(
                exc_csv,
                excluded_rows,
                ["relative_path", "status", "reason", "original_size", "optimized_size"],
            )
        else:
            print("  Excluded media: 0 (no hyp_media_excluded.csv written)")

    result = build_catalog_manifests(
        repo_root=repo_root,
        hyp_index_path=copied["index"],
        summaries_dir=copied["summaries"],
        media_map=media_map,
        max_bytes=args.max_bytes,
        merge_ai_summaries=not args.no_merge_ai_summaries,
        dry_run=args.dry_run,
    )

    print("Catalog build complete")
    print(f"  Repo root: {repo_root}")
    print(f"  Dry run: {args.dry_run}")
    print(f"  Index mode: {copied.get('index_mode')}")
    for warning in copied.get("warnings", []):
        print(f"  Warning: {warning}")
    print(f"  Source entries: {result['source_entry_count']}")
    print(f"  Unique slugs: {result['unique_slug_count']}")
    print(f"  Slug collisions: {result['collision_count']} (dropped {result['dropped_duplicate_count']} duplicates)")
    print(f"  Missing .hyp files: {result['missing_hyp_count']}")
    print(f"  Missing preview count: {result['missing_count']}")
    if not args.dry_run:
        print(f"  Global manifest: {repo_root / 'tmp/manifests/apps-manifest.json'}")
        print(f"  Collision report: {result['collision_report_path']}")
        print(f"  Issue checklist: {result['issue_path']}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build merged catalog from manifests and AI summaries.

Outputs:
  catalog/catalog.json    - single file for web explorer (version 3)

Inputs:
  context/apps/*/manifest.json  (manifest["ai"] or tmp/ai-summaries/<slug>.json)
  v2/*/  (blueprint JSON, index.js, asset files)
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_ROOT = REPO_ROOT / "catalog"
CONTEXT_APPS_DIR = REPO_ROOT / "context" / "apps"
AI_SUMMARIES_DIR = REPO_ROOT / "tmp" / "ai-summaries"
MEDIA_DIR = CATALOG_ROOT / "media"
V2_APPS_DIR = REPO_ROOT / "v2"
HYP_FILES_DIR = REPO_ROOT / "hyp-files"
TMP_MANIFESTS_DIR = REPO_ROOT / "tmp" / "manifests"

def detect_github_raw_base() -> str:
    """Detect GitHub raw URL base from git remote, with fallback."""
    import subprocess
    try:
        result = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
        )
        url = result.stdout.strip()
        # Handle https://github.com/user/repo.git or git@github.com:user/repo.git
        if "github.com" in url:
            url = url.replace("git@github.com:", "https://github.com/")
            url = url.removesuffix(".git")
            # Extract user/repo from https://github.com/user/repo
            parts = url.split("github.com/")[-1]
            return f"https://raw.githubusercontent.com/{parts}/main"
    except Exception:
        pass
    return "https://raw.githubusercontent.com/hyperfy-xyz/hyperfy-apps/main"


GITHUB_RAW_BASE = detect_github_raw_base()

# Import ALLOWED_TAGS from summarize script for consistent tag filtering
import sys
sys.path.insert(0, str(REPO_ROOT / "scripts" / "research"))
from summarize_hyp_files_openrouter import ALLOWED_TAGS


def normalize_tags(tags: list[str]) -> list[str]:
    """Deduplicate tags, filtering to allowed set."""
    return list(dict.fromkeys(t.strip() for t in tags if t.strip() in ALLOWED_TAGS))[:6]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def media_type_from_path(path: str | None) -> str:
    if not path:
        return "none"
    p = path.lower()
    if p.endswith((".mp4", ".mov", ".webm")):
        return "video"
    return "image"


def extract_props(blueprint: dict[str, Any]) -> dict[str, Any]:
    """Extract user-meaningful props from v2 blueprint JSON."""
    raw_props = blueprint.get("props", {})
    if not raw_props or not isinstance(raw_props, dict):
        return {}

    clean: dict[str, Any] = {}
    for key, val in raw_props.items():
        # Skip internal timestamps and system fields
        if key in ("createdAt",):
            continue
        # For file references, just keep the type and url
        if isinstance(val, dict) and "type" in val:
            clean[key] = val
        else:
            clean[key] = val
    return clean


def find_v2_app_dir(v2_app_dir_rel: str | None) -> Path | None:
    """Resolve v2 app directory from manifest path like 'v2/<slug>'."""
    if not v2_app_dir_rel:
        return None

    direct = REPO_ROOT / v2_app_dir_rel
    if direct.exists():
        return direct

    return None


def get_asset_files(blueprint: dict[str, Any]) -> list[str]:
    """Extract referenced asset filenames from a v2 blueprint."""
    assets: set[str] = set()

    # Model reference
    model = blueprint.get("model", "")
    if model and isinstance(model, str) and model.startswith("assets/"):
        assets.add(model.replace("assets/", "", 1))

    # Image reference
    image = blueprint.get("image")
    if isinstance(image, dict):
        url = image.get("url", "")
        if url and isinstance(url, str) and url.startswith("assets/"):
            assets.add(url.replace("assets/", "", 1))
    elif isinstance(image, str) and image.startswith("assets/"):
        assets.add(image.replace("assets/", "", 1))

    # Props with asset references
    props = blueprint.get("props", {})
    if isinstance(props, dict):
        for val in props.values():
            if isinstance(val, dict):
                url = val.get("url", "")
                if url and isinstance(url, str) and url.startswith("assets/"):
                    assets.add(url.replace("assets/", "", 1))

    return sorted(assets)


def build_app_entry(
    app_row: dict[str, Any],
    manifest: dict[str, Any],
    ai_summary: dict[str, Any] | None,
    v2_dir: Path | None,
    blueprint: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build a single app entry for catalog.json."""
    source = manifest.get("source", {})
    preview_path = manifest.get("preview", {}).get("primary_media_path") or app_row.get("primary_preview")

    # Fallback: check for generated preview image in media/<slug>/preview.*
    if not preview_path:
        matches = list((MEDIA_DIR / app_row['app_slug']).glob("preview.*"))
        if matches:
            preview_path = str(matches[0].relative_to(REPO_ROOT))

    # Prefer AI description, fall back to one_liner+primary_use_case (old schema), then manifest
    description = ""
    if ai_summary:
        description = ai_summary.get("description", "")
        if not description:
            # Old schema fallback: merge one_liner + primary_use_case
            one_liner = ai_summary.get("one_liner", "")
            primary = ai_summary.get("primary_use_case", "")
            if one_liner and primary and one_liner != primary:
                description = f"{one_liner} {primary}"
            else:
                description = one_liner or primary
    if not description:
        description = manifest.get("description", {}).get("short", "")

    tags = normalize_tags((ai_summary or {}).get("feature_tags", []))
    interaction_modes = (ai_summary or {}).get("interaction_modes", [])
    asset_profile = (ai_summary or {}).get("asset_profile", "medium")
    script_complexity = (ai_summary or {}).get("script_complexity", "medium")
    networking = (ai_summary or {}).get("networking_profile", "none")

    # Make preview_path relative to catalog/ for Pages deployment
    catalog_preview = None
    if preview_path:
        if preview_path.startswith("catalog/"):
            catalog_preview = preview_path[len("catalog/"):]
        else:
            catalog_preview = preview_path

    # Download: only emit URL if the .hyp file exists in hyp-files/
    hyp_filename = source.get("hyp_filename")
    has_hyp_file = bool(hyp_filename and (HYP_FILES_DIR / hyp_filename).exists())
    download_url = f"{GITHUB_RAW_BASE}/hyp-files/{hyp_filename}" if has_hyp_file else None

    # Extract source excerpts from v2
    props: dict[str, Any] = {}
    script_excerpt = ""
    asset_files: list[str] = []

    if blueprint:
        props = extract_props(blueprint)
        asset_files = get_asset_files(blueprint)

    if v2_dir and v2_dir.exists():
        index_js = v2_dir / "index.js"
        if index_js.exists():
            try:
                script_excerpt = index_js.read_text(encoding="utf-8", errors="ignore")[:2000]
            except Exception:
                pass

    entry: dict[str, Any] = {
        "slug": app_row.get("app_slug", ""),
        "name": app_row.get("app_name", ""),
        "author": manifest.get("author", {}).get("display_name") or app_row.get("author", "Unknown"),
        "description": description,
        "preview_url": catalog_preview,
        "preview_type": media_type_from_path(preview_path),
        "hyp_filename": hyp_filename,
        "download_path": download_url,
        "has_download": has_hyp_file,
        "created_at": source.get("discord_timestamp"),
        "tags": tags,
        "interaction_modes": interaction_modes,
        "asset_profile": asset_profile,
        "script_complexity": script_complexity,
        "networking": networking,
        "has_preview": bool(preview_path),
        "has_source": v2_dir is not None and v2_dir.exists(),
    }

    if props:
        entry["props"] = props
    if script_excerpt:
        entry["script_excerpt"] = script_excerpt
    if asset_files:
        entry["asset_files"] = asset_files

    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description="Build merged catalog JSON for explorer")
    parser.add_argument(
        "--allow-missing-hyp",
        action="store_true",
        help="Allow apps that reference missing hyp-files/*.hyp entries (default: fail with error)",
    )
    args = parser.parse_args()

    manifest_paths = sorted(CONTEXT_APPS_DIR.glob("*/manifest.json"))
    if not manifest_paths:
        print(f"Error: no manifests found in {CONTEXT_APPS_DIR}")
        print("Run build_catalog.py first to generate them (requires source-research dir)")
        return 1

    print(f"Processing {len(manifest_paths)} apps...")

    apps: list[dict[str, Any]] = []
    tag_counts: dict[str, int] = {}
    with_preview = 0
    ai_merged = 0
    missing_hyp: list[tuple[str, str]] = []

    for manifest_path in manifest_paths:
        manifest = read_json(manifest_path)
        if not manifest:
            print(f"  Warning: could not read {manifest_path}")
            continue

        slug = manifest.get("app_slug") or manifest_path.parent.name
        app_id = manifest.get("app_id", slug)

        # Build app_row equivalent from manifest
        app_row = {
            "app_id": app_id,
            "app_slug": slug,
            "app_name": manifest.get("app_name", slug),
            "author": manifest.get("author", {}).get("display_name", ""),
            "primary_preview": manifest.get("preview", {}).get("primary_media_path"),
        }

        # Get AI summary: prefer manifest["ai"], fall back to tmp/ai-summaries/<slug>.json
        ai_summary = manifest.get("ai")
        if not ai_summary:
            ai_summary_path = AI_SUMMARIES_DIR / f"{slug}.json"
            ai_summary = read_json(ai_summary_path)
            if ai_summary:
                # Merge into manifest on disk (tmp file left in place — gitignored)
                manifest["ai"] = ai_summary
                manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
                ai_merged += 1

        # Find v2 app directory
        v2_dir_rel = manifest.get("links", {}).get("v2_app_dir")
        v2_dir = find_v2_app_dir(v2_dir_rel)

        # Read blueprint JSON
        blueprint = None
        if v2_dir and v2_dir.exists():
            json_files = sorted(v2_dir.glob("*.json"))
            if json_files:
                blueprint = read_json(json_files[0])

        # Build app entry
        entry = build_app_entry(app_row, manifest, ai_summary, v2_dir, blueprint)
        apps.append(entry)

        if entry.get("hyp_filename") and not entry.get("has_download"):
            missing_hyp.append((entry["slug"], entry["hyp_filename"]))

        if entry["has_preview"]:
            with_preview += 1

        # Accumulate tag counts
        for tag in entry["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    # Sort apps by name
    apps.sort(key=lambda x: x["name"].lower())

    # Sort tag index by frequency (most used first)
    sorted_tag_index = dict(
        sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    )

    # Build final catalog.json
    catalog_data = {
        "version": 3,
        "generated_at": now_iso(),
        "counts": {
            "total": len(apps),
            "with_preview": with_preview,
        },
        "tag_index": sorted_tag_index,
        "apps": apps,
    }

    if missing_hyp:
        missing_hyp_report_path = TMP_MANIFESTS_DIR / "missing-hyp-files.json"
        missing_hyp_report = {
            "generated_at": now_iso(),
            "missing_hyp_count": len(missing_hyp),
            "missing_hyp": [
                {
                    "slug": slug,
                    "hyp_filename": hyp_filename,
                    "expected_path": f"hyp-files/{hyp_filename}",
                }
                for slug, hyp_filename in missing_hyp
            ],
        }
        TMP_MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
        missing_hyp_report_path.write_text(
            json.dumps(missing_hyp_report, indent=2),
            encoding="utf-8",
        )

        print(f"  Missing .hyp files: {len(missing_hyp)}")
        print(f"  Missing .hyp report: {missing_hyp_report_path.relative_to(REPO_ROOT)}")
        for slug, hyp_filename in missing_hyp:
            print(f"    - {slug}: hyp-files/{hyp_filename} (missing)")
        if not args.allow_missing_hyp:
            print("Error: missing .hyp files detected. catalog/catalog.json was not updated.")
            return 2

    CATALOG_ROOT.mkdir(parents=True, exist_ok=True)
    catalog_path = CATALOG_ROOT / "catalog.json"
    catalog_path.write_text(json.dumps(catalog_data, indent=2), encoding="utf-8")

    # Stats
    catalog_size = catalog_path.stat().st_size
    tag_count = len(sorted_tag_index)
    print(f"Done!")
    print(f"  catalog.json: {catalog_size / 1024:.1f} KB ({len(apps)} apps, {tag_count} tags)")
    print(f"  Apps with preview: {with_preview}")
    if ai_merged:
        print(f"  AI summaries merged into manifests: {ai_merged}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

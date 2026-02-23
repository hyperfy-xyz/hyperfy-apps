#!/usr/bin/env python3
"""Build merged catalog from manifests and AI summaries.

Outputs:
  catalog/catalog.json           - card data + agent metadata (version 4)
  catalog/apps/{slug}.json       - per-app detail (lazy-loaded by SourceModal)

Inputs:
  tmp/manifests/apps-manifest.json  (canonical manifest list)
  scripts/context/apps/*/manifest.json      (optional fallback with --allow-context-fallback)
  (manifest["ai"] or tmp/ai-summaries/<slug>.json)
  v2/apps/*/  (blueprint JSON, index.js, asset files)
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
CONTEXT_APPS_DIR = REPO_ROOT / "scripts" / "context" / "apps"
AI_SUMMARIES_DIR = REPO_ROOT / "tmp" / "ai-summaries"
MEDIA_DIR = CATALOG_ROOT / "media"
V2_APPS_DIR = REPO_ROOT / "v2" / "apps"
HYP_FILES_DIR = REPO_ROOT / "v2" / "hyp-files"
TMP_MANIFESTS_DIR = REPO_ROOT / "tmp" / "manifests"
APPS_MANIFEST_PATH = TMP_MANIFESTS_DIR / "apps-manifest.json"

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


def read_json_any(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def read_json(path: Path) -> dict[str, Any] | None:
    data = read_json_any(path)
    if isinstance(data, dict):
        return data
    return None


def resolve_repo_path(path_str: str) -> Path:
    path = (REPO_ROOT / path_str).resolve()
    try:
        path.relative_to(REPO_ROOT)
    except ValueError:
        raise ValueError(f"path escapes repo root: {path_str}")
    return path


def collect_manifest_paths(*, allow_context_fallback: bool) -> tuple[list[Path], str, list[str]]:
    warnings: list[str] = []

    apps_manifest = read_json(APPS_MANIFEST_PATH)
    if apps_manifest and isinstance(apps_manifest.get("apps"), list):
        paths: list[Path] = []
        missing_paths: list[str] = []

        for row in apps_manifest["apps"]:
            if not isinstance(row, dict):
                continue

            manifest_rel = (row.get("manifest_path") or "").strip()
            if not manifest_rel:
                slug = (row.get("app_slug") or "").strip()
                if slug:
                    manifest_rel = f"scripts/context/apps/{slug}/manifest.json"
            if not manifest_rel:
                continue

            try:
                manifest_path = resolve_repo_path(manifest_rel)
            except ValueError:
                missing_paths.append(f"{manifest_rel} (invalid path)")
                continue

            if manifest_path.exists():
                paths.append(manifest_path)
            else:
                missing_paths.append(manifest_rel)

        # preserve order while deduplicating
        deduped_paths = list(dict.fromkeys(paths))
        if deduped_paths:
            if missing_paths:
                warnings.append(
                    f"apps-manifest references {len(missing_paths)} missing manifests; "
                    "those rows will be skipped"
                )
            return deduped_paths, "apps-manifest", warnings

        warnings.append("apps-manifest had no usable manifest paths")
    elif not APPS_MANIFEST_PATH.exists():
        warnings.append("apps-manifest file not found")
    else:
        warnings.append("apps-manifest could not be read")

    if not allow_context_fallback:
        warnings.append("scripts/context/apps fallback disabled")
        return [], "apps-manifest", warnings

    fallback_paths = sorted(CONTEXT_APPS_DIR.glob("*/manifest.json"))
    if fallback_paths:
        warnings.append("using scripts/context/apps fallback manifests")
    else:
        warnings.append("scripts/context/apps fallback produced no manifests")
    return fallback_paths, "context-apps-glob", warnings


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


def find_v2_app_dir(v2_app_dir_rel: str | None, slug: str) -> Path | None:
    """Resolve v2 app directory from explicit link, then fallback to v2/<slug>."""
    candidates: list[Path] = []

    if v2_app_dir_rel:
        candidates.append(REPO_ROOT / v2_app_dir_rel)

    # Fallback for manifests that don't have links.v2_app_dir yet.
    candidates.append(V2_APPS_DIR / slug)

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def load_primary_blueprint(v2_dir: Path) -> tuple[dict[str, Any] | None, str | None]:
    """Prefer blueprint.json, otherwise first object-shaped JSON that looks like blueprint data."""
    if not v2_dir.exists():
        return None, None

    candidates: list[Path] = []
    preferred = v2_dir / "blueprint.json"
    if preferred.exists():
        candidates.append(preferred)

    for p in sorted(v2_dir.glob("*.json")):
        if p not in candidates:
            candidates.append(p)

    for p in candidates:
        payload = read_json_any(p)
        if not isinstance(payload, dict):
            continue
        if p.name == "blueprint.json" or any(k in payload for k in ("props", "model", "script", "id", "version", "name")):
            return payload, p.relative_to(v2_dir).as_posix()

    return None, None


def normalize_asset_ref(ref: Any) -> str | None:
    if not isinstance(ref, str) or not ref:
        return None
    if ref.startswith("asset://"):
        return ref.replace("asset://", "", 1)
    if ref.startswith("assets/"):
        return ref.replace("assets/", "", 1)
    return None


def get_asset_files(blueprint: dict[str, Any]) -> list[str]:
    """Extract referenced asset filenames from a v2 blueprint."""
    assets: set[str] = set()

    # Model reference
    model_ref = normalize_asset_ref(blueprint.get("model"))
    if model_ref:
        assets.add(model_ref)

    # Image reference
    image = blueprint.get("image")
    if isinstance(image, dict):
        image_ref = normalize_asset_ref(image.get("url"))
        if image_ref:
            assets.add(image_ref)
    else:
        image_ref = normalize_asset_ref(image)
        if image_ref:
            assets.add(image_ref)

    # Script reference
    script_ref = normalize_asset_ref(blueprint.get("script"))
    if script_ref:
        assets.add(script_ref)

    # Props with asset references
    props = blueprint.get("props", {})
    if isinstance(props, dict):
        for val in props.values():
            if isinstance(val, dict):
                prop_ref = normalize_asset_ref(val.get("url"))
                if prop_ref:
                    assets.add(prop_ref)

    return sorted(assets)


def resolve_blueprint_script_path(v2_dir: Path, blueprint: dict[str, Any] | None) -> Path | None:
    if not blueprint:
        return None

    script_ref = blueprint.get("script")
    if not isinstance(script_ref, str) or not script_ref:
        return None

    if script_ref.startswith("asset://"):
        candidate = v2_dir / "assets" / script_ref.replace("asset://", "", 1)
    elif script_ref.startswith("assets/"):
        candidate = v2_dir / script_ref
    else:
        candidate = v2_dir / script_ref

    if candidate.exists() and candidate.is_file():
        return candidate
    return None


def extract_script_excerpt(v2_dir: Path, blueprint: dict[str, Any] | None, max_chars: int = 2000) -> tuple[str, str | None]:
    candidates: list[Path] = []
    candidates.append(v2_dir / "index.js")

    blueprint_script = resolve_blueprint_script_path(v2_dir, blueprint)
    if blueprint_script:
        candidates.append(blueprint_script)

    # Fallbacks for non-standard layouts.
    candidates.extend(sorted(v2_dir.glob("*.js")))
    assets_dir = v2_dir / "assets"
    if assets_dir.exists():
        candidates.extend(sorted(assets_dir.glob("*.js")))

    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate.resolve())
        if key in seen:
            continue
        seen.add(key)
        if not candidate.exists() or not candidate.is_file():
            continue
        try:
            excerpt = candidate.read_text(encoding="utf-8", errors="ignore")[:max_chars]
        except Exception:
            continue
        if excerpt:
            return excerpt, candidate.relative_to(v2_dir).as_posix()

    return "", None


def collect_source_inventory(v2_dir: Path, max_files: int = 250) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    files: list[dict[str, Any]] = []
    total_size_bytes = 0
    total_files = 0
    js_files = 0
    json_files = 0
    asset_files = 0

    for p in sorted(x for x in v2_dir.rglob("*") if x.is_file()):
        rel_path = p.relative_to(v2_dir).as_posix()
        try:
            size = int(p.stat().st_size)
        except OSError:
            size = 0

        total_files += 1
        total_size_bytes += size
        if rel_path.endswith(".js"):
            js_files += 1
        if rel_path.endswith(".json"):
            json_files += 1
        if rel_path.startswith("assets/"):
            asset_files += 1

        if len(files) < max_files:
            files.append({"path": rel_path, "size_bytes": size})

    summary = {
        "file_count": total_files,
        "listed_file_count": len(files),
        "listed_truncated": total_files > len(files),
        "total_size_bytes": total_size_bytes,
        "js_files": js_files,
        "json_files": json_files,
        "asset_files": asset_files,
    }
    return files, summary


def build_app_entry(
    app_row: dict[str, Any],
    manifest: dict[str, Any],
    ai_summary: dict[str, Any] | None,
    v2_dir: Path | None,
    blueprint: dict[str, Any] | None,
    blueprint_path: str | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Build a single app entry split into card data and detail data.

    Returns (card, detail) where card goes into catalog.json and
    detail is written to catalog/apps/{slug}.json.
    """
    source = manifest.get("source", {})
    # Prefer generated preview (preview.*), fall back to manifest/Discord preview
    gen_matches = list((MEDIA_DIR / app_row['app_slug']).glob("preview.*"))
    if gen_matches:
        preview_path = str(gen_matches[0].relative_to(REPO_ROOT))
    else:
        preview_path = manifest.get("preview", {}).get("primary_media_path") or app_row.get("primary_preview")

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
    download_url = f"{GITHUB_RAW_BASE}/v2/hyp-files/{hyp_filename}" if has_hyp_file else None

    # Extract source excerpts from v2
    props: dict[str, Any] = {}
    script_excerpt = ""
    script_path = None
    asset_files: list[str] = []
    source_files: list[dict[str, Any]] = []
    source_inventory: dict[str, Any] | None = None

    if blueprint:
        props = extract_props(blueprint)
        asset_files = get_asset_files(blueprint)

    if v2_dir and v2_dir.exists():
        script_excerpt, script_path = extract_script_excerpt(v2_dir, blueprint)
        source_files, source_inventory = collect_source_inventory(v2_dir)

    has_source = v2_dir is not None and v2_dir.exists()
    has_details = bool(
        has_source
        or (description or "").strip()
        or tags
        or source.get("discord_message_id")
        or source.get("discord_attachment_id")
        or source.get("discord_timestamp")
        or hyp_filename
    )

    # Card data: stays in catalog.json (lightweight)
    card: dict[str, Any] = {
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
        "has_source": has_source,
        "has_details": has_details,
        "source_status": "v2" if has_source else "metadata_only",
    }

    if source_inventory:
        card["source_inventory"] = source_inventory

    # Detail data: written to catalog/apps/{slug}.json (lazy-loaded)
    detail: dict[str, Any] = {}

    if script_excerpt:
        detail["script_excerpt"] = script_excerpt
    if script_path:
        detail["script_path"] = script_path
    if source_files:
        detail["source_files"] = source_files
    if props:
        detail["props"] = props
    if asset_files:
        detail["asset_files"] = asset_files
    if blueprint_path:
        detail["blueprint_path"] = blueprint_path

    return card, detail


def main() -> int:
    parser = argparse.ArgumentParser(description="Build merged catalog JSON for explorer")
    parser.add_argument(
        "--allow-context-fallback",
        action="store_true",
        help="Allow fallback to scripts/context/apps/*/manifest.json when apps-manifest is missing/unusable",
    )
    parser.add_argument(
        "--allow-missing-hyp",
        action="store_true",
        help="Allow apps that reference missing v2/hyp-files/*.hyp entries (default: fail with error)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Alias for --allow-missing-hyp; continue building even when hyp files are missing",
    )
    args = parser.parse_args()

    manifest_paths, manifest_source, manifest_warnings = collect_manifest_paths(
        allow_context_fallback=args.allow_context_fallback
    )
    for warning in manifest_warnings:
        print(f"Warning: {warning}")

    if not manifest_paths:
        print(f"Error: no usable manifests found from {APPS_MANIFEST_PATH}")
        print("Run build_catalog.py first to generate apps-manifest.")
        print("If needed, rerun with --allow-context-fallback to use context/apps scan.")
        return 1

    print(f"Manifest source: {manifest_source}")
    print(f"Processing {len(manifest_paths)} apps...")

    import shutil

    apps: list[dict[str, Any]] = []
    detail_map: dict[str, dict[str, Any]] = {}
    tag_counts: dict[str, int] = {}
    with_preview = 0
    ai_merged = 0
    missing_hyp: list[tuple[str, str]] = []
    with_source = 0
    missing_v2_sources: list[dict[str, Any]] = []

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
        v2_dir = find_v2_app_dir(v2_dir_rel, slug)
        expected_v2 = v2_dir_rel or f"v2/apps/{slug}"

        # Read blueprint JSON
        blueprint = None
        blueprint_path = None
        if v2_dir and v2_dir.exists():
            blueprint, blueprint_path = load_primary_blueprint(v2_dir)

        # Build app entry (card + detail)
        card, detail = build_app_entry(app_row, manifest, ai_summary, v2_dir, blueprint, blueprint_path)
        apps.append(card)
        if detail:
            detail_map[card["slug"]] = detail

        if card.get("hyp_filename") and not card.get("has_download"):
            missing_hyp.append((card["slug"], card["hyp_filename"]))

        if card["has_preview"]:
            with_preview += 1
        if card["has_source"]:
            with_source += 1
        else:
            reason = "v2_link_missing" if not v2_dir_rel else "v2_dir_missing"
            missing_v2_sources.append(
                {
                    "slug": slug,
                    "app_name": app_row.get("app_name"),
                    "hyp_filename": card.get("hyp_filename"),
                    "discord_timestamp": card.get("created_at"),
                    "v2_app_dir": v2_dir_rel,
                    "expected_v2_path": expected_v2,
                    "reason": reason,
                }
            )

        # Accumulate tag counts
        for tag in card["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    # Sort apps by name
    apps.sort(key=lambda x: x["name"].lower())

    # Sort tag index by frequency (most used first)
    sorted_tag_index = dict(
        sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    )

    # GitHub Pages base URLs
    github_pages_base = "https://hyperfy-xyz.github.io/hyperfy-apps"
    source_url = "https://github.com/hyperfy-xyz/hyperfy-apps"

    # Build final catalog.json (version 4: card data + agent metadata)
    catalog_data = {
        "version": 4,
        "generated_at": now_iso(),
        "name": "Hyperfy Apps Archive",
        "description": f"{len(apps)} community-built virtual world apps for the Hyperfy platform",
        "base_url": github_pages_base,
        "source_url": source_url,
        "endpoints": {
            "app_detail": "./apps/{slug}.json",
            "app_source": f"{GITHUB_RAW_BASE}/v2/apps/{{slug}}/index.js",
            "app_blueprint": f"{GITHUB_RAW_BASE}/v2/apps/{{slug}}/{{blueprint_path}}",
        },
        "counts": {
            "total": len(apps),
            "with_preview": with_preview,
            "with_source": with_source,
            "with_details": len(detail_map),
            "metadata_only": len(apps) - with_source,
        },
        "tag_index": sorted_tag_index,
        "apps": apps,
    }

    missing_v2_report_path = TMP_MANIFESTS_DIR / "missing-v2-source.json"
    missing_v2_report = {
        "generated_at": now_iso(),
        "manifest_source": manifest_source,
        "total_apps": len(apps),
        "with_source": with_source,
        "missing_v2_source_count": len(missing_v2_sources),
        "missing_v2_sources": missing_v2_sources,
    }
    TMP_MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    missing_v2_report_path.write_text(
        json.dumps(missing_v2_report, indent=2),
        encoding="utf-8",
    )

    if missing_hyp:
        missing_hyp_report_path = TMP_MANIFESTS_DIR / "missing-hyp-files.json"
        missing_hyp_report = {
            "generated_at": now_iso(),
            "missing_hyp_count": len(missing_hyp),
            "missing_hyp": [
                {
                    "slug": slug,
                    "hyp_filename": hyp_filename,
                    "expected_path": f"v2/hyp-files/{hyp_filename}",
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
            print(f"    - {slug}: v2/hyp-files/{hyp_filename} (missing)")
        if not (args.allow_missing_hyp or args.force):
            print("Error: missing .hyp files detected. catalog/catalog.json was not updated.")
            return 2
        print("Error: missing .hyp files detected, but continuing build due to --force/--allow-missing-hyp.")

    CATALOG_ROOT.mkdir(parents=True, exist_ok=True)
    catalog_path = CATALOG_ROOT / "catalog.json"
    catalog_path.write_text(json.dumps(catalog_data, indent=2), encoding="utf-8")

    # Write per-app detail files to catalog/apps/{slug}.json
    apps_detail_dir = CATALOG_ROOT / "apps"
    # Clean stale detail files before regenerating
    if apps_detail_dir.exists():
        shutil.rmtree(apps_detail_dir)
    apps_detail_dir.mkdir(parents=True, exist_ok=True)

    detail_total_bytes = 0
    for slug, detail in detail_map.items():
        detail_path = apps_detail_dir / f"{slug}.json"
        detail_bytes = json.dumps(detail, separators=(",", ":")).encode("utf-8")
        detail_path.write_bytes(detail_bytes)
        detail_total_bytes += len(detail_bytes)

    # Remove stale api.json if present
    stale_api = CATALOG_ROOT / "api.json"
    if stale_api.exists():
        stale_api.unlink()

    # Stats
    catalog_size = catalog_path.stat().st_size
    tag_count = len(sorted_tag_index)
    print(f"Done!")
    print(f"  catalog.json: {catalog_size / 1024:.1f} KB ({len(apps)} apps, {tag_count} tags)")
    print(f"  apps/ detail files: {len(detail_map)} files, {detail_total_bytes / 1024:.1f} KB total")
    print(f"  Apps with preview: {with_preview}")
    print(f"  Apps with source (v2): {with_source}")
    print(f"  Apps metadata-only: {len(apps) - with_source}")
    print(f"  Missing v2 source report: {missing_v2_report_path.relative_to(REPO_ROOT)}")
    if ai_merged:
        print(f"  AI summaries merged into manifests: {ai_merged}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

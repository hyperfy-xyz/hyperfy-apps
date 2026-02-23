#!/usr/bin/env python3
"""
Run the full external-app import pipeline using versioned filenames/slugs.

Pipeline steps:
1. Read latest audit plan (or explicit --audit-dir) from tmp/audits/external-hyps-*
2. Import selected rows into:
   - v2/hyp-files/<versioned_filename>.hyp
   - v2/apps/<versioned_slug>/
   - scripts/context/apps/<versioned_slug>/manifest.json
3. Upsert rows in tmp/manifests/apps-manifest.json
4. Build catalog/catalog.json via scripts/catalog/build_explorer_data.py
5. Generate previews via scripts/catalog/generate_missing_previews.py
6. Build catalog/catalog.json again to refresh preview metadata
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_AUDITS_ROOT = REPO_ROOT / "tmp" / "audits"
DEFAULT_APPS_MANIFEST = REPO_ROOT / "tmp" / "manifests" / "apps-manifest.json"
DEFAULT_V2_HYP_ROOT = REPO_ROOT / "v2" / "hyp-files"
DEFAULT_V2_APPS_ROOT = REPO_ROOT / "v2" / "apps"
DEFAULT_CONTEXT_APPS_ROOT = REPO_ROOT / "scripts" / "context" / "apps"
BUILD_EXPLORER_SCRIPT = REPO_ROOT / "scripts" / "catalog" / "build_explorer_data.py"
GENERATE_PREVIEWS_SCRIPT = REPO_ROOT / "scripts" / "catalog" / "generate_missing_previews.py"


@dataclass(frozen=True)
class ImportRow:
    source_filename: str
    source_repo: str
    source_path: str
    match_status: str
    blueprint_name: str | None
    blueprint_version: int | None
    versioned_filename: str
    versioned_slug: str
    preview_include: bool
    preview_reason: str


@dataclass(frozen=True)
class ImportedApp:
    slug: str
    hyp_filename: str
    source_filename: str
    source_repo: str
    source_path: str


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def latest_audit_dir(audits_root: Path) -> Path:
    candidates = sorted(audits_root.glob("external-hyps-*"))
    if not candidates:
        raise FileNotFoundError(f"No audit dirs found under {audits_root}")
    return candidates[-1]


def parse_import_rows(plan_payload: dict[str, Any], include_all_rows: bool) -> list[ImportRow]:
    rows: list[ImportRow] = []
    for raw in plan_payload.get("rows", []):
        if not isinstance(raw, dict):
            continue
        row = ImportRow(
            source_filename=str(raw.get("source_filename") or ""),
            source_repo=str(raw.get("source_repo") or ""),
            source_path=str(raw.get("source_path") or ""),
            match_status=str(raw.get("match_status") or ""),
            blueprint_name=raw.get("blueprint_name") if isinstance(raw.get("blueprint_name"), str) else None,
            blueprint_version=raw.get("blueprint_version") if isinstance(raw.get("blueprint_version"), int) else None,
            versioned_filename=str(raw.get("versioned_filename") or ""),
            versioned_slug=str(raw.get("versioned_slug") or ""),
            preview_include=bool(raw.get("preview_include")),
            preview_reason=str(raw.get("preview_reason") or ""),
        )
        if not row.source_path or not row.versioned_filename or not row.versioned_slug:
            continue
        if include_all_rows or row.preview_include:
            rows.append(row)
    return rows


def unbundle_lookup(unbundle_payload: dict[str, Any]) -> dict[str, Path]:
    out: dict[str, Path] = {}
    for row in unbundle_payload.get("rows", []):
        if not isinstance(row, dict):
            continue
        if row.get("unbundle_status") != "ok":
            continue
        source_path = str(row.get("source_path") or "")
        output_dir = str(row.get("output_dir") or "")
        if source_path and output_dir:
            out[source_path] = Path(output_dir)
    return out


def load_blueprint(unbundled_dir: Path) -> dict[str, Any]:
    blueprint_path = unbundled_dir / "blueprint.json"
    if not blueprint_path.exists():
        return {}
    payload = load_json(blueprint_path)
    return payload if isinstance(payload, dict) else {}


def copy_tree_replace(src: Path, dst: Path, dry_run: bool) -> None:
    if dry_run:
        return
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def build_context_manifest(row: ImportRow, blueprint: dict[str, Any], generated_at: str) -> dict[str, Any]:
    app_name = (blueprint.get("name") or row.versioned_slug) if isinstance(blueprint, dict) else row.versioned_slug
    app_author = (blueprint.get("author") or "") if isinstance(blueprint, dict) else ""
    app_desc = (blueprint.get("desc") or "") if isinstance(blueprint, dict) else ""

    return {
        "app_id": row.versioned_slug,
        "app_slug": row.versioned_slug,
        "app_name": app_name,
        "source": {
            "hyp_filename": row.versioned_filename,
            "external_repo": row.source_repo,
            "external_path": row.source_path,
            "match_status": row.match_status,
            "import_strategy": "external-versioned",
        },
        "author": {
            "display_name": app_author,
            "confidence": "low",
            "evidence": "blueprint",
        },
        "description": {
            "short": str(app_desc).strip(),
            "raw_message_content": "",
            "summary_excerpt": "",
            "source_priority_used": "blueprint",
        },
        "links": {
            "v2_app_dir": f"v2/apps/{row.versioned_slug}",
            "v2_json_path": f"v2/apps/{row.versioned_slug}/blueprint.json",
        },
        "preview": {
            "primary_media_path": None,
            "media_type": None,
            "selection_reason": "none",
            "is_fallback_any_author": False,
        },
        "media": [],
        "status": {
            "has_preview": False,
            "has_hyp_file": True,
            "needs_media_review": True,
            "needs_author_review": False,
            "flags": ["external_import", row.preview_reason],
            "notes": "Imported from external repositories using versioned naming policy.",
        },
        "generated_at": generated_at,
        "max_commit_size_bytes": 52428800,
    }


def build_apps_manifest_row(row: ImportRow) -> dict[str, Any]:
    return {
        "app_id": row.versioned_slug,
        "app_slug": row.versioned_slug,
        "app_name": row.versioned_slug,
        "author": "",
        "has_preview": False,
        "primary_preview": None,
        "manifest_path": f"scripts/context/apps/{row.versioned_slug}/manifest.json",
        "v2_app_dir": f"v2/apps/{row.versioned_slug}",
        "has_hyp_file": True,
        "has_ai_summary": False,
        "ai_summary_path": None,
        "flags": ["external_import", row.preview_reason],
    }


def update_apps_manifest(apps_manifest_path: Path, imported_rows: list[ImportRow], generated_at: str, dry_run: bool) -> tuple[int, int]:
    if apps_manifest_path.exists():
        payload = load_json(apps_manifest_path)
        if not isinstance(payload, dict):
            payload = {}
    else:
        payload = {}

    apps_list = payload.get("apps")
    if not isinstance(apps_list, list):
        apps_list = []

    by_slug: dict[str, dict[str, Any]] = {}
    for raw in apps_list:
        if not isinstance(raw, dict):
            continue
        slug = str(raw.get("app_slug") or "").strip()
        if not slug:
            continue
        by_slug[slug] = raw

    before = len(by_slug)
    for row in imported_rows:
        by_slug[row.versioned_slug] = build_apps_manifest_row(row)
    after = len(by_slug)

    merged = sorted(by_slug.values(), key=lambda x: str(x.get("app_slug") or "").lower())

    counts = payload.get("counts")
    if not isinstance(counts, dict):
        counts = {}
    counts["apps"] = len(merged)
    counts["with_preview"] = sum(1 for r in merged if bool(r.get("has_preview")))
    counts["missing_preview"] = counts["apps"] - counts["with_preview"]
    counts["with_hyp_file"] = sum(1 for r in merged if bool(r.get("has_hyp_file")))
    counts["missing_hyp_file"] = counts["apps"] - counts["with_hyp_file"]

    payload["version"] = payload.get("version") or 1
    payload["generated_at"] = generated_at
    payload["counts"] = counts
    payload["apps"] = merged

    if not dry_run:
        write_json(apps_manifest_path, payload)
    return before, after


def run_command(cmd: list[str], dry_run: bool) -> None:
    pretty = shlex.join(cmd)
    print(f"$ {pretty}")
    if dry_run:
        return
    result = subprocess.run(cmd, cwd=REPO_ROOT)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {pretty}")


def write_preview_slug_file(path: Path, imported_rows: list[ImportRow], dry_run: bool) -> int:
    slugs: list[str] = []
    seen: set[str] = set()
    for row in imported_rows:
        if row.versioned_slug in seen:
            continue
        slugs.append(row.versioned_slug)
        seen.add(row.versioned_slug)

    lines = ["# Generated by run_external_versioned_pipeline.py", *slugs]
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(slugs)


def ensure_unique(rows: list[ImportRow]) -> None:
    slug_seen: set[str] = set()
    hyp_seen: set[str] = set()
    dup_slugs: list[str] = []
    dup_hyp: list[str] = []
    for row in rows:
        if row.versioned_slug in slug_seen:
            dup_slugs.append(row.versioned_slug)
        slug_seen.add(row.versioned_slug)
        hyp_key = row.versioned_filename.lower()
        if hyp_key in hyp_seen:
            dup_hyp.append(row.versioned_filename)
        hyp_seen.add(hyp_key)
    if dup_slugs or dup_hyp:
        raise ValueError(
            "Duplicate versioned outputs in selected rows: "
            f"duplicate_slugs={sorted(set(dup_slugs))}, duplicate_hyp={sorted(set(dup_hyp))}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import external versioned apps and generate previews")
    parser.add_argument("--audit-dir", type=Path, default=None, help="Audit dir (default: latest tmp/audits/external-hyps-*)")
    parser.add_argument("--audits-root", type=Path, default=DEFAULT_AUDITS_ROOT, help=f"Audit root (default: {DEFAULT_AUDITS_ROOT})")
    parser.add_argument("--plan-json", type=Path, default=None, help="Path to versioned-name-plan.json")
    parser.add_argument("--unbundle-report", type=Path, default=None, help="Path to unbundled/unbundle-report.json")
    parser.add_argument("--apps-manifest", type=Path, default=DEFAULT_APPS_MANIFEST, help=f"apps-manifest path (default: {DEFAULT_APPS_MANIFEST})")
    parser.add_argument("--v2-hyp-root", type=Path, default=DEFAULT_V2_HYP_ROOT, help=f"v2 hyp root (default: {DEFAULT_V2_HYP_ROOT})")
    parser.add_argument("--v2-apps-root", type=Path, default=DEFAULT_V2_APPS_ROOT, help=f"v2 apps root (default: {DEFAULT_V2_APPS_ROOT})")
    parser.add_argument("--context-apps-root", type=Path, default=DEFAULT_CONTEXT_APPS_ROOT, help=f"context apps root (default: {DEFAULT_CONTEXT_APPS_ROOT})")
    parser.add_argument("--preview-slugs-file", type=Path, default=None, help="Output file for preview slugs (default: <audit_dir>/versioned-preview-slugs.generated.txt)")
    parser.add_argument("--include-all-rows", action="store_true", help="Import all rows in plan (default imports only preview_include=true rows)")
    parser.add_argument("--skip-build", action="store_true", help="Skip build_explorer_data.py runs")
    parser.add_argument("--skip-previews", action="store_true", help="Skip generate_missing_previews.py")
    parser.add_argument("--preview-dry-run", action="store_true", help="Run preview generation with --dry-run")
    parser.add_argument("--preview-concurrency", type=int, default=4, help="Preview generation concurrency (default: 4)")
    parser.add_argument("--preview-skip-screenshot", action="store_true", help="Pass --skip-screenshot to preview generator")
    parser.add_argument("--no-preview-force", action="store_true", help="Do not pass --force to preview generator")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without mutating files or running subprocess steps")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    audit_dir = args.audit_dir.resolve() if args.audit_dir else latest_audit_dir(args.audits_root.resolve())
    plan_json = args.plan_json.resolve() if args.plan_json else (audit_dir / "versioned-name-plan.json")
    unbundle_report = args.unbundle_report.resolve() if args.unbundle_report else (audit_dir / "unbundled" / "unbundle-report.json")
    preview_slugs_file = args.preview_slugs_file.resolve() if args.preview_slugs_file else (audit_dir / "versioned-preview-slugs.generated.txt")

    if not plan_json.exists():
        raise FileNotFoundError(f"Missing plan JSON: {plan_json}")
    if not unbundle_report.exists():
        raise FileNotFoundError(f"Missing unbundle report: {unbundle_report}")

    plan_payload = load_json(plan_json)
    if not isinstance(plan_payload, dict):
        raise ValueError(f"Plan must be object: {plan_json}")
    unbundle_payload = load_json(unbundle_report)
    if not isinstance(unbundle_payload, dict):
        raise ValueError(f"Unbundle report must be object: {unbundle_report}")

    rows = parse_import_rows(plan_payload, include_all_rows=args.include_all_rows)
    if not rows:
        print("No rows selected. Nothing to do.")
        return 0
    ensure_unique(rows)

    lookup = unbundle_lookup(unbundle_payload)
    generated_at = now_iso()

    print("External versioned pipeline")
    print(f"  audit_dir: {audit_dir}")
    print(f"  selected_rows: {len(rows)}")
    print(f"  include_all_rows: {args.include_all_rows}")
    print(f"  dry_run: {args.dry_run}")

    imported: list[ImportedApp] = []

    for row in rows:
        src_hyp = Path(row.source_path)
        src_unbundled = lookup.get(row.source_path)
        if src_unbundled is None:
            raise FileNotFoundError(f"No unbundled directory found for {row.source_path}")
        if not src_hyp.exists():
            raise FileNotFoundError(f"Missing source .hyp: {src_hyp}")
        if not src_unbundled.exists():
            raise FileNotFoundError(f"Missing source unbundled dir: {src_unbundled}")

        dst_hyp = args.v2_hyp_root.resolve() / row.versioned_filename
        dst_app = args.v2_apps_root.resolve() / row.versioned_slug
        dst_manifest = args.context_apps_root.resolve() / row.versioned_slug / "manifest.json"

        print(f"  import: {row.source_filename} -> {row.versioned_filename} ({row.versioned_slug})")
        print(f"    copy hyp: {src_hyp} -> {dst_hyp}")
        print(f"    copy app: {src_unbundled} -> {dst_app}")
        print(f"    write manifest: {dst_manifest}")

        blueprint = load_blueprint(src_unbundled)

        if not args.dry_run:
            dst_hyp.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_hyp, dst_hyp)
            copy_tree_replace(src_unbundled, dst_app, dry_run=False)

            manifest_payload = build_context_manifest(row, blueprint, generated_at)
            dst_manifest.parent.mkdir(parents=True, exist_ok=True)
            write_json(dst_manifest, manifest_payload)

        imported.append(
            ImportedApp(
                slug=row.versioned_slug,
                hyp_filename=row.versioned_filename,
                source_filename=row.source_filename,
                source_repo=row.source_repo,
                source_path=row.source_path,
            )
        )

    before_count, after_count = update_apps_manifest(
        args.apps_manifest.resolve(),
        rows,
        generated_at=generated_at,
        dry_run=args.dry_run,
    )
    print(f"  apps-manifest: {before_count} -> {after_count} apps")

    preview_slug_count = write_preview_slug_file(preview_slugs_file, rows, dry_run=args.dry_run)
    print(f"  preview slugs file: {preview_slugs_file} ({preview_slug_count} slugs)")

    if not args.skip_build:
        run_command([sys.executable, str(BUILD_EXPLORER_SCRIPT)], dry_run=args.dry_run)
    else:
        print("  skipping build_explorer_data.py (per --skip-build)")

    if not args.skip_previews:
        preview_cmd = [
            sys.executable,
            str(GENERATE_PREVIEWS_SCRIPT),
            "--app-id-file",
            str(preview_slugs_file),
            "--concurrency",
            str(max(1, args.preview_concurrency)),
        ]
        if not args.no_preview_force:
            preview_cmd.append("--force")
        if args.preview_skip_screenshot:
            preview_cmd.append("--skip-screenshot")
        if args.preview_dry_run:
            preview_cmd.append("--dry-run")
        elif not args.dry_run and not os.environ.get("OPENROUTER_API_KEY", "").strip():
            raise RuntimeError("OPENROUTER_API_KEY is required for preview generation (or use --preview-dry-run)")

        run_command(preview_cmd, dry_run=args.dry_run)

        if not args.skip_build and not args.preview_dry_run:
            run_command([sys.executable, str(BUILD_EXPLORER_SCRIPT)], dry_run=args.dry_run)
    else:
        print("  skipping preview generation (per --skip-previews)")

    print("\nPipeline complete")
    print(f"  imported: {len(imported)}")
    print(f"  audit_dir: {audit_dir}")
    print(f"  preview_slugs_file: {preview_slugs_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

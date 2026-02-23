#!/usr/bin/env python3
"""
HYP Tool - Unbundle, rebundle, and promote Hyperfy .hyp app packages.

Usage:
    hyp_tool.py unbundle <file.hyp> [output_dir]
    hyp_tool.py unbundle-index [options]
    hyp_tool.py promote [options]
    hyp_tool.py bundle <dir> [output.hyp]
    hyp_tool.py info <file.hyp>

Commands:
    unbundle       Extract .hyp to directory with blueprint.json and assets/
    unbundle-index Batch-unbundle from scripts/context/hyp_index.raw.json into tmp/unbundled-hyp/
    promote        Promote unbundled apps from tmp/unbundled-hyp/ into v2/apps/ using apps-manifest
    bundle         Pack directory back into .hyp file
    info           Show .hyp file contents without extracting

Examples:
    # Extract sit.hyp to sit/ directory
    python hyp_tool.py unbundle sit.hyp

    # Extract to specific directory
    python hyp_tool.py unbundle sit.hyp ./my-app/

    # Promote unbundled apps into v2/apps/
    python hyp_tool.py promote --write-index

    # Repack after editing
    python hyp_tool.py bundle ./my-app/ my-app-fixed.hyp

    # View contents
    python hyp_tool.py info sit.hyp
"""

import argparse
import hashlib
from datetime import datetime, timezone
import json
import re
import shutil
import struct
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_INDEX = PROJECT_ROOT / "scripts" / "context" / "hyp_index.raw.json"
DEFAULT_HYP_ROOT = PROJECT_ROOT / "v2" / "hyp-files"
DEFAULT_OUT_ROOT = PROJECT_ROOT / "tmp" / "unbundled-hyp"
DEFAULT_APPS_MANIFEST = PROJECT_ROOT / "tmp" / "manifests" / "apps-manifest.json"
DEFAULT_CONTEXT_APPS = PROJECT_ROOT / "scripts" / "context" / "apps"
DEFAULT_V2_ROOT = PROJECT_ROOT / "v2" / "apps"
DEFAULT_PROMOTE_REPORT = PROJECT_ROOT / "tmp" / "manifests" / "v2-promotion-report.json"


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


def slugify_stem(name: str) -> str:
    stem = Path(name).stem
    safe = []
    for ch in stem:
        if ch.isalnum() or ch in {"-", "_", "."}:
            safe.append(ch)
        else:
            safe.append("-")
    text = "".join(safe).strip("-")
    return text or "app"


def rel_or_abs(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def sanitize_slug(value: str) -> str:
    value = (value or "app").strip().lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "app"


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def tree_fingerprint(root: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not root.exists():
        return out
    for p in sorted(x for x in root.rglob("*") if x.is_file()):
        rel = p.relative_to(root).as_posix()
        out[rel] = file_sha256(p)
    return out


def read_json(path: Path) -> dict[str, Any] | list[Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_canonical_apps(apps_manifest_path: Path) -> list[dict[str, Any]]:
    payload = read_json(apps_manifest_path)
    if not isinstance(payload, dict):
        raise ValueError(f"Invalid apps manifest object: {apps_manifest_path}")
    apps = payload.get("apps")
    if not isinstance(apps, list):
        raise ValueError(f"Missing apps array in: {apps_manifest_path}")
    return [a for a in apps if isinstance(a, dict)]


def load_manifest(path_str: str) -> dict[str, Any] | None:
    try:
        path = (PROJECT_ROOT / path_str).resolve()
        path.relative_to(PROJECT_ROOT)
    except Exception:
        return None
    if not path.exists():
        return None
    try:
        data = read_json(path)
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def update_index_promotions(
    index_path: Path, promoted_rows: list[dict[str, Any]], run_ts: str
) -> None:
    if not index_path.exists():
        return
    data = read_json(index_path)
    if not isinstance(data, list):
        return

    by_filename: dict[str, list[dict[str, Any]]] = {}
    for row in promoted_rows:
        filename = (row.get("hyp_filename") or "").strip()
        if not filename:
            continue
        by_filename.setdefault(filename, []).append(row)

    changed = 0
    for entry in data:
        if not isinstance(entry, dict):
            continue
        filename = (entry.get("filename") or "").strip()
        if not filename:
            continue
        rows = by_filename.get(filename) or []
        if not rows:
            continue
        row = rows[0]
        entry["promoted_v2_dir"] = row.get("v2_dir")
        entry["promoted_v2_at"] = run_ts
        changed += 1

    if changed:
        index_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def unbundle(hyp_path: Path, output_dir: Path | None = None) -> Path:
    """Extract .hyp file to directory."""
    with open(hyp_path, 'rb') as f:
        data = f.read()

    # Parse header
    header_size = struct.unpack('<I', data[:4])[0]
    header = json.loads(data[4:4 + header_size].decode('utf-8'))

    # Create output directory
    if output_dir is None:
        output_dir = hyp_path.parent / hyp_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)
    assets_dir = output_dir / 'assets'
    assets_dir.mkdir(exist_ok=True)

    # Write blueprint.json
    blueprint_path = output_dir / 'blueprint.json'
    with open(blueprint_path, 'w') as f:
        json.dump(header['blueprint'], f, indent=2)

    # Extract assets
    position = 4 + header_size
    manifest = []

    for i, asset in enumerate(header.get('assets', [])):
        asset_size = int(asset.get('size', 0) or 0)
        asset_url = asset.get('url') or f'asset://asset_{i}.bin'
        asset_type = asset.get('type', 'asset')

        asset_data = data[position:position + asset_size]

        # Get filename from URL (asset://filename.ext)
        filename = str(asset_url).replace('asset://', '') or f'asset_{i}.bin'
        asset_path = assets_dir / filename

        with open(asset_path, 'wb') as f:
            f.write(asset_data)

        manifest.append({
            'type': asset_type,
            'url': asset_url,
            'filename': filename,
            'size': asset_size,
            'mime': asset.get('mime', '')
        })

        position += asset_size

    # Write manifest.json (asset metadata)
    manifest_path = output_dir / 'manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"Extracted to: {output_dir}/")
    print(f"  blueprint.json - app configuration")
    print(f"  manifest.json  - asset metadata")
    print(f"  assets/        - {len(manifest)} files")

    return output_dir


def unbundle_index(
    index_path: Path,
    hyp_root: Path,
    out_root: Path,
    *,
    limit: int | None = None,
    force: bool = False,
    write_index: bool = False,
    dry_run: bool = False,
) -> int:
    entries = load_index(index_path)
    hyp_root = hyp_root.resolve()
    out_root = out_root.resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    groups: dict[str, list[int]] = {}
    for i, entry in enumerate(entries):
        filename = (entry.get("filename") or "").strip()
        if not filename:
            continue
        groups.setdefault(filename, []).append(i)

    planned: list[tuple[str, Path, Path, list[int]]] = []
    skipped_missing_hyp = 0
    skipped_existing_out = 0

    for filename, idxs in groups.items():
        hyp_path = hyp_root / filename
        if not hyp_path.exists():
            skipped_missing_hyp += 1
            continue

        out_dir = out_root / slugify_stem(filename)
        if out_dir.exists() and not force:
            skipped_existing_out += 1
            rel = rel_or_abs(out_dir)
            for idx in idxs:
                entries[idx]["unbundled_path"] = rel
            continue

        planned.append((filename, hyp_path, out_dir, idxs))

    if limit is not None:
        planned = planned[: max(limit, 0)]

    print("HYP unbundle plan")
    print(f"  index_entries: {len(entries)}")
    print(f"  candidate_filenames: {len(groups)}")
    print(f"  missing_hyp_files: {skipped_missing_hyp}")
    print(f"  already_unbundled: {skipped_existing_out}")
    print(f"  queued_unbundle: {len(planned)}")

    if dry_run:
        for filename, _, out_dir, _ in planned[:30]:
            print(f"  - {filename} -> {out_dir}")
        if write_index:
            save_index(index_path, entries)
            print(f"Index saved: {index_path}")
        return 0

    success = 0
    failed = 0
    run_ts = now_iso()

    for i, (filename, hyp_path, out_dir, idxs) in enumerate(planned, start=1):
        print(f"[{i}/{len(planned)}] {filename}")
        try:
            unbundle(hyp_path, out_dir)
        except Exception as exc:
            failed += 1
            print(f"  FAILED: {exc}")
            continue

        rel = rel_or_abs(out_dir)
        for idx in idxs:
            entries[idx]["unbundled_path"] = rel
            entries[idx]["unbundled_at"] = run_ts
        success += 1
        print("  OK")

    if write_index:
        save_index(index_path, entries)
        print(f"Index saved: {index_path}")

    print("\nUnbundle summary")
    print(f"  success: {success}")
    print(f"  failed: {failed}")
    print(f"  out_root: {out_root}")

    return 0 if failed == 0 else 2


def promote(
    apps_manifest_path: Path,
    index_path: Path,
    unbundled_root: Path,
    v2_root: Path,
    report_path: Path,
    *,
    limit: int | None = None,
    force: bool = False,
    write_index: bool = False,
    dry_run: bool = False,
) -> int:
    """Promote unbundled apps from tmp/unbundled-hyp/ into v2/ using apps-manifest."""
    apps_manifest_path = apps_manifest_path.resolve()
    index_path = index_path.resolve()
    unbundled_root = unbundled_root.resolve()
    v2_root = v2_root.resolve()
    report_path = report_path.resolve()

    if not apps_manifest_path.exists():
        print(f"Error: apps-manifest not found: {apps_manifest_path}")
        print("  Run build_catalog.py first to generate it.")
        return 1

    app_rows: list[dict[str, Any]] = []
    for app in load_canonical_apps(apps_manifest_path):
        slug = (app.get("app_slug") or "").strip()
        manifest_rel = (app.get("manifest_path") or "").strip()
        if slug and manifest_rel:
            app_rows.append({"app_slug": slug, "manifest_path": manifest_rel, "hyp_filename": ""})

    if not app_rows:
        print("Error: no usable app rows found in apps-manifest.")
        return 1

    if limit is not None:
        app_rows = app_rows[: max(limit, 0)]

    print("V2 promotion plan")
    print(f"  apps_manifest: {apps_manifest_path}")
    print(f"  app_rows: {len(app_rows)}")
    print(f"  unbundled_root: {unbundled_root}")
    print(f"  v2_root: {v2_root}")
    print(f"  force: {force}")
    print(f"  dry_run: {dry_run}")

    run_ts = now_iso()
    promoted_rows: list[dict[str, Any]] = []
    report_rows: list[dict[str, Any]] = []

    counts = {
        "promoted": 0,
        "overwritten_force": 0,
        "already_identical": 0,
        "conflict_existing": 0,
        "missing_unbundled": 0,
        "missing_manifest": 0,
        "missing_hyp_filename": 0,
    }

    for i, app in enumerate(app_rows, start=1):
        slug = (app.get("app_slug") or "").strip()
        manifest_rel = (app.get("manifest_path") or "").strip()
        hyp_filename = (app.get("hyp_filename") or "").strip()
        if not slug:
            continue

        if manifest_rel:
            manifest = load_manifest(manifest_rel)
            if not manifest:
                counts["missing_manifest"] += 1
                report_rows.append({"app_slug": slug, "manifest_path": manifest_rel, "status": "missing_manifest"})
                continue
            hyp_filename = (manifest.get("source", {}).get("hyp_filename") or "").strip() or hyp_filename

        if not hyp_filename:
            counts["missing_hyp_filename"] += 1
            report_rows.append({"app_slug": slug, "manifest_path": manifest_rel, "status": "missing_hyp_filename"})
            continue

        source_dir = unbundled_root / slugify_stem(hyp_filename)
        target_dir = v2_root / slug
        print(f"[{i}/{len(app_rows)}] {slug}")

        if not source_dir.exists():
            counts["missing_unbundled"] += 1
            report_rows.append({"app_slug": slug, "hyp_filename": hyp_filename, "source_dir": rel_or_abs(source_dir), "v2_dir": rel_or_abs(target_dir), "status": "missing_unbundled"})
            print("  missing_unbundled")
            continue

        if not target_dir.exists():
            if not dry_run:
                target_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(source_dir, target_dir)
            counts["promoted"] += 1
            row = {"app_slug": slug, "hyp_filename": hyp_filename, "source_dir": rel_or_abs(source_dir), "v2_dir": rel_or_abs(target_dir), "status": "promoted"}
            promoted_rows.append(row)
            report_rows.append(row)
            print("  promoted")
            continue

        src_fp = tree_fingerprint(source_dir)
        dst_fp = tree_fingerprint(target_dir)
        if src_fp == dst_fp:
            counts["already_identical"] += 1
            row = {"app_slug": slug, "hyp_filename": hyp_filename, "source_dir": rel_or_abs(source_dir), "v2_dir": rel_or_abs(target_dir), "status": "already_identical"}
            promoted_rows.append(row)
            report_rows.append(row)
            print("  already_identical")
            continue

        if force:
            if not dry_run:
                shutil.rmtree(target_dir)
                shutil.copytree(source_dir, target_dir)
            counts["overwritten_force"] += 1
            row = {"app_slug": slug, "hyp_filename": hyp_filename, "source_dir": rel_or_abs(source_dir), "v2_dir": rel_or_abs(target_dir), "status": "overwritten_force"}
            promoted_rows.append(row)
            report_rows.append(row)
            print("  overwritten_force")
            continue

        counts["conflict_existing"] += 1
        report_rows.append({"app_slug": slug, "hyp_filename": hyp_filename, "source_dir": rel_or_abs(source_dir), "v2_dir": rel_or_abs(target_dir), "status": "conflict_existing"})
        print("  conflict_existing (skipped)")

    report_payload = {
        "generated_at": run_ts,
        "apps_manifest": rel_or_abs(apps_manifest_path),
        "unbundled_root": rel_or_abs(unbundled_root),
        "v2_root": rel_or_abs(v2_root),
        "force": force,
        "dry_run": dry_run,
        "counts": counts,
        "rows": report_rows,
    }
    if not dry_run:
        write_json(report_path, report_payload)

    if write_index and not dry_run:
        update_index_promotions(index_path, promoted_rows, run_ts)

    print("\nV2 promotion summary")
    for key, value in counts.items():
        print(f"  {key}: {value}")
    if not dry_run:
        print(f"  report: {report_path}")
        if write_index:
            print(f"  index_updated: {index_path}")

    return 0


def bundle(input_dir: Path, output_path: Path | None = None) -> Path:
    """Pack directory into .hyp file."""
    input_dir = Path(input_dir)

    # Read blueprint
    blueprint_path = input_dir / 'blueprint.json'
    if not blueprint_path.exists():
        raise FileNotFoundError(f"No blueprint.json found in {input_dir}")

    with open(blueprint_path) as f:
        blueprint = json.load(f)

    # Read manifest
    manifest_path = input_dir / 'manifest.json'
    if not manifest_path.exists():
        raise FileNotFoundError(f"No manifest.json found in {input_dir}")

    with open(manifest_path) as f:
        manifest = json.load(f)

    # Collect assets
    assets_dir = input_dir / 'assets'
    assets = []
    assets_data = b''

    for item in manifest:
        asset_path = assets_dir / item['filename']
        if not asset_path.exists():
            raise FileNotFoundError(f"Asset not found: {asset_path}")

        with open(asset_path, 'rb') as f:
            data = f.read()

        assets.append({
            'type': item.get('type', 'asset'),
            'url': item['url'],
            'size': len(data),
            'mime': item.get('mime', '')
        })
        assets_data += data

    # Build header
    header = {
        'blueprint': blueprint,
        'assets': assets
    }
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')

    # Build .hyp file
    hyp_data = struct.pack('<I', len(header_json)) + header_json + assets_data

    # Write output
    if output_path is None:
        output_path = input_dir.parent / f"{input_dir.name}.hyp"

    with open(output_path, 'wb') as f:
        f.write(hyp_data)

    print(f"Created: {output_path}")
    print(f"  Size: {len(hyp_data):,} bytes")
    print(f"  Assets: {len(assets)}")

    return output_path


def info(hyp_path: Path) -> dict:
    """Show .hyp file info without extracting."""
    with open(hyp_path, 'rb') as f:
        data = f.read()

    header_size = struct.unpack('<I', data[:4])[0]
    header = json.loads(data[4:4 + header_size].decode('utf-8'))

    bp = header['blueprint']
    print(f"File: {hyp_path}")
    print(f"Size: {len(data):,} bytes")
    print(f"\nBlueprint:")
    print(f"  Name: {bp.get('name', 'N/A')}")
    print(f"  Model: {bp.get('model', 'N/A')}")
    print(f"  Script: {bp.get('script', 'N/A')}")

    if bp.get('props'):
        print(f"  Props:")
        for key, val in bp['props'].items():
            if isinstance(val, dict) and 'url' in val:
                print(f"    {key}: {val.get('type', '?')} -> {val['url']}")
            else:
                print(f"    {key}: {val}")

    assets = header.get('assets', [])
    print(f"\nAssets ({len(assets)}):")
    for i, asset in enumerate(assets):
        asset_url = asset.get('url') or f'asset://asset_{i}.bin'
        filename = str(asset_url).replace('asset://', '')
        asset_type = asset.get('type', 'asset')
        asset_size = int(asset.get('size', 0) or 0)
        print(f"  [{asset_type}] {filename} ({asset_size:,} bytes)")

    return header


def main():
    parser = argparse.ArgumentParser(
        description='HYP Tool - Unbundle and rebundle Hyperfy .hyp packages',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    subparsers = parser.add_subparsers(dest='command', required=True)

    # unbundle command
    unbundle_parser = subparsers.add_parser('unbundle', help='Extract .hyp to directory')
    unbundle_parser.add_argument('hyp_file', type=Path, help='.hyp file to extract')
    unbundle_parser.add_argument('output_dir', type=Path, nargs='?', help='Output directory')

    # unbundle-index command
    unbundle_index_parser = subparsers.add_parser(
        "unbundle-index",
        help="Batch unbundle .hyp files from index into tmp/unbundled-hyp",
    )
    unbundle_index_parser.add_argument(
        "--index",
        type=Path,
        default=DEFAULT_INDEX,
        help=f"Path to hyp index (default: {DEFAULT_INDEX})",
    )
    unbundle_index_parser.add_argument(
        "--hyp-root",
        type=Path,
        default=DEFAULT_HYP_ROOT,
        help=f"Directory with .hyp files (default: {DEFAULT_HYP_ROOT})",
    )
    unbundle_index_parser.add_argument(
        "--out-root",
        type=Path,
        default=DEFAULT_OUT_ROOT,
        help=f"Output root for unbundled files (default: {DEFAULT_OUT_ROOT})",
    )
    unbundle_index_parser.add_argument("--limit", type=int, default=None, help="Limit number of files to unbundle")
    unbundle_index_parser.add_argument("--force", action="store_true", help="Re-unbundle even when output dir exists")
    unbundle_index_parser.add_argument("--write-index", action="store_true", help="Persist unbundled_path/unbundled_at in index")
    unbundle_index_parser.add_argument("--dry-run", action="store_true", help="Show planned actions without unbundling")

    # promote command
    promote_parser = subparsers.add_parser(
        "promote",
        help="Promote unbundled apps from tmp/unbundled-hyp/ into v2/",
    )
    promote_parser.add_argument("--apps-manifest", type=Path, default=DEFAULT_APPS_MANIFEST, help=f"Canonical apps-manifest path (default: {DEFAULT_APPS_MANIFEST})")
    promote_parser.add_argument("--index", type=Path, default=DEFAULT_INDEX, help=f"Index path for promotion annotations (default: {DEFAULT_INDEX})")
    promote_parser.add_argument("--unbundled-root", type=Path, default=DEFAULT_OUT_ROOT, help=f"Unbundled root (default: {DEFAULT_OUT_ROOT})")
    promote_parser.add_argument("--v2-root", type=Path, default=DEFAULT_V2_ROOT, help=f"Target v2 root (default: {DEFAULT_V2_ROOT})")
    promote_parser.add_argument("--report", type=Path, default=DEFAULT_PROMOTE_REPORT, help=f"Output report path (default: {DEFAULT_PROMOTE_REPORT})")
    promote_parser.add_argument("--limit", type=int, default=None, help="Limit number of apps to process")
    promote_parser.add_argument("--force", action="store_true", help="Overwrite existing conflicting v2/<slug> directories")
    promote_parser.add_argument("--write-index", action="store_true", help="Write promoted_v2_* metadata into index rows")
    promote_parser.add_argument("--dry-run", action="store_true", help="Plan only; do not copy files")

    # bundle command
    bundle_parser = subparsers.add_parser('bundle', help='Pack directory into .hyp')
    bundle_parser.add_argument('input_dir', type=Path, help='Directory to pack')
    bundle_parser.add_argument('output_file', type=Path, nargs='?', help='Output .hyp file')

    # info command
    info_parser = subparsers.add_parser('info', help='Show .hyp contents')
    info_parser.add_argument('hyp_file', type=Path, help='.hyp file to inspect')

    args = parser.parse_args()

    if args.command == 'unbundle':
        unbundle(args.hyp_file, args.output_dir)
        return 0
    elif args.command == 'unbundle-index':
        return unbundle_index(
            args.index,
            args.hyp_root,
            args.out_root,
            limit=args.limit,
            force=args.force,
            write_index=args.write_index,
            dry_run=args.dry_run,
        )
    elif args.command == "promote":
        return promote(
            args.apps_manifest,
            args.index,
            args.unbundled_root,
            args.v2_root,
            args.report,
            limit=args.limit,
            force=args.force,
            write_index=args.write_index,
            dry_run=args.dry_run,
        )
    elif args.command == 'bundle':
        bundle(args.input_dir, args.output_file)
        return 0
    elif args.command == 'info':
        info(args.hyp_file)
        return 0
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Audit external .hyp repositories against local v2 storage and catalog datasets.

Outputs a timestamped audit folder under tmp/audits with:
  - external-hyp-audit.json
  - external-hyp-audit.md
  - proposed-additions.txt
  - catalog-gaps.txt

Example:
  python scripts/catalog/audit_external_hyps.py \
    --external-root /home/jin/repo/awesome-hyps \
    --external-root /home/jin/repo/.hyp-apps-
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_EXTERNAL_ROOTS = [
    Path("/home/jin/repo/awesome-hyps"),
    Path("/home/jin/repo/.hyp-apps-"),
]
DEFAULT_INTERNAL_HYP_ROOT = PROJECT_ROOT / "v2" / "hyp-files"
DEFAULT_CATALOG_JSON = PROJECT_ROOT / "catalog" / "catalog.json"
DEFAULT_INDEX_JSON = PROJECT_ROOT / "scripts" / "context" / "hyp_index.raw.json"
DEFAULT_OUT_ROOT = PROJECT_ROOT / "tmp" / "audits"


@dataclass(frozen=True)
class HypFile:
    source_repo: str
    absolute_path: Path
    relative_path: str
    filename: str


@dataclass(frozen=True)
class InternalHyp:
    absolute_path: Path
    relative_path: str
    filename: str
    sha256: str
    normalized_filename: str


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def timestamp_tag() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")


def normalize_filename(filename: str) -> str:
    stem = Path(filename).stem.lower()
    return re.sub(r"[^a-z0-9]+", "", stem)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def rel_or_abs(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def find_hyp_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(p for p in root.rglob("*.hyp") if p.is_file())


def load_catalog_filenames(path: Path) -> set[str]:
    if not path.exists():
        return set()
    payload = json.loads(path.read_text(encoding="utf-8"))
    apps = payload.get("apps") if isinstance(payload, dict) else None
    if not isinstance(apps, list):
        return set()

    names: set[str] = set()
    for app in apps:
        if not isinstance(app, dict):
            continue
        hyp_filename = (app.get("hyp_filename") or "").strip()
        if hyp_filename:
            names.add(hyp_filename)
            continue
        download_path = (app.get("download_path") or "").strip()
        if download_path:
            names.add(Path(download_path).name)
    return names


def load_index_filenames(path: Path) -> set[str]:
    if not path.exists():
        return set()
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return set()

    names: set[str] = set()
    for row in payload:
        if not isinstance(row, dict):
            continue
        filename = (row.get("filename") or "").strip()
        if filename:
            names.add(filename)
    return names


def build_internal_inventory(internal_paths: list[Path]) -> list[InternalHyp]:
    records: list[InternalHyp] = []
    for path in internal_paths:
        records.append(
            InternalHyp(
                absolute_path=path.resolve(),
                relative_path=rel_or_abs(path.resolve()),
                filename=path.name,
                sha256=file_sha256(path),
                normalized_filename=normalize_filename(path.name),
            )
        )
    return records


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_lines(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = "\n".join(lines).rstrip() + ("\n" if lines else "")
    path.write_text(content, encoding="utf-8")


def markdown_table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    header = "| " + " | ".join(rows[0]) + " |"
    sep = "| " + " | ".join("---" for _ in rows[0]) + " |"
    body = ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join([header, sep, *body])


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit external .hyp repos against local catalog")
    parser.add_argument(
        "--external-root",
        action="append",
        type=Path,
        default=None,
        help="External repo root containing .hyp files (repeatable)",
    )
    parser.add_argument(
        "--internal-hyp-root",
        type=Path,
        default=DEFAULT_INTERNAL_HYP_ROOT,
        help=f"Internal v2 hyp root (default: {DEFAULT_INTERNAL_HYP_ROOT})",
    )
    parser.add_argument(
        "--catalog-json",
        type=Path,
        default=DEFAULT_CATALOG_JSON,
        help=f"Catalog JSON path (default: {DEFAULT_CATALOG_JSON})",
    )
    parser.add_argument(
        "--index-json",
        type=Path,
        default=DEFAULT_INDEX_JSON,
        help=f"Hyp index JSON path (default: {DEFAULT_INDEX_JSON})",
    )
    parser.add_argument(
        "--out-root",
        type=Path,
        default=DEFAULT_OUT_ROOT,
        help=f"Audit output root (default: {DEFAULT_OUT_ROOT})",
    )
    args = parser.parse_args()

    external_roots = args.external_root or DEFAULT_EXTERNAL_ROOTS
    external_roots = [p.resolve() for p in external_roots]
    internal_hyp_root = args.internal_hyp_root.resolve()
    catalog_json = args.catalog_json.resolve()
    index_json = args.index_json.resolve()
    out_root = args.out_root.resolve()

    generated_at = now_utc()
    audit_dir = out_root / f"external-hyps-{timestamp_tag()}"
    audit_dir.mkdir(parents=True, exist_ok=True)

    external_files: list[HypFile] = []
    for root in external_roots:
        repo_name = root.name
        for path in find_hyp_files(root):
            external_files.append(
                HypFile(
                    source_repo=repo_name,
                    absolute_path=path.resolve(),
                    relative_path=str(path.relative_to(root)),
                    filename=path.name,
                )
            )
    external_files.sort(key=lambda x: (x.source_repo.lower(), x.relative_path.lower()))

    internal_paths = find_hyp_files(internal_hyp_root)
    internal_inventory = build_internal_inventory(internal_paths)

    internal_by_hash: dict[str, list[InternalHyp]] = defaultdict(list)
    internal_by_name: dict[str, list[InternalHyp]] = defaultdict(list)
    internal_by_norm: dict[str, list[InternalHyp]] = defaultdict(list)
    for row in internal_inventory:
        internal_by_hash[row.sha256].append(row)
        internal_by_name[row.filename].append(row)
        internal_by_norm[row.normalized_filename].append(row)

    catalog_names = load_catalog_filenames(catalog_json)
    index_names = load_index_filenames(index_json)
    catalog_norms = {normalize_filename(name) for name in catalog_names}
    index_norms = {normalize_filename(name) for name in index_names}

    records: list[dict[str, Any]] = []
    catalog_gaps: list[dict[str, Any]] = []
    status_counter: Counter[str] = Counter()

    for external in external_files:
        ext_hash = file_sha256(external.absolute_path)
        ext_norm = normalize_filename(external.filename)

        hash_matches = sorted(
            internal_by_hash.get(ext_hash, []),
            key=lambda x: x.relative_path.lower(),
        )
        name_matches = sorted(
            internal_by_name.get(external.filename, []),
            key=lambda x: x.relative_path.lower(),
        )
        norm_matches = sorted(
            internal_by_norm.get(ext_norm, []),
            key=lambda x: x.relative_path.lower(),
        )

        matched_records: list[InternalHyp]
        if hash_matches:
            matched_records = hash_matches
            if any(row.filename == external.filename for row in hash_matches):
                match_status = "existing_exact"
                notes = "Matched by sha256 and exact filename."
            else:
                match_status = "existing_by_content"
                notes = "Matched by sha256 with different filename."
        elif name_matches:
            matched_records = name_matches
            match_status = "existing_exact_name_only"
            notes = "Exact filename matched but content hash differed."
        elif norm_matches:
            matched_records = norm_matches
            match_status = "existing_by_name_only"
            notes = "Normalized filename matched but no content hash match."
        else:
            matched_records = []
            match_status = "missing_candidate"
            notes = "No content, exact-name, or normalized-name match in v2/hyp-files."

        matched_paths = [row.relative_path for row in matched_records]
        matched_filenames = {row.filename for row in matched_records}
        matched_norms = {row.normalized_filename for row in matched_records}

        catalog_exact_external = external.filename in catalog_names
        catalog_norm_external = ext_norm in catalog_norms
        index_exact_external = external.filename in index_names
        index_norm_external = ext_norm in index_norms

        catalog_exact_matched = any(name in catalog_names for name in matched_filenames)
        catalog_norm_matched = any(norm in catalog_norms for norm in matched_norms)
        index_exact_matched = any(name in index_names for name in matched_filenames)
        index_norm_matched = any(norm in index_norms for norm in matched_norms)

        represented_in_catalog = (
            catalog_exact_external
            or catalog_norm_external
            or catalog_exact_matched
            or catalog_norm_matched
        )
        represented_in_index = (
            index_exact_external
            or index_norm_external
            or index_exact_matched
            or index_norm_matched
        )
        represented_in_catalog_or_index = represented_in_catalog or represented_in_index

        if match_status in {"existing_exact", "existing_by_content"} and not represented_in_catalog_or_index:
            notes += " Catalog/index gap detected for matched content."
            catalog_gaps.append(
                {
                    "source_repo": external.source_repo,
                    "source_path": str(external.absolute_path),
                    "filename": external.filename,
                    "matched_internal_paths": matched_paths,
                }
            )

        record = {
            "source_repo": external.source_repo,
            "source_path": str(external.absolute_path),
            "source_relpath": external.relative_path,
            "filename": external.filename,
            "sha256": ext_hash,
            "match_status": match_status,
            "matched_internal_path": matched_paths[0] if matched_paths else None,
            "matched_internal_paths": matched_paths,
            "catalog_presence": {
                "catalog_exact_external_filename": catalog_exact_external,
                "catalog_normalized_external_filename": catalog_norm_external,
                "index_exact_external_filename": index_exact_external,
                "index_normalized_external_filename": index_norm_external,
                "catalog_exact_matched_internal_filename": catalog_exact_matched,
                "catalog_normalized_matched_internal_filename": catalog_norm_matched,
                "index_exact_matched_internal_filename": index_exact_matched,
                "index_normalized_matched_internal_filename": index_norm_matched,
                "represented_in_catalog": represented_in_catalog,
                "represented_in_index": represented_in_index,
                "represented_in_catalog_or_index": represented_in_catalog_or_index,
            },
            "notes": notes,
        }
        records.append(record)
        status_counter[match_status] += 1

    missing_candidates = [r for r in records if r["match_status"] == "missing_candidate"]
    proposed_additions = [r["source_path"] for r in missing_candidates]

    summary_counts = {
        "external_files": len(external_files),
        "internal_files": len(internal_inventory),
        "catalog_hyp_filenames": len(catalog_names),
        "index_filenames": len(index_names),
        "existing_exact": status_counter.get("existing_exact", 0),
        "existing_by_content": status_counter.get("existing_by_content", 0),
        "existing_exact_name_only": status_counter.get("existing_exact_name_only", 0),
        "existing_by_name_only": status_counter.get("existing_by_name_only", 0),
        "missing_candidate": status_counter.get("missing_candidate", 0),
        "catalog_gaps": len(catalog_gaps),
    }

    json_payload = {
        "generated_at": generated_at,
        "external_roots": [str(p) for p in external_roots],
        "internal_hyp_root": str(internal_hyp_root),
        "catalog_json": str(catalog_json),
        "index_json": str(index_json),
        "counts": summary_counts,
        "missing_candidates": [
            {
                "source_repo": r["source_repo"],
                "filename": r["filename"],
                "source_path": r["source_path"],
            }
            for r in missing_candidates
        ],
        "catalog_gaps": catalog_gaps,
        "records": records,
    }

    json_path = audit_dir / "external-hyp-audit.json"
    md_path = audit_dir / "external-hyp-audit.md"
    proposed_additions_path = audit_dir / "proposed-additions.txt"
    catalog_gaps_path = audit_dir / "catalog-gaps.txt"

    write_json(json_path, json_payload)
    write_lines(proposed_additions_path, proposed_additions)

    catalog_gap_lines = []
    for gap in catalog_gaps:
        matched = ", ".join(gap["matched_internal_paths"]) if gap["matched_internal_paths"] else "n/a"
        catalog_gap_lines.append(f"{gap['source_path']} -> {matched}")
    write_lines(catalog_gaps_path, catalog_gap_lines)

    counts_table = markdown_table(
        [
            ["Metric", "Count"],
            ["External files", str(summary_counts["external_files"])],
            ["Internal v2/hyp-files", str(summary_counts["internal_files"])],
            ["Catalog hyp filenames", str(summary_counts["catalog_hyp_filenames"])],
            ["Index filenames", str(summary_counts["index_filenames"])],
            ["existing_exact", str(summary_counts["existing_exact"])],
            ["existing_by_content", str(summary_counts["existing_by_content"])],
            ["existing_exact_name_only", str(summary_counts["existing_exact_name_only"])],
            ["existing_by_name_only", str(summary_counts["existing_by_name_only"])],
            ["missing_candidate", str(summary_counts["missing_candidate"])],
            ["catalog_gaps", str(summary_counts["catalog_gaps"])],
        ]
    )

    missing_lines = (
        [f"- `{Path(row['source_path']).name}` ({row['source_repo']})" for row in missing_candidates]
        if missing_candidates
        else ["- None"]
    )
    gap_lines = (
        [
            f"- `{Path(row['source_path']).name}` -> `{row['matched_internal_paths'][0] if row['matched_internal_paths'] else 'n/a'}`"
            for row in catalog_gaps
        ]
        if catalog_gaps
        else ["- None"]
    )

    md_content = "\n".join(
        [
            "# External .hyp Audit",
            "",
            f"- Generated at: `{generated_at}`",
            f"- External roots: {', '.join(f'`{p}`' for p in external_roots)}",
            f"- Internal hyp root: `{internal_hyp_root}`",
            f"- Catalog JSON: `{catalog_json}`",
            f"- Index JSON: `{index_json}`",
            "",
            "## Summary",
            "",
            counts_table,
            "",
            "## Missing Candidates",
            "",
            *missing_lines,
            "",
            "## Catalog Gaps",
            "",
            *gap_lines,
            "",
            "## Artifacts",
            "",
            f"- JSON report: `{json_path}`",
            f"- Proposed additions: `{proposed_additions_path}`",
            f"- Catalog gaps: `{catalog_gaps_path}`",
            "",
        ]
    )
    md_path.write_text(md_content, encoding="utf-8")

    print("External .hyp audit complete")
    print(f"  audit_dir: {audit_dir}")
    for key in [
        "external_files",
        "existing_exact",
        "existing_by_content",
        "existing_exact_name_only",
        "existing_by_name_only",
        "missing_candidate",
        "catalog_gaps",
    ]:
        print(f"  {key}: {summary_counts[key]}")
    print(f"  report_json: {json_path}")
    print(f"  report_md: {md_path}")
    print(f"  proposed_additions: {proposed_additions_path}")
    print(f"  catalog_gaps_file: {catalog_gaps_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

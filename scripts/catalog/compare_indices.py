#!/usr/bin/env python3
"""
Compare two hyp index JSON files for migration parity.

Usage:
  uv run python scripts/catalog/compare_indices.py \
    --baseline context/hyp_index.from-source.json \
    --candidate context/hyp_index.raw.json \
    --report tmp/manifests/index-parity-report.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_entries(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Index file not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"Index file must be a JSON array: {path}")
    return data


def key_of(entry: dict) -> str:
    att_id = (entry.get("attachment_id") or "").strip()
    if att_id:
        return att_id
    filename = (entry.get("filename") or "").strip()
    msg_id = (entry.get("message_id") or "").strip()
    ts = (entry.get("timestamp") or "").strip()
    return f"fallback::{filename}|{msg_id}|{ts}"


def summarize_drift(base: dict, cand: dict) -> list[str]:
    drifts: list[str] = []
    fields = [
        "filename",
        "url",
        "message_id",
        "channel_name",
        "timestamp",
        "primary_preview",
    ]
    for field in fields:
        if base.get(field) != cand.get(field):
            drifts.append(field)

    base_media = len(base.get("media_candidates") or [])
    cand_media = len(cand.get("media_candidates") or [])
    if base_media != cand_media:
        drifts.append("media_candidates_count")

    base_ctx = len(base.get("context_messages") or [])
    cand_ctx = len(cand.get("context_messages") or [])
    if base_ctx != cand_ctx:
        drifts.append("context_messages_count")

    return drifts


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare baseline and candidate hyp indices")
    parser.add_argument("--baseline", type=Path, required=True, help="Baseline index JSON")
    parser.add_argument("--candidate", type=Path, required=True, help="Candidate index JSON")
    parser.add_argument("--report", type=Path, default=None, help="Optional output JSON report path")
    parser.add_argument("--max-samples", type=int, default=25, help="Max example rows per category")
    parser.add_argument("--fail-on-loss", action="store_true", help="Exit non-zero if candidate is missing baseline entries")
    args = parser.parse_args()

    baseline_entries = load_entries(args.baseline)
    candidate_entries = load_entries(args.candidate)

    baseline_by_key = {key_of(e): e for e in baseline_entries}
    candidate_by_key = {key_of(e): e for e in candidate_entries}

    baseline_keys = set(baseline_by_key.keys())
    candidate_keys = set(candidate_by_key.keys())

    missing_from_candidate = sorted(baseline_keys - candidate_keys)
    added_in_candidate = sorted(candidate_keys - baseline_keys)
    shared_keys = sorted(baseline_keys & candidate_keys)

    field_drifts = []
    for key in shared_keys:
        drift_fields = summarize_drift(baseline_by_key[key], candidate_by_key[key])
        if drift_fields:
            field_drifts.append(
                {
                    "key": key,
                    "drifts": drift_fields,
                    "baseline_filename": baseline_by_key[key].get("filename"),
                    "candidate_filename": candidate_by_key[key].get("filename"),
                }
            )

    report = {
        "baseline": str(args.baseline),
        "candidate": str(args.candidate),
        "counts": {
            "baseline": len(baseline_entries),
            "candidate": len(candidate_entries),
            "shared": len(shared_keys),
            "missing_from_candidate": len(missing_from_candidate),
            "added_in_candidate": len(added_in_candidate),
            "field_drift_rows": len(field_drifts),
        },
        "samples": {
            "missing_from_candidate": missing_from_candidate[: args.max_samples],
            "added_in_candidate": added_in_candidate[: args.max_samples],
            "field_drifts": field_drifts[: args.max_samples],
        },
    }

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Index parity report")
    print(f"  baseline: {args.baseline}")
    print(f"  candidate: {args.candidate}")
    print(f"  baseline_count: {len(baseline_entries)}")
    print(f"  candidate_count: {len(candidate_entries)}")
    print(f"  shared: {len(shared_keys)}")
    print(f"  missing_from_candidate: {len(missing_from_candidate)}")
    print(f"  added_in_candidate: {len(added_in_candidate)}")
    print(f"  field_drift_rows: {len(field_drifts)}")
    if args.report:
        print(f"  report: {args.report}")

    if args.fail_on_loss and missing_from_candidate:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# SQLite-First ETL Runbook

## 1) Build canonical `.hyp` index from sqlite

```bash
uv run python scripts/research/extract_hyp_index_from_sqlite.py \
  --sqlite ./hyperfy-discord.sqlite \
  --output context/hyp_index.raw.json \
  --stats
```

Optional filters:

```bash
uv run python scripts/research/extract_hyp_index_from_sqlite.py \
  --after 2025-02-24 --before 2025-02-25 \
  --channel-id 994775534733115412
```

## 2) Build catalog using local canonical index

```bash
uv run python scripts/catalog/build_catalog.py \
  --use-local-index \
  --local-index context/hyp_index.raw.json
```

Notes:
- `--source-research` is now optional for index ingestion when local index exists.
- Missing `hyp_media/` or `hyp_media_report.md` in source research is treated as warning, not hard failure.

## 3) Dual-run parity check during migration

```bash
uv run python scripts/catalog/compare_indices.py \
  --baseline context/hyp_index.from-source.json \
  --candidate context/hyp_index.raw.json \
  --report tmp/manifests/index-parity-report.json
```

Use `--fail-on-loss` to fail CI or automation if candidate misses baseline IDs.

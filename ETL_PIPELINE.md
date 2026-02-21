# Hyperfy Apps ETL Pipeline

This document describes how ETL currently works in this repo, based on code in `scripts/` (not just high-level docs).

Checked on: **February 19, 2026**

## Why this exists

You are improving the pipelines that transform raw Discord-derived research data into:

- per-app manifests (`context/apps/*/manifest.json`)
- AI enrichments (`tmp/ai-summaries/*.json`)
- explorer payload (`catalog/catalog.json`)
- preview media (`catalog/media/*`)

This file is intended as an implementation contract for contributors.

## Freshness check (README + CLAUDE)

- `README.md`
  - filesystem modified: `2026-02-19 16:36` (local working tree)
  - last commit touching file: `e378591` on `2026-02-19`
- `CLAUDE.md`
  - filesystem modified: `2026-02-19 16:36` (local working tree)
  - last commit touching file: `a2ec525` on `2026-02-19`

Conclusion: both were updated recently, but neither is a full ETL contract. Keep this doc as the source of truth for pipeline behavior.

## Pipeline overview

```text
External research snapshot
  (/home/jin/repo/hyperfy-archive/sunset/research)
        |
        |  scripts/catalog/build_catalog.py
        v
context/hyp_index.raw.json
context/hyp_summaries/*.md
context/apps/*/manifest.json
tmp/manifests/apps-manifest.json
tmp/manifests/slug-collision-report.json
tmp/issues/missing-media-checklist.md
        |
        |  scripts/research/summarize_hyp_files_openrouter.py
        v
tmp/ai-summaries/*.json
tmp/manifests/ai-summary-report.json
        |
        |  scripts/catalog/build_explorer_data.py
        v
catalog/catalog.json
tmp/manifests/missing-hyp-files.json (if missing .hyp detected)
        |
        |  scripts/catalog/generate_missing_previews.py (optional)
        v
catalog/media/<slug>/preview.*
        |
        |  scripts/check_links.py (validation)
        v
publish catalog/ via GitHub Pages
```

## Data inputs

### External ingest package

`scripts/catalog/build_catalog.py` expects `--source-research` (default `/home/jin/repo/hyperfy-archive/sunset/research`) to contain:

- `hyp_index.json`
- `hyp_summaries/`
- `hyp_media/`
- `hyp_media_report.md`

Current observed state on February 19, 2026:

- `hyp_index.json` and `hyp_summaries/` exist.
- `hyp_media/` and `hyp_media_report.md` are missing in that external path.

Implication: non-dry-run `build_catalog.py` can fail at copy stage unless the external snapshot includes those paths.

### Repo-local inputs

- `hyp-files/*.hyp` (binary source artifacts)
- `v2/<slug>/` (human-readable app source)
- `context/snippets/*.snippet.txt` (for AI summarization prompting)
- `context/apps/*/manifest.json` (for final explorer build)

Note: `hyperfy-discord.sqlite` currently exists in repo root but is not directly consumed by these scripts.

## Script behavior (by file)

### `scripts/research/prepare_context_bundle.py`

Purpose:

- copy curated docs/reference files into `context/source/`
- create compact snippets in `context/snippets/`

Outputs:

- `context/source/*`
- `context/snippets/*.snippet.txt`
- `context/context-index.json`
- `context/README.md`

### `scripts/catalog/build_catalog.py`

Purpose:

- normalize external research snapshot into local manifest artifacts
- map Discord entries to app slugs
- choose preview media
- emit global build metadata

Main outputs (non-dry-run):

- `context/hyp_index.raw.json`
- `context/hyp_summaries/*.md`
- `tmp/hyp_media_raw/*` (copied media)
- `catalog/media/*` (optimized media)
- `context/apps/<slug>/manifest.json`
- `tmp/manifests/apps-manifest.json`
- `tmp/manifests/slug-collision-report.json`
- `tmp/issues/missing-media-checklist.md`
- `tmp/hyp_media_optimization.csv`
- `tmp/hyp_media_excluded.csv`

Key behavior details:

- slug resolution combines sanitized app names, filename stems, and optional `tmp/filename-mappings.csv`.
- duplicate slugs are deduped by overwrite order; dropped entries are recorded in `slug-collision-report.json`.
- `.hyp` existence is checked against `hyp-files/<filename>` and tracked in global counts.
- media optimizer uses:
  - `ffmpeg` for video
  - `pngquant` for PNG
  - `jpegoptim` for JPG/JPEG
- if candidate media cannot map, it can fall back to existing `catalog/media/<slug>/preview.*`.

Important flags:

- `--dry-run`
- `--skip-optimize`
- `--no-resume-optimize`
- `--no-merge-ai-summaries`
- `--source-research`

### `scripts/research/summarize_hyp_files_openrouter.py`

Purpose:

- generate AI enrichment sidecars for each app

Inputs:

- `tmp/manifests/apps-manifest.json`
- `context/apps/*/manifest.json`
- `context/hyp_index.raw.json`
- optional `context/hyp_summaries/*.md`
- optional `context/snippets/*.snippet.txt`

Outputs:

- `tmp/ai-summaries/<slug>.json`
- `tmp/manifests/ai-summary-report.json`
- `tmp/manifests/ai-summary-failures/*.txt` (on parse failures)

Env requirements:

- `OPENROUTER_API_KEY` (except in `--dry-run`)
- optional `OPENROUTER_SITE_URL`, `OPENROUTER_SITE_NAME`

Key behavior:

- uses structured JSON schema response format.
- derives `networking_profile` and `interaction_modes` from static analysis of summary markdown.
- applies a description quality gate and one retry.

### `scripts/catalog/build_explorer_data.py`

Purpose:

- build deployable `catalog/catalog.json` for the web explorer

Inputs:

- `context/apps/*/manifest.json`
- optional `tmp/ai-summaries/<slug>.json` (auto-merged into manifest if missing)
- optional `v2/<slug>/*.json`, `v2/<slug>/index.js`

Output:

- `catalog/catalog.json`

Failure guard:

- if a manifest references missing `hyp-files/*.hyp`, script writes:
  - `tmp/manifests/missing-hyp-files.json`
- then exits non-zero (`2`) by default **without writing** `catalog/catalog.json`.
- override with `--allow-missing-hyp`.

### `scripts/catalog/generate_missing_previews.py`

Purpose:

- generate previews for apps with `has_preview=false` in `catalog/catalog.json`

Inputs:

- `catalog/catalog.json`
- optional `context/apps/<slug>/manifest.json` (`ai` fields)

Outputs:

- `catalog/media/<slug>/preview.<png|jpg>`

Notes:

- skips apps that already have `catalog/media/<slug>/preview.*` unless `--force`.
- requires `OPENROUTER_API_KEY` unless `--dry-run`.

### `scripts/check_links.py`

Purpose:

- validate explorer URL surface:
  - `catalog/catalog.json`
  - preview URLs
  - download URLs (`download_path`)

Exit behavior:

- exits `1` on local preview failures
- does not fail local run for missing external downloads when `--local-only`

### `scripts/hyp_tool.py`

Purpose:

- `.hyp` utility:
  - `info`
  - `unbundle`
  - `bundle`

Used for source artifact inspection and manual extraction; not directly part of catalog ETL orchestration.

## Core data schemas

### `context/hyp_index.raw.json` entry (source ingest row)

Observed keys:

- `filename`, `app_name`, `attachment_id`, `url`, `size`, `source_type`
- `message_id`, `channel_name`, `channel_category`, `user_name`, `user_id`, `timestamp`
- `message_content_raw`, `message_content`
- `context_window`, `context_messages`, `context`
- `summary_path`, `summary_exists`
- `media_candidates`, `primary_preview`
- `flags`, `status`, `local_path`

### `context/apps/<slug>/manifest.json` (per-app normalized record)

Top-level:

- `app_id`, `app_slug`, `app_name`
- `source`, `author`, `description`, `links`, `preview`, `media`, `status`
- `generated_at`, `max_commit_size_bytes`
- optional `ai`

Mapping highlights from Discord ingest:

- `attachment_id` -> `source.discord_attachment_id`
- `message_id` -> `source.discord_message_id`
- `channel_name` -> `source.discord_channel`
- `timestamp` -> `source.discord_timestamp`
- `url` -> `source.discord_url`
- `filename` -> `source.hyp_filename`

### `catalog/catalog.json` (deploy payload)

Top-level:

- `version`, `generated_at`, `counts`, `tag_index`, `apps`

Per-app fields (current):

- identity: `slug`, `name`, `author`
- presentation: `description`, `preview_url`, `preview_type`
- download: `hyp_filename`, `download_path`, `has_download`
- metadata: `created_at`, `tags`, `interaction_modes`, `asset_profile`, `script_complexity`, `networking`
- availability: `has_preview`, `has_source`
- optional source excerpts: `props`, `script_excerpt`, `asset_files`

## Current known issues and gaps

1. Missing source artifact example:
   - `tmp/manifests/missing-hyp-files.json` currently reports `videoenhanced -> hyp-files/VideoEnhanced.hyp`.

2. External snapshot contract drift:
   - `build_catalog.py` expects `hyp_media/` and `hyp_media_report.md`, but current default source-research path does not include them.

3. Manifest freshness:
   - many `context/apps/*/manifest.json` files were generated before latest status extensions; rerunning full catalog build is required to refresh all status fields.

## Practical runbooks

### Fast local refresh (no external source-research)

1. `uv run python scripts/catalog/build_explorer_data.py --allow-missing-hyp`
2. `uv run python scripts/check_links.py --local-only`

### Full rebuild (with external source-research)

1. `uv run python scripts/research/prepare_context_bundle.py`
2. `uv run python scripts/catalog/build_catalog.py`
3. `uv run python scripts/research/summarize_hyp_files_openrouter.py`
4. `uv run python scripts/catalog/build_explorer_data.py`
5. `uv run python scripts/check_links.py`

## Questions to resolve while improving ETL

1. Should `build_catalog.py` tolerate missing `hyp_media/` and `hyp_media_report.md` in source research, or fail hard?
2. For slug collisions, should we keep latest-by-timestamp instead of current overwrite-by-iteration behavior?
3. Should we add CI checks that fail when:
   - `missing-hyp-files.json` has entries
   - `slug-collision-report.json` changes unexpectedly
4. Should `.sqlite` become a first-class input stage in this repo, or remain external pre-processing?

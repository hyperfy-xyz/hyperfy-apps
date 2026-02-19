# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Archive of 165+ Hyperfy virtual world apps with an AI-powered web explorer. The pipeline extracts `.hyp` binary packages into human-readable source, generates AI summaries, and serves a static catalog on GitHub Pages.

## Commands

```bash
# Rebuild explorer data (explorer-data.json + card.json files)
uv run python scripts/catalog/build_explorer_data.py

# Serve explorer locally (from repo root, not catalog/)
uv run python -m http.server 8080
# or: npx serve  (note: strips .html extensions, use directory URLs)

# Build full catalog (requires external source-research dir)
uv run python scripts/catalog/build_catalog.py --skip-optimize

# AI summarization (requires OPENROUTER_API_KEY)
uv run python scripts/research/summarize_hyp_files_openrouter.py --dry-run

# .hyp file inspection/extraction
uv run python scripts/hyp_tool.py info hyp-files/SomeApp.hyp
uv run python scripts/hyp_tool.py unbundle hyp-files/SomeApp.hyp output_dir/
```

**Critical:** Always use `uv run python`, never bare `python` or `python3` (enforced by hook).

## Architecture

### Data Pipeline

```
hyp-files/*.hyp (binary)
    → scripts/hyp_tool.py unbundle
    → v2/<slug>/ (blueprint JSON + index.js + assets/)
    → scripts/catalog/build_catalog.py
    → catalog/apps/<slug>/manifest.json + ai-summary.json
    → scripts/catalog/build_explorer_data.py
    → catalog/explorer-data.json + catalog/apps/<slug>/card.json
    → catalog/ (static site on GitHub Pages)
```

### Key Directories

- **`v2/<slug>/`** — Flat app source dirs (slugified). Each has `<Name>.json` (blueprint), `index.js`, and optional `assets/`.
- **`hyp-files/`** — Original `.hyp` binary files (174 files).
- **`catalog/`** — Static web explorer deployed to GitHub Pages. React 18 + HTM, no build step.
- **`catalog/apps/<slug>/`** — Per-app metadata: `manifest.json` (provenance), `ai-summary.json` (AI output), `card.json` (merged for explorer/agents). One dir per unique slug (165 total).
- **`catalog/explorer-data.json`** — Single merged JSON fetched by the explorer UI (~204KB).
- **`catalog/media/<slug>/`** — Optimized preview images/videos (~670MB, committed via LFS-like approach).
- **`context/`** — Knowledge base (not deployed): `hyp_index.raw.json` (Discord metadata), `hyp_summaries/` (full app docs), `snippets/` (doc snippets), `source/` (raw docs), `context-index.json`.
- **`scripts/catalog/`** — Build pipeline scripts.
- **`scripts/research/`** — AI summarization and context preparation.
- **`tmp/`** — Gitignored working directory. Contains `manifests/` (build pipeline artifacts: `apps-manifest.json`, `ai-summary-report.json`, `ai-summary-failures/`) and legacy files.

### Web Explorer (`catalog/`)

Single-page React app with no build step — edit `app.js`/`styles.css` directly.

- **`index.html`** — Entry point, loads React 18 + HTM + Prism.js from CDN via importmap.
- **`app.js`** — Full component tree (~500 LOC). Uses HTM tagged templates (`` html`<div>...</div>` ``), not JSX.
- **`styles.css`** — Dark theme, CSS variables (`--bg: #0c0c14`, `--accent: #8b5cf6`).

Data flow: fetches `explorer-data.json` on load; SourceModal lazy-loads `app.card_path` (e.g. `apps/<slug>/card.json`) on demand.

### Per-App Metadata Schema

**`ai-summary.json`** fields (strict enums):
- `feature_tags`: max 6 from canonical set: `particles`, `audio`, `vehicle`, `npc`, `combat`, `camera`, `physics`, `ui`, `environment`, `animation`, `interaction`, `building`, `teleport`, `media-player`, `multiplayer`, `3d-model`
- `script_complexity`: `low` | `medium` | `high`
- `asset_profile`: `light` | `medium` | `heavy`
- `networking_profile`: `none` | `local` | `shared_state` | `events`
- `interaction_modes`: subset of `action`, `trigger`, `ui`, `passive`, `networked`

### V2 App Script Pattern

```javascript
export default function main(world, app, fetch, props, setTimeout) {
  app.configure([{ key: 'image', type: 'file', kind: 'texture', label: 'Image' }])
  const obj = app.create('particles', { ... })
  app.add(obj)
}
```

Blueprint JSON references assets via `"assets/<filename>"` paths. Almost all apps are single `index.js` (exceptions: `place`, `car`).

## Deployment

GitHub Pages auto-deploys `catalog/` on push to `main` when `catalog/**` changes (`.github/workflows/deploy-pages.yml`). The explorer uses relative paths — preview images resolve under `catalog/media/<slug>/`, downloads point to GitHub raw CDN for `hyp-files/*.hyp`.

## Conventions

- App directory names are always slugified: lowercase, hyphens only (no underscores, dots, or special chars).
- `build_catalog.py` cannot run standalone — it needs the external `source-research` directory. Use `build_explorer_data.py` for local rebuilds.
- The explorer is served from repo root, not from `catalog/`. Paths in the HTML reference `./app.js`, `./styles.css`, etc.
- Tag normalization happens in `summarize_hyp_files_openrouter.py` (`TAG_CANONICAL` dict) and is enforced in `build_explorer_data.py` (`ALLOWED_TAGS` import).

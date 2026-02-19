# Hyperfy Apps Repo Organization Plan

## Goals (What You Requested)

1. Use `CLAUDE.md` and `README.md` context to drive a safe reorganization plan.
2. Clean naming in `catalog/apps/` so paths are slug-first and not Discord-source-shaped.
3. Remove Discord-shaped path coupling from metadata values (for example media paths and derived references).
4. Avoid using Discord message IDs in filenames/folder names where they are not needed, since provenance already exists in metadata.
5. Reduce the "two copies in different places" confusion between `v2/` and `catalog/apps/`.
6. Audit and update `scripts/catalog/*` for hardcoded paths.
7. Update README/docs to match any path and folder renames.
8. Rename `v2-hyp` to `hyp-files`.
9. Produce a detailed plan that can be peer-reviewed and refined before implementation.

## Current State Snapshot

1. `catalog/apps/` folders are currently keyed by `app_id` (`<slug>-<discord_message_id>`).
2. `catalog/apps/*/manifest.json`, `catalog/apps/*/card.json`, and `catalog/explorer-data.json` currently contain paths referencing:
   - `catalog/discord/hyp_media/<legacy_name_with_message_id>/...`
   - raw download URLs under `.../v2-hyp/<hyp_filename>`
3. `scripts/catalog/build_catalog.py` and `scripts/catalog/build_explorer_data.py` encode these conventions.
4. `catalog/app.js` assumes card fetch path shape `apps/<id>/card.json`.
5. `catalog/manifests/apps-manifest.json` currently has duplicate slug groups (13 groups), so pure `catalog/apps/<slug>/` naming would collide.

## Agreed Direction So Far

1. Keep split roles:
   - `v2/` remains extracted source code + assets.
   - `catalog/apps/` remains generated metadata for explorer/agent workflows.
2. Rename `v2-hyp` to `hyp-files` with a hard cutover (no compatibility alias).
3. Stage duplicate-slug entries for review under `catalog/duplicates/`.
4. Use media path scheme:
   - singleton: `catalog/media/<app_slug>/...`
   - duplicate slug revisions: `catalog/media/<app_slug>/revisions/<app_id>/...`

## Proposed Plan

### Phase 1: Rename `v2-hyp` to `hyp-files` (hard cutover)

1. Rename top-level folder `v2-hyp/` to `hyp-files/`.
2. Update references in scripts/docs:
   - `scripts/catalog/build_explorer_data.py` download URL generation
   - `README.md`
   - `CLAUDE.md`
   - any remaining `v2-hyp` references
3. Rebuild generated artifacts (`explorer-data.json`, `card.json` files) after path changes.
4. Validate no stale `v2-hyp` string references remain.

### Phase 2: Duplicate slug staging and comparison prep

1. Detect all duplicate slug groups from `catalog/manifests/apps-manifest.json`.
2. Copy each duplicate entry to `catalog/duplicates/<app_slug>/<app_id>/`.
3. Generate a machine-readable duplicate report (proposed: `catalog/manifests/duplicate-slug-report.json`) containing:
   - `app_slug`, `app_id`, `discord_message_id`, `hyp_filename`, `v2_app_dir`
   - file/content hashes for `manifest.json`, `ai-summary.json`, blueprint JSON, and `index.js` when present
   - classification hint (`exact_content_duplicate`, `same_slug_different_content`, `insufficient_data`)
4. Do not dedupe or delete in this phase.

### Phase 3: Slug-first metadata path migration

1. Introduce slug-first app metadata layout:
   - singleton slug: `catalog/apps/<app_slug>/...`
   - duplicate slug revisions: `catalog/apps/<app_slug>/revisions/<app_id>/...`
2. Keep `app_id` as stable unique identifier in data models.
3. Decouple paths from ID inference by adding explicit path fields in `apps-manifest.json`:
   - `manifest_path`
   - `card_path`
   - `ai_summary_path`
4. Update scripts to consume explicit paths instead of hardcoded `catalog/apps/<app_id>/...`.

### Phase 4: Media path cleanup

1. Migrate media from `catalog/discord/hyp_media/<legacy_name_with_message_id>/...` to:
   - `catalog/media/<app_slug>/...` for singleton slugs
   - `catalog/media/<app_slug>/revisions/<app_id>/...` for duplicate slug groups
2. Rewrite all path references in:
   - `catalog/apps/**/manifest.json`
   - `catalog/apps/**/card.json`
   - `catalog/explorer-data.json`
3. Preserve Discord provenance only in metadata fields, not path naming.

### Phase 5: Script and UI updates

1. Update `scripts/catalog/build_catalog.py`:
   - emit slug/revision-aware output paths
   - stop deriving folder paths from `app_id`
2. Update `scripts/catalog/build_explorer_data.py`:
   - consume explicit manifest paths from global manifest
   - emit `card_path` for UI
   - emit download URLs using `hyp-files`
3. Update `scripts/research/summarize_hyp_files_openrouter.py`:
   - path resolution based on explicit manifest fields, not `app_id` assumptions
4. Update `scripts/catalog/generate_missing_previews.py`:
   - align explorer-data location/shape and `card_path` usage
5. Update `catalog/app.js`:
   - fetch cards via `app.card_path` (not `apps/${id}/card.json`)

### Phase 6: Validation and documentation

1. Add or run a path-integrity validator (proposed `scripts/catalog/validate_catalog_paths.py`) that checks:
   - all `manifest_path`/`card_path`/`ai_summary_path` files exist
   - all preview media paths exist
   - no stale `v2-hyp` or `catalog/discord/hyp_media` references remain
2. Rebuild artifacts and verify:
   - app count unchanged
   - duplicate slugs still represented safely
   - explorer loads correctly
   - card modal fetches and downloads still work
3. Update docs (`README.md`, `CLAUDE.md`) to explain:
   - new tree and naming policy
   - split role rationale (`v2/` vs `catalog/apps/`)
   - duplicate review workflow in `catalog/duplicates/`

## Rationale

1. Slug-first paths are cleaner and match `v2/<slug>/` conventions.
2. Keeping `app_id` as stable identity preserves uniqueness while allowing cleaner paths.
3. Duplicate staging avoids accidental data loss and supports human review before dedupe.
4. Provenance should remain in structured metadata (`discord_message_id`), not encoded into path names.
5. Explicit path fields reduce brittle script/UI assumptions and improve maintainability.
6. Keeping split roles (source in `v2/`, generated metadata in `catalog/apps/`) avoids conflating runtime source with catalog artifacts.
7. Hard cutover on `hyp-files` keeps migration straightforward and avoids temporary compatibility overhead.

## Questions / Clarifications for Peer Review

1. After duplicate review, what is canonical-selection policy per slug?
   - latest timestamp, highest quality preview, hash-based match, or manual approval?
2. Explorer behavior for duplicate revisions:
   - show all revisions as separate cards, or show one canonical card with revision drill-down?
3. Should `catalog/discord/` remain named as-is for raw ingest provenance, or be renamed later to a neutral source-ingest folder?
4. For singleton slugs, should media always stay flat (`catalog/media/<slug>/...`) or always use a revision layer for consistency?
5. Are breaking old public preview/download URLs acceptable immediately, or do we need a one-time redirect/compat layer?
6. Confirm future ingest naming policy:
   - slug-first paths by default, revision subpaths only when slug collisions occur.

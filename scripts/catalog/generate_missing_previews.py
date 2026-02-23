#!/usr/bin/env python3
"""Generate preview images for apps missing previews using OpenRouter image generation.

Uses Google Gemini 3 Pro Image via OpenRouter to generate stylized 16:9 preview
images based on each app's description, tags, and optional GLB model screenshot.

Outputs:
  catalog/media/{slug}/preview.png

Inputs:
  catalog/catalog.json                      (app list, filter has_preview=false)
  context/apps/*/manifest.json             (optional richer AI description + tags)
  v2/{slug}/*.json                          (blueprint — GLB model path)
  scripts/catalog/preview_prompt.txt        (prompt template, overridable via --prompt-file)
"""

from __future__ import annotations

import argparse
import base64
import json
import logging
import os
import random
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_ROOT = REPO_ROOT / "catalog"
CATALOG_DATA = CATALOG_ROOT / "catalog.json"
MEDIA_DIR = CATALOG_ROOT / "media"
DEFAULT_PROMPT_FILE = Path(__file__).resolve().parent / "preview_prompt.txt"

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_DEFAULT = "google/gemini-3-pro-image-preview"

SCREENSHOT_CMD = "screenshot-glb"
SCREENSHOT_ARGS = [
    "-w", "1024", "-h", "576", "-c", "#0c0c14",
    "-m", "camera-orbit=30deg 65deg auto&exposure=1.0&shadow-intensity=0.6&shadow-softness=1&environment-image=neutral",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# GLB resolution + screenshot
# ---------------------------------------------------------------------------

def _resolve_glb_ref(app_dir: Path, ref: str) -> Path | None:
    """Resolve a GLB asset reference to a filesystem path."""
    if not ref or not isinstance(ref, str) or not ref.endswith(".glb"):
        return None

    if ref.startswith("asset://"):
        glb_path = app_dir / "assets" / ref.removeprefix("asset://")
    elif ref.startswith("assets/"):
        glb_path = app_dir / ref
    else:
        glb_path = app_dir / ref

    return glb_path if glb_path.is_file() else None


def find_app_glbs(slug: str) -> tuple[Path | None, list[Path]]:
    """Find the main GLB and extra GLB models for an app.

    Returns (main_glb, extra_glbs) where extra_glbs are models/emotes from props.

    Supports two naming conventions:
      - v2/<slug>/blueprint.json  (newer)
      - v2/<slug>/<Name>.json     (older, any .json that isn't package.json)

    And two asset reference formats:
      - "assets/foo.glb"          (direct path)
      - "asset://hash.glb"        (content-addressed)
    """
    app_dir = REPO_ROOT / "v2" / slug
    if not app_dir.is_dir():
        return None, []

    # Find the blueprint JSON
    blueprint = None
    candidate = app_dir / "blueprint.json"
    if candidate.is_file():
        blueprint = read_json(candidate)
    else:
        for p in sorted(app_dir.glob("*.json")):
            if p.name == "package.json":
                continue
            blueprint = read_json(p)
            if blueprint and "model" in blueprint:
                break

    if not blueprint:
        return None, []

    # Main model
    main_glb = _resolve_glb_ref(app_dir, blueprint.get("model", ""))

    # Extra GLBs from props (type: "model" or "emote")
    extras: list[Path] = []
    seen = {main_glb} if main_glb else set()
    props = blueprint.get("props", {})
    if isinstance(props, dict):
        for val in props.values():
            if isinstance(val, dict) and val.get("type") in ("model", "emote"):
                url = val.get("url", "")
                glb = _resolve_glb_ref(app_dir, url)
                if glb and glb not in seen:
                    seen.add(glb)
                    extras.append(glb)

    return main_glb, extras


_screenshot_glb_available: bool | None = None


def screenshot_glb(glb_path: Path, output_path: Path) -> bool:
    """Run screenshot-glb to capture a PNG of the GLB model. Returns True on success."""
    global _screenshot_glb_available
    if _screenshot_glb_available is False:
        return False
    if not shutil.which(SCREENSHOT_CMD):
        if _screenshot_glb_available is None:
            print("  Note: screenshot-glb not found in PATH, using text-only prompts")
            _screenshot_glb_available = False
        return False
    _screenshot_glb_available = True

    cmd = [
        SCREENSHOT_CMD,
        "-i", str(glb_path),
        "-o", str(output_path),
        *SCREENSHOT_ARGS,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=60)
        return output_path.is_file() and output_path.stat().st_size > 0
    except subprocess.CalledProcessError as e:
        log.warning("screenshot-glb failed for %s: %s", glb_path.name, e.stderr.decode(errors="ignore")[:200])
        return False
    except Exception as e:
        log.warning("screenshot-glb error for %s: %s", glb_path.name, e)
        return False


MAX_EXTRA_SCREENSHOTS = 6  # cap extras to keep composite reasonable


def compose_glb_screenshots(
    main_png: Path,
    extra_pngs: list[Path],
    output_path: Path,
) -> bool:
    """Compose a main screenshot with smaller extras into a single image.

    Layout: main model fills most of the frame (top), extras are tiled as
    small thumbnails in a row along the bottom.  Background matches the
    dark catalog theme (#0c0c14).

    Returns True on success.
    """
    try:
        from PIL import Image
    except ImportError:
        log.warning("Pillow not installed, skipping composite (pip install Pillow)")
        return False

    try:
        BG = (12, 12, 20)  # #0c0c14
        CANVAS_W, CANVAS_H = 1024, 576  # 16:9

        main_img = Image.open(main_png).convert("RGB")

        if not extra_pngs:
            # No extras — just use main as-is
            main_img = main_img.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)
            main_img.save(output_path, "PNG")
            return True

        # Reserve bottom strip for extras
        THUMB_H = 120
        THUMB_PAD = 6
        STRIP_H = THUMB_H + THUMB_PAD * 2
        MAIN_H = CANVAS_H - STRIP_H

        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BG)

        # Main image — fit into top area
        main_img.thumbnail((CANVAS_W, MAIN_H), Image.LANCZOS)
        mx = (CANVAS_W - main_img.width) // 2
        my = (MAIN_H - main_img.height) // 2
        canvas.paste(main_img, (mx, my))

        # Extra thumbnails — evenly spaced along bottom strip
        n = len(extra_pngs)
        thumb_w = min(160, (CANVAS_W - THUMB_PAD * (n + 1)) // n)
        total_w = n * thumb_w + (n - 1) * THUMB_PAD
        start_x = (CANVAS_W - total_w) // 2
        y = MAIN_H + THUMB_PAD

        for i, ep in enumerate(extra_pngs):
            try:
                thumb = Image.open(ep).convert("RGB")
                thumb.thumbnail((thumb_w, THUMB_H), Image.LANCZOS)
                tx = start_x + i * (thumb_w + THUMB_PAD) + (thumb_w - thumb.width) // 2
                ty = y + (THUMB_H - thumb.height) // 2
                canvas.paste(thumb, (tx, ty))
            except Exception:
                continue

        canvas.save(output_path, "PNG")
        return True
    except Exception as e:
        log.warning("compose_glb_screenshots failed: %s", e)
        return False


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def load_prompt_template(path: Path) -> str:
    """Load prompt template from file."""
    return path.read_text(encoding="utf-8")


def build_prompt(template: str, name: str, description: str, tags: list[str], has_screenshot: bool) -> str:
    """Build the image generation prompt from template + app metadata."""
    tags_str = ", ".join(tags) if tags else "virtual world"

    if has_screenshot:
        screenshot_ref = (
            "The attached image shows screenshots of the 3D models from this app. "
            "The large image is the main model; smaller thumbnails below (if any) are "
            "additional parts like weapons, animations, or accessories. "
            "Use these as visual reference for shape, proportions, and style.\n\n"
        )
    else:
        screenshot_ref = ""

    return template.format(
        name=name,
        description=description,
        tags=tags_str,
        screenshot_ref=screenshot_ref,
    )


# ---------------------------------------------------------------------------
# OpenRouter API
# ---------------------------------------------------------------------------

def call_openrouter_image(
    prompt: str,
    api_key: str,
    model: str,
    max_retries: int,
    screenshot_b64: str | None = None,
) -> tuple[bytes, str]:
    """Call OpenRouter with an image generation prompt. Returns (image_bytes, ext).

    When screenshot_b64 is provided, sends a multimodal message with the
    screenshot as an image_url data URI alongside the text prompt.
    """
    site_url = os.environ.get("OPENROUTER_SITE_URL", "")
    site_name = os.environ.get("OPENROUTER_SITE_NAME", "hyperfy-apps")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if site_url:
        headers["HTTP-Referer"] = site_url
    if site_name:
        headers["X-Title"] = site_name

    # Build message content — multimodal if screenshot available
    if screenshot_b64:
        content: Any = [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{screenshot_b64}"}},
            {"type": "text", "text": prompt},
        ]
    else:
        content = prompt

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": content},
        ],
        "modalities": ["text", "image"],
    }

    body = json.dumps(payload).encode("utf-8")

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(
            OPENROUTER_URL, data=body, headers=headers, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                response = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in {429, 500, 502, 503, 504} and attempt < max_retries:
                sleep_s = min(30, (2 ** attempt) + random.random())
                time.sleep(sleep_s)
                continue
            detail = ""
            try:
                detail = e.read().decode("utf-8", errors="ignore")[:1000]
            except Exception:
                pass
            raise RuntimeError(f"OpenRouter HTTP {e.code}: {detail}")
        except Exception as e:
            if attempt < max_retries:
                sleep_s = min(30, (2 ** attempt) + random.random())
                time.sleep(sleep_s)
                continue
            raise RuntimeError(f"OpenRouter request failed: {e}")

        # Extract image from response
        choices = response.get("choices", [])
        if not choices:
            raise RuntimeError(f"No choices in response: {json.dumps(response)[:500]}")

        message = choices[0].get("message", {})

        def _extract_data_url(url: str) -> tuple[bytes, str]:
            """Extract bytes and mime type from a data: URL."""
            header, b64 = url.split(",", 1) if "," in url else ("", "")
            ext = "jpg" if "jpeg" in header else "png"
            return base64.b64decode(b64), ext

        # OpenRouter returns images in a top-level "images" field on the message
        images = message.get("images", [])
        if images:
            for img in images:
                if isinstance(img, dict) and img.get("type") == "image_url":
                    url = img.get("image_url", {}).get("url", "")
                    if url.startswith("data:"):
                        img_bytes, ext = _extract_data_url(url)
                        return img_bytes, ext

        # Fallback: check content as list of parts
        resp_content = message.get("content", "")
        if isinstance(resp_content, list):
            for part in resp_content:
                if isinstance(part, dict):
                    if part.get("type") == "image_url":
                        url = part.get("image_url", {}).get("url", "")
                        if url.startswith("data:"):
                            img_bytes, ext = _extract_data_url(url)
                            return img_bytes, ext
                    if "inline_data" in part:
                        b64 = part["inline_data"].get("data", "")
                        mime = part["inline_data"].get("mime_type", "")
                        ext = "jpg" if "jpeg" in mime else "png"
                        return base64.b64decode(b64), ext

        raise RuntimeError(
            f"Could not extract image from response: {json.dumps(response)[:500]}"
        )

    raise RuntimeError("Exhausted retries for image generation")  # pragma: no cover


# ---------------------------------------------------------------------------
# Per-app processing
# ---------------------------------------------------------------------------

def process_one(
    app: dict[str, Any],
    model: str,
    api_key: str,
    max_retries: int,
    force: bool,
    dry_run: bool,
    prompt_template: str,
    skip_screenshot: bool,
    tmp_dir: Path,
) -> dict[str, Any]:
    """Generate a preview image for one app."""
    slug = app.get("slug") or app.get("id")
    if not slug:
        raise RuntimeError("App row missing slug/id")
    app_id = app.get("id") or slug

    # Check for any existing generated preview in media/<slug>/preview.*
    existing = list((MEDIA_DIR / slug).glob("preview.*"))
    if existing and not force:
        return {"app_id": app_id, "status": "skipped_existing"}

    # Load manifest for richer context if available
    manifest_path = REPO_ROOT / "context" / "apps" / slug / "manifest.json"
    manifest = read_json(manifest_path)
    ai = (manifest or {}).get("ai", {})

    name = app.get("name", slug)
    description = ai.get("description") or app.get("description", "")
    tags = ai.get("feature_tags") or app.get("tags", [])

    # GLB screenshots
    main_glb, extra_glbs = find_app_glbs(slug) if not skip_screenshot else (None, [])
    extra_glbs = extra_glbs[:MAX_EXTRA_SCREENSHOTS]
    screenshot_b64: str | None = None
    glb_count = 0

    if main_glb:
        main_out = tmp_dir / f"{slug}-main.png"
        if screenshot_glb(main_glb, main_out):
            # Screenshot extras
            extra_outs: list[Path] = []
            for i, eglb in enumerate(extra_glbs):
                epath = tmp_dir / f"{slug}-extra-{i}.png"
                if screenshot_glb(eglb, epath):
                    extra_outs.append(epath)

            glb_count = 1 + len(extra_outs)

            if extra_outs:
                # Compose main + extras into single image
                composite_out = tmp_dir / f"{slug}-composite.png"
                if compose_glb_screenshots(main_out, extra_outs, composite_out):
                    screenshot_b64 = base64.b64encode(composite_out.read_bytes()).decode("ascii")
                else:
                    # Fallback to main only
                    screenshot_b64 = base64.b64encode(main_out.read_bytes()).decode("ascii")
            else:
                screenshot_b64 = base64.b64encode(main_out.read_bytes()).decode("ascii")

    prompt = build_prompt(prompt_template, name, description, tags, has_screenshot=screenshot_b64 is not None)

    if dry_run:
        return {
            "app_id": app_id,
            "status": "dry_run",
            "glb_main": str(main_glb) if main_glb else None,
            "glb_extras": len(extra_glbs),
            "has_screenshot": screenshot_b64 is not None,
            "glb_count": glb_count,
            "prompt": prompt,
        }

    img_bytes, ext = call_openrouter_image(prompt, api_key, model, max_retries, screenshot_b64)

    out_dir = MEDIA_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / f"preview.{ext}"
    output_path.write_bytes(img_bytes)

    size_kb = len(img_bytes) / 1024
    return {
        "app_id": app_id,
        "status": "ok",
        "path": str(output_path),
        "size_kb": round(size_kb, 1),
        "had_screenshot": screenshot_b64 is not None,
        "glb_count": glb_count,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate preview images for apps missing previews"
    )
    parser.add_argument("--model", default=MODEL_DEFAULT)
    parser.add_argument("--limit", type=int, help="Only process first N apps")
    parser.add_argument(
        "--app-id",
        action="append",
        dest="app_ids",
        help="Only process specific app_id (repeatable)",
    )
    parser.add_argument(
        "--force", action="store_true", help="Regenerate existing previews"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print prompts without generating"
    )
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument(
        "--prompt-file",
        type=Path,
        default=DEFAULT_PROMPT_FILE,
        help="Path to prompt template file (default: scripts/catalog/preview_prompt.txt)",
    )
    parser.add_argument(
        "--skip-screenshot",
        action="store_true",
        help="Skip GLB screenshot step, use text-only prompts",
    )
    parser.add_argument(
        "--app-id-file",
        type=Path,
        help="File with one app slug per line (blank lines and #comments ignored)",
    )

    args = parser.parse_args()

    logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")

    if not CATALOG_DATA.exists():
        print(f"Error: missing {CATALOG_DATA}")
        print("Run: uv run python scripts/catalog/build_explorer_data.py")
        return 1

    if not args.prompt_file.is_file():
        print(f"Error: prompt template not found: {args.prompt_file}")
        return 1

    prompt_template = load_prompt_template(args.prompt_file)

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not args.dry_run and not api_key:
        print("Error: OPENROUTER_API_KEY is required")
        return 1

    catalog = json.loads(CATALOG_DATA.read_text(encoding="utf-8"))
    all_apps = catalog.get("apps", [])

    # Merge --app-id and --app-id-file sources
    wanted_ids = list(args.app_ids or [])
    if args.app_id_file:
        if not args.app_id_file.is_file():
            print(f"Error: app ID file not found: {args.app_id_file}")
            return 1
        for line in args.app_id_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                wanted_ids.append(line)

    # Filter to specific app IDs if given
    if wanted_ids:
        wanted = set(wanted_ids)
        apps = [a for a in all_apps if (a.get("id") in wanted or a.get("slug") in wanted)]
    else:
        # Default: only apps missing previews
        apps = [a for a in all_apps if not a.get("has_preview")]

    if args.limit:
        apps = apps[: args.limit]

    print(f"Apps to generate previews for: {len(apps)}")
    print(f"Model: {args.model}")
    print(f"Prompt template: {args.prompt_file}")
    print(f"Skip screenshot: {args.skip_screenshot}")
    print(f"Dry run: {args.dry_run}")
    print(f"Output dir: {MEDIA_DIR}/<slug>/preview.*")

    if not apps:
        print("Nothing to do.")
        return 0

    started = time.time()
    results: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix="hyp-screenshots-") as tmp_str:
        tmp_dir = Path(tmp_str)

        with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as ex:
            futures = {
                ex.submit(
                    process_one,
                    app,
                    args.model,
                    api_key,
                    args.max_retries,
                    args.force,
                    args.dry_run,
                    prompt_template,
                    args.skip_screenshot,
                    tmp_dir,
                ): app
                for app in apps
            }

            total = len(futures)
            done_count = 0
            for fut in as_completed(futures):
                app = futures[fut]
                done_count += 1
                try:
                    res = fut.result()
                    results.append(res)
                    status = res["status"]
                    extra = ""
                    if status == "ok":
                        gc = res.get("glb_count", 0)
                        ss = f" +{gc} GLB{'s' if gc != 1 else ''}" if res.get("had_screenshot") else ""
                        extra = f" ({res.get('size_kb', 0)} KB{ss})"
                    elif status == "dry_run":
                        glb = res.get("glb_main") or "no GLB"
                        n_extra = res.get("glb_extras", 0)
                        gc = res.get("glb_count", 0)
                        ss = f"yes ({gc} GLB{'s' if gc != 1 else ''} composited)" if res.get("has_screenshot") else "no"
                        extra = (
                            f"\n    GLB main: {glb}"
                            f"\n    GLB extras: {n_extra}"
                            f"\n    Screenshot attached: {ss}"
                            f"\n    Prompt:\n{_indent(res['prompt'], 6)}"
                        )
                    print(f"  [{done_count}/{total}] {res['app_id']}: {status}{extra}")
                except Exception as e:
                    err = {"app_id": app.get("id") or app.get("slug"), "status": "failed", "error": str(e)}
                    results.append(err)
                    print(f"  [{done_count}/{total}] {app.get('id') or app.get('slug')}: FAILED - {e}")

    duration = round(time.time() - started, 2)
    counts = {
        "ok": sum(1 for r in results if r.get("status") == "ok"),
        "skipped_existing": sum(
            1 for r in results if r.get("status") == "skipped_existing"
        ),
        "dry_run": sum(1 for r in results if r.get("status") == "dry_run"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
    }

    print(f"\nDone in {duration}s")
    print(f"  Generated: {counts['ok']}")
    print(f"  Skipped (existing): {counts['skipped_existing']}")
    print(f"  Dry run: {counts['dry_run']}")
    print(f"  Failed: {counts['failed']}")

    if counts["failed"]:
        print("\nFailed apps:")
        for r in results:
            if r.get("status") == "failed":
                print(f"  {r['app_id']}: {r.get('error', 'unknown')}")

    return 0 if counts["failed"] == 0 else 1


def _indent(text: str, spaces: int) -> str:
    """Indent each line of text by the given number of spaces."""
    pad = " " * spaces
    return "\n".join(f"{pad}{line}" for line in text.splitlines())


if __name__ == "__main__":
    raise SystemExit(main())

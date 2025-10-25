#!/usr/bin/env python3
"""
preprocess_heroes.py

Run this script from your project root (where `src/` lives):
    cd <project-root>
    python preprocess_heroes.py

It will:
 - read hero images from src/assets/characters/
 - create hero_cache/<hero-id>/ with resized.png, mask.png, landmarks.npy, facecrop.png, meta.json
 - generate src/data/characters.generated.json (pretty)
 - overwrite src/data/characters.ts to import that JSON
"""

from pathlib import Path
import os
import sys
import json
import traceback
import math
import shutil
from typing import List, Tuple, Optional

# Configuration - change these if you want different sizes or paths
SRC_HERO_DIR = Path("src/assets/characters")  # input images
CACHE_ROOT = Path("hero_cache")               # output cache root
TS_DATA_DIR = Path("src/data")                # where characters.generated.json will be written
GENERATED_JSON = TS_DATA_DIR / "characters.generated.json"
CHARACTERS_TS = TS_DATA_DIR / "characters.ts"

WORK_W = 800   # working canvas width (resized hero)
WORK_H = 800   # working canvas height

# File names created inside each hero cache folder
FN_RESIZED = "resized.png"
FN_MASK = "mask.png"
FN_LANDMARKS = "landmarks.npy"
FN_FACECROP = "facecrop.png"
FN_META = "meta.json"

ALLOWED_EXT = [".png", ".jpg", ".jpeg"]

# Helper utilities
def safe_slug(name: str) -> str:
    """
    Convert a filename or title into a lowercase-hyphen id.
    E.g. "Captain America.png" -> "captain-america"
    """
    s = Path(name).stem
    s = s.strip()
    # replace spaces/underscores with hyphens, remove duplicate hyphens
    s = s.replace("_", " ").replace(".", " ").strip()
    parts = [p for p in s.split() if p]
    slug = "-".join(parts).lower()
    # remove characters other than alnum and hyphen
    slug = "".join([c for c in slug if c.isalnum() or c == "-"])
    slug = "-".join([p for p in slug.split("-") if p])
    return slug

def pretty_name_from_filename(fname: str) -> str:
    """
    Convert a filename stem to a human-friendly title case name.
    E.g. 'captain-america' -> 'Captain America'
    """
    s = Path(fname).stem
    # replace hyphens/underscores with spaces, reduce multiple spaces
    s = s.replace("_", " ").replace("-", " ")
    parts = [p for p in s.split() if p]
    return " ".join([p.capitalize() for p in parts])

def ensure_dirs():
    if not SRC_HERO_DIR.exists():
        print(f"ERROR: source hero directory not found: {SRC_HERO_DIR.resolve()}")
        sys.exit(1)
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    TS_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Core image processing
import cv2
import numpy as np
import mediapipe as mp

# Initialize MediaPipe Face Mesh (static image mode is fine for preprocessing)
mp_face_mesh = mp.solutions.face_mesh
_face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True,
                                   max_num_faces=1,
                                   refine_landmarks=True,
                                   min_detection_confidence=0.5)

def detect_landmarks_mediapipe(img: np.ndarray) -> Optional[List[Tuple[int,int]]]:
    """
    Run MediaPipe FaceMesh on an image and return list of (x,y) landmark tuples in pixel coords.
    Returns None if no face found.
    """
    if img is None:
        return None
    h, w = img.shape[:2]
    # MediaPipe expects RGB
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = _face_mesh.process(rgb)
    if not results.multi_face_landmarks:
        return None
    lm = results.multi_face_landmarks[0].landmark
    pts = [(int(p.x * w), int(p.y * h)) for p in lm]
    return pts

def make_face_mask(points: List[Tuple[int,int]], size: Tuple[int,int]) -> np.ndarray:
    """
    Build a soft mask for the face region given landmarks and canvas size (width, height).
    Returns a single-channel uint8 mask (0..255).
    """
    W, H = size
    mask = np.zeros((H, W), dtype=np.uint8)
    if not points or len(points) == 0:
        return mask
    arr = np.array(points, dtype=np.int32)
    try:
        hull = cv2.convexHull(arr)
    except Exception:
        hull = arr
    cv2.fillConvexPoly(mask, hull, 255)
    # Blur to soften edges (kernel size based on image)
    k = max(15, int(min(W, H) / 40))
    k = k if k % 2 == 1 else k + 1
    mask = cv2.GaussianBlur(mask, (k, k), 0)
    return mask

def scale_and_center_crop(img: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    """
    Resize the image by scale-to-cover and center-crop to target size.
    (This ensures full coverage of the canvas.)
    """
    h, w = img.shape[:2]
    if w == 0 or h == 0:
        raise ValueError("Invalid image dimensions")
    scale = max(target_w / w, target_h / h)
    new_w = int(math.ceil(w * scale))
    new_h = int(math.ceil(h * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    x0 = max(0, (new_w - target_w) // 2)
    y0 = max(0, (new_h - target_h) // 2)
    cropped = resized[y0:y0+target_h, x0:x0+target_w].copy()
    return cropped

def fit_and_pad(img: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    """
    Resize the image to fit inside the target and pad with black so it's centered.
    Used as an alternate attempt when face is small in full-body images.
    """
    h, w = img.shape[:2]
    scale = min(target_w / w, target_h / h)
    new_w = max(1, int(math.floor(w * scale)))
    new_h = max(1, int(math.floor(h * scale)))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
    xoff = (target_w - new_w) // 2
    yoff = (target_h - new_h) // 2
    canvas[yoff:yoff+new_h, xoff:xoff+new_w] = resized
    return canvas

def save_np(path: Path, arr: np.ndarray):
    np.save(str(path), arr)

def process_single_hero(img_path: Path, cache_root: Path, work_w: int, work_h: int) -> dict:
    """
    Process a single hero image:
      - create cache dir hero_cache/<id>/
      - write resized.png, mask.png, landmarks.npy, facecrop.png, meta.json
    Returns a dict summary for this hero (for generating characters.generated.json).
    """
    hero_id = safe_slug(img_path.name)
    hero_name = pretty_name_from_filename(img_path.name)
    cache_dir = cache_root / hero_id
    cache_dir.mkdir(parents=True, exist_ok=True)

    out_resized = cache_dir / FN_RESIZED
    out_mask = cache_dir / FN_MASK
    out_landmarks = cache_dir / FN_LANDMARKS
    out_facecrop = cache_dir / FN_FACECROP
    out_meta = cache_dir / FN_META

    # If meta exists and indicates processed, skip (idempotent)
    if out_meta.exists():
        try:
            with open(out_meta, "r") as f:
                meta_existing = json.load(f)
            # If processed and face_found present, treat as cached
            if meta_existing.get("processed", False):
                return {
                    "id": hero_id,
                    "name": hero_name,
                    "cached": True,
                    "face_found": meta_existing.get("face_found", False)
                }
        except Exception:
            pass

    img = cv2.imread(str(img_path))
    if img is None:
        # write minimal meta
        meta = {"hero": hero_name, "id": hero_id, "processed": True, "face_found": False, "error": "cannot_read"}
        with open(out_meta, "w") as f:
            json.dump(meta, f, indent=2)
        return {"id": hero_id, "name": hero_name, "cached": False, "face_found": False, "error": "cannot_read"}

    try:
        # Primary attempt: scale and center-crop to WORK size
        canvas = scale_and_center_crop(img, work_w, work_h)
        cv2.imwrite(str(out_resized), canvas)

        points = detect_landmarks_mediapipe(canvas)
        if points is None:
            # Secondary attempt: fit-and-pad (helpful for full-body images)
            canvas2 = fit_and_pad(img, work_w, work_h)
            cv2.imwrite(str(out_resized), canvas2)
            points = detect_landmarks_mediapipe(canvas2)
            canvas = canvas2  # use this as resized canvas if found or not

        if points is None:
            # No landmarks found => create minimal cache entries and mark disabled
            save_np(out_landmarks, np.array([]))
            cv2.imwrite(str(out_mask), np.zeros((work_h, work_w), dtype=np.uint8))
            cv2.imwrite(str(out_facecrop), np.zeros((200,200,3), dtype=np.uint8))
            meta = {
                "hero": hero_name,
                "id": hero_id,
                "processed": True,
                "face_found": False,
                "resized": str(out_resized.name)
            }
            with open(out_meta, "w") as f:
                json.dump(meta, f, indent=2)
            return {"id": hero_id, "name": hero_name, "cached": False, "face_found": False}

        # Make mask and crop bbox
        mask = make_face_mask(points, (work_w, work_h))
        ys, xs = np.where(mask > 10)
        if len(xs) == 0 or len(ys) == 0:
            # no valid mask area
            save_np(out_landmarks, np.array([]))
            cv2.imwrite(str(out_mask), mask)
            cv2.imwrite(str(out_facecrop), np.zeros((200,200,3), dtype=np.uint8))
            meta = {"hero": hero_name, "id": hero_id, "processed": True, "face_found": False}
            with open(out_meta, "w") as f:
                json.dump(meta, f, indent=2)
            return {"id": hero_id, "name": hero_name, "cached": False, "face_found": False}

        x1, x2 = int(xs.min()), int(xs.max())
        y1, y2 = int(ys.min()), int(ys.max())
        pad = int(max(20, min((x2-x1)//6, (y2-y1)//6)))
        x1 = max(0, x1 - pad)
        y1 = max(0, y1 - pad)
        x2 = min(work_w-1, x2 + pad)
        y2 = min(work_h-1, y2 + pad)
        face_crop = canvas[y1:y2, x1:x2].copy()

        # Save artifacts
        save_np(out_landmarks, np.array(points))
        cv2.imwrite(str(out_mask), mask)
        cv2.imwrite(str(out_facecrop), face_crop)

        meta = {
            "hero": hero_name,
            "id": hero_id,
            "processed": True,
            "face_found": True,
            "work_size": [work_w, work_h],
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "resized": str(out_resized.name)
        }
        with open(out_meta, "w") as f:
            json.dump(meta, f, indent=2)

        return {"id": hero_id, "name": hero_name, "cached": False, "face_found": True}
    except Exception as e:
        # On unexpected error, write error meta and continue
        meta = {"hero": hero_name, "id": hero_id, "processed": True, "face_found": False, "error": str(e)}
        with open(out_meta, "w") as f:
            json.dump(meta, f, indent=2)
        return {"id": hero_id, "name": hero_name, "cached": False, "face_found": False, "error": str(e)}

def run_batch():
    print(f"\n=== Marvel Heroes Preprocess ===")
    print(f"Images dir: {SRC_HERO_DIR.resolve()}")
    print(f"Cache dir : {CACHE_ROOT.resolve()}")
    print("Scanning...\n")

    img_files = []
    for e in ALLOWED_EXT:
        img_files.extend(SRC_HERO_DIR.glob(f"*{e}"))
    img_files = sorted(img_files)
    if not img_files:
        print("No hero images found. Exiting.")
        return

    summaries = []
    for i, p in enumerate(img_files, 1):
        print(f"[{i}/{len(img_files)}] {p.name}")
        s = process_single_hero(p, CACHE_ROOT, WORK_W, WORK_H)
        summaries.append(s)

    # Write characters.generated.json
    out_json = GENERATED_JSON
    with open(out_json, "w") as f:
        json.dump(summaries, f, indent=2)

    print(f"\nWrote generated json → {out_json}")

    # Overwrite characters.ts
    chars_ts = CHARACTERS_TS
    content_ts = (
        "// AUTO-GENERATED by preprocess_heroes.py — do not edit manually\n"
        "import data from './characters.generated.json';\n\n"
        "export const characters = data;\n"
        "export type Character = typeof characters[number];\n"
    )
    with open(chars_ts, "w", encoding="utf-8") as f:
        f.write(content_ts)

    print(f"Overwrote → {chars_ts}")
    print("\n=== DONE ===")

if __name__ == "__main__":
    try:
        ensure_dirs()
        run_batch()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        traceback.print_exc()
        sys.exit(1)

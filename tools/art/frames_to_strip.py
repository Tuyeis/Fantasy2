"""Video frames -> looping, background-free, feet-aligned sprite strip.

usage: frames_to_strip.py <frames_dir> <out_png> [min_len] [max_len] [height]
"""
import glob
import json
import re
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove


def load(folder):
    files = sorted(glob.glob(folder + "/*.png"), key=lambda f: int(re.findall(r"(\d+)\.png$", f)[0]))
    return [Image.open(f).convert("RGB") for f in files]


def best_loop(frames, min_len, max_len, skip_start=4):
    small = [np.asarray(f.resize((96, 132)), np.float32) for f in frames]
    best = None
    for i in range(skip_start, len(frames)):
        for j in range(i + min_len, min(len(frames), i + max_len + 1)):
            d = float(np.mean((small[i] - small[j]) ** 2))
            if best is None or d < best[0]:
                best = (d, i, j)
    return best


def main(folder, out_png, min_len=12, max_len=28, height=256):
    frames = load(folder)
    d, i, j = best_loop(frames, min_len, max_len)
    loop = frames[i:j]
    print(f"loop frames {i}..{j} ({j - i} frames), seam error {d:.1f}")
    session = new_session("isnet-anime")
    cut = []
    for f in loop:
        arr = np.array(remove(f, session=session)).astype(np.float32)
        a = arr[:, :, 3]
        a[a < 40] = 0
        arr[:, :, 3] = np.clip((a - 40) / 175 * 255, 0, 255)
        cut.append(Image.fromarray(arr.astype(np.uint8)))
    # Align: feet (lowest opaque row) on a common baseline, horizontal centre of the body mass.
    boxes = [c.getbbox() for c in cut]
    centers = []
    for c in cut:
        a = np.array(c)[:, :, 3] > 0
        xs = np.nonzero(a.any(axis=0))[0]
        cols = a.sum(axis=0)
        centers.append(float((np.arange(a.shape[1]) * cols).sum() / max(1, cols.sum())))
    body_h = max(b[3] - b[1] for b in boxes)
    body_w = max(b[2] - b[0] for b in boxes)
    cell_w = int(body_w * 1.25)
    cell_h = int(body_h * 1.08)
    cells = []
    for c, b, cx in zip(cut, boxes, centers):
        cell = Image.new("RGBA", (cell_w, cell_h))
        ox = int(cell_w / 2 - cx)
        oy = cell_h - b[3] - 2
        cell.alpha_composite(c, (max(-c.width, ox), oy)) if ox >= 0 and oy >= 0 else cell.paste(c, (ox, oy), c)
        cells.append(cell)
    scale = height / cell_h
    cw = round(cell_w * scale)
    strip = Image.new("RGBA", (cw * len(cells), height))
    for k, cell in enumerate(cells):
        strip.paste(cell.resize((cw, height), Image.LANCZOS), (k * cw, 0))
    strip.save(out_png)
    json.dump({"frames": len(cells), "frameWidth": cw, "frameHeight": height}, open(out_png.replace(".png", ".json"), "w"))
    print("strip", strip.size)


if __name__ == "__main__":
    args = sys.argv[1:]
    main(args[0], args[1], *(int(a) for a in args[2:]))

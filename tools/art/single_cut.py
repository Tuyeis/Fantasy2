"""Single-sprite monsters: background removal, main piece only, flipped to face LEFT (towards the hero), scaled.

usage: single_cut.py <key> <src.png> <out_dir> <height> <facing: left|right|front> <anim>
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from weapon_cut import cutout

key, src, out_dir, height, facing, anim = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5], sys.argv[6]
arr = cutout(src)
solid = arr[:, :, 3] > 40
lab, n = ndimage.label(solid)
if n > 1:
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    near = ndimage.binary_dilation(main, iterations=10)
    keep = np.unique(lab[near & solid]); keep = keep[keep > 0]
    # small detached bits (sparkles, spores, drops) further away than 10 px are dropped
    arr[~np.isin(lab, keep), 3] = 0
# drop a flat ground shadow/puddle? keep it: slimes stand in their own puddle
img = Image.fromarray(arr.astype(np.uint8))
img = img.crop(img.getbbox())
if facing == "right":
    img = img.transpose(Image.FLIP_LEFT_RIGHT)
s = height / img.height
img = img.resize((max(1, round(img.width * s)), height), Image.LANCZOS)
os.makedirs(out_dir, exist_ok=True)
img.save(os.path.join(out_dir, key + ".png"))
a = np.array(img)[:, :, 3] > 40
cols = np.nonzero(a[-max(3, height // 12):].any(axis=0))[0]           # feet: footprint of the lowest rows
meta = {"key": key, "w": img.width, "h": img.height, "anim": anim, "footX": float(cols.mean()) if len(cols) else img.width / 2}
json.dump(meta, open(os.path.join(out_dir, key + ".json"), "w"))
print(meta)

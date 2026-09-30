"""Fill holes of an already cut torso part (rows narrower than their neighbours) by vertical colour interpolation.

usage: patch_holes.py <torso.png> [more.png ...]   (writes in place, keeps a .bak.png copy)
"""
import shutil
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def patch(path):
    im = np.array(Image.open(path).convert("RGBA")).astype(np.float32)
    a = im[:, :, 3] > 200
    h, w = a.shape
    lo = np.full(h, np.nan); hi = np.full(h, np.nan)
    for y in range(h):
        xs = np.nonzero(a[y])[0]
        if len(xs):
            lo[y], hi[y] = xs.min(), xs.max()
    # expected span: median of the neighbouring rows
    todo = np.zeros_like(a)
    for y in range(h):
        win = slice(max(0, y - 14), min(h, y + 15))
        mlo, mhi = np.nanmedian(lo[win]), np.nanmedian(hi[win])
        if np.isnan(mlo):
            continue
        l = int(min(mlo, lo[y])) if not np.isnan(lo[y]) else int(mlo)
        r = int(max(mhi, hi[y])) if not np.isnan(hi[y]) else int(mhi)
        todo[y, l:r + 1] = ~a[y, l:r + 1]
    # also inner holes
    todo |= ndimage.binary_fill_holes(a) & ~a
    out = im.copy()
    for x in range(w):
        col = a[:, x]
        for y in np.nonzero(todo[:, x])[0]:
            up = np.nonzero(col[max(0, y - 30):y])[0]
            dn = np.nonzero(col[y + 1:y + 31])[0]
            cu = im[max(0, y - 30) + up[-1], x, :3] if len(up) else None
            cd = im[y + 1 + dn[0], x, :3] if len(dn) else None
            if cu is None and cd is None:
                continue
            if cu is None:
                c = cd
            elif cd is None:
                c = cu
            else:
                du, dd = len(col[max(0, y - 30):y]) - up[-1], dn[0] + 1
                c = (cu * dd + cd * du) / (du + dd)
            out[y, x, :3] = c; out[y, x, 3] = 255
    n = int(todo.sum())
    shutil.copy(path, path.replace(".png", ".bak.png"))
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(path)
    print(path, "filled", n)


for p in sys.argv[1:]:
    patch(p)

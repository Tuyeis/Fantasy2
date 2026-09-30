"""Cut each building of the village picture (SAM inside its hand outline) into an occluder sprite + finalize layout."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import sam_util
OUT = "C:/VScodeProjects/fantasy-rpg-web/public/art/town/village/"
os.makedirs(OUT, exist_ok=True)
L = json.load(open("village_layout.json"))
img = Image.open("village/y_503_0.png").convert("RGB"); a = np.array(img)
H, W = a.shape[:2]
items = [(k, b) for k, b in L["buildings"].items() if b["body"]] + [(f"decor{i}", b) for i, b in enumerate(L["decor"])]
occ = []
for name, b in items:
    poly = Image.new("L", (W, H), 0); ImageDraw.Draw(poly).polygon([tuple(p) for p in b["body"]], fill=255)
    region = np.array(poly) > 0
    region_d = ndimage.binary_dilation(region, iterations=10)
    ys, xs = np.nonzero(region)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pos = [[(x0 + x1) / 2, y0 + (y1 - y0) * 0.3], [(x0 + x1) / 2, y0 + (y1 - y0) * 0.6], [x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.5], [x0 + (x1 - x0) * 0.7, y0 + (y1 - y0) * 0.5]]
    pos = [p for p in pos if region[int(p[1]), int(p[0])]]
    neg = [[x0 - 15, y1 + 12], [x1 + 15, y1 + 12], [(x0 + x1) / 2, y1 + 25]]
    neg = [[min(W - 1, max(0, p[0])), min(H - 1, max(0, p[1]))] for p in neg]
    m, s = sam_util.segment(a, pos, neg, area_range=(region.sum() * 0.4, region.sum() * 1.3), silhouette=region_d)
    m = ndimage.binary_closing(m, iterations=3); m = ndimage.binary_fill_holes(m) & region_d
    # never occlude below the wall base (the hero standing in front must stay visible)
    m[b["base"] + 4:, :] = False
    ys, xs = np.nonzero(m); bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    alpha = (ndimage.gaussian_filter(m.astype(np.float32), 0.8) * 255).astype(np.uint8)
    rgba = np.dstack([a, alpha])[by0:by1, bx0:bx1]
    f = f"occ_{name}.png"; Image.fromarray(rgba).save(OUT + f)
    occ.append({"file": "art/town/village/" + f, "x": int(bx0), "y": int(by0), "base": b["base"]})
    print(name, round(s, 3), round(m.sum() / region.sum(), 2))
L["occluders"] = occ
img.save(OUT + "village.jpg", quality=92)
for b in L["buildings"].values():
    b.pop("body", None)
for b in L["decor"]:
    b.pop("body", None)
json.dump(L, open(OUT + "village.json", "w"), indent=1)
print("written")

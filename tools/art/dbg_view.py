"""dbg_view.py sheet view out.png [hints-json]"""
import sys, json; sys.path.insert(0, ".")
import numpy as np, sheet_cut2 as c2
from PIL import Image, ImageDraw
figs = c2.split_figures(Image.open(sys.argv[1]).convert('RGB'))
arr, mask, _ = figs[sys.argv[2]]
hints = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
part, names, j, meta = c2.cut_front_sam(arr, mask, hints)
pal = np.array([[0,0,0],[90,90,90],[255,80,80],[80,200,255],[80,120,255],[120,255,120],[60,180,60],[255,170,40]], np.uint8)
im = Image.fromarray(pal[(part + 1).clip(0, 7)]).convert("RGB")
src = Image.fromarray(arr[:, :, :3].astype(np.uint8))
out = Image.blend(src, im, 0.55); d = ImageDraw.Draw(out)
for y in range(0, out.height, 100): d.line([(0, y), (15, y)], fill=(255, 255, 0)); d.text((18, y - 6), str(y), fill=(255, 255, 0))
for x in range(0, out.width, 100): d.line([(x, 0), (x, 15)], fill=(255, 255, 0)); d.text((x + 2, 16), str(x), fill=(255, 255, 0))
out.save(sys.argv[3]); print(meta)

"""dbg_crop.py sheet view out.png -> view crop with a coordinate grid (view-local coords as used by the cutter)."""
import sys; sys.path.insert(0, ".")
import numpy as np, sheet_cut2 as c2
from PIL import Image, ImageDraw
figs = c2.split_figures(Image.open(sys.argv[1]).convert('RGB'))
arr, mask, _ = figs[sys.argv[2]]
out = Image.fromarray(arr[:, :, :3].astype(np.uint8)).convert("RGB"); d = ImageDraw.Draw(out)
for y in range(0, out.height, 50): d.line([(0, y), (out.width, y)], fill=(255, 255, 0) if y % 100 == 0 else (120, 120, 0)); d.text((2, y + 1), str(y), fill=(255, 0, 0))
for x in range(0, out.width, 50): d.line([(x, 0), (x, out.height)], fill=(255, 255, 0) if x % 100 == 0 else (120, 120, 0)); d.text((x + 2, 2), str(x), fill=(255, 0, 0))
out.save(sys.argv[3])

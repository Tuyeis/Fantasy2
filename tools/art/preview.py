import sys
from PIL import Image
import numpy as np
files = sys.argv[2:]
out = sys.argv[1]
ims = []
for f in files:
    im = Image.open(f).convert("RGBA")
    a = np.array(im)[:, :, 3]
    print(f, "alpha>0:", (a > 0).mean().round(3), "alpha 1..200:", ((a > 0) & (a < 200)).mean().round(3))
    bg = Image.new("RGBA", im.size, (40, 30, 55, 255))
    bg.alpha_composite(im)
    bg.thumbnail((500, 700))
    ims.append(bg)
W = sum(i.width for i in ims) + 10 * len(ims)
H = max(i.height for i in ims)
sheet = Image.new("RGB", (W, H), (20, 20, 20))
x = 0
for i in ims:
    sheet.paste(i, (x, 0)); x += i.width + 10
sheet.save(out)

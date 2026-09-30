"""grid.py out.png w file1 file2 ... -> 2-column contact sheet, each image scaled to width w, labelled."""
import sys
from PIL import Image, ImageDraw
out, w = sys.argv[1], int(sys.argv[2]); files = sys.argv[3:]
ims = [Image.open(f).convert("RGB") for f in files]
ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
cols = 2 if ims[0].width > ims[0].height else 4
h = max(im.height for im in ims)
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (cols * w, rows * h), (30, 30, 30)); d = ImageDraw.Draw(S)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * w, (i // cols) * h
    S.paste(im, (x, y)); d.text((x + 6, y + 4), f.replace("\\", "/").split("/")[-2] + "/" + f.replace("\\", "/").split("/")[-1], fill=(255, 0, 0))
S.save(out)

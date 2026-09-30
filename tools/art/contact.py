import sys, glob, re
from PIL import Image
folder, out, step = sys.argv[1], sys.argv[2], int(sys.argv[3])
files = sorted(glob.glob(folder + "/*.png"), key=lambda f: int(re.findall(r"(\d+)\.png$", f)[0]))
sel = files[::step]
ims = [Image.open(f).convert("RGB") for f in sel]
w, h = ims[0].size
tw, th = w // 2, h // 2
cols = 7
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
for i, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
sheet.save(out)
print(len(files), "frames ->", len(sel))

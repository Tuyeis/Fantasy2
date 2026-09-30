import sys, os
from PIL import Image
folder = sys.argv[1]
ims = []
for s in (101, 202, 303, 404):
    f = os.path.join(folder, f"sheet_{s}_0.png")
    ims.append(Image.open(f).convert("RGB").resize((768, 512)) if os.path.exists(f) else Image.new("RGB", (768, 512)))
sheet = Image.new("RGB", (1536, 1024))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % 2) * 768, (i // 2) * 512))
sheet.save(os.path.join(folder, "all.png"))

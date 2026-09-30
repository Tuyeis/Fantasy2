import json, sys
sys.path.insert(0, ".")
import numpy as np
from PIL import Image, ImageFilter
from comfy_client import repaint, upload_image
sheet_path = "turn2/sheet_202_0.png"
sheet = Image.open(sheet_path).convert("RGB")
rig = json.load(open("cut_novice/back/rig.json"))
head = next(p for p in rig["parts"] if p["name"] == "head")
hw, hh = Image.open("cut_novice/back/head.png").size
scale = 0.5
third = sheet.width // 3
x0 = int(head["x"] / scale) + 2 * third - 12
y0 = int(head["y"] / scale) - 12
x1 = int((head["x"] + hw) / scale) + 2 * third + 12
y1 = int((head["y"] + hh) / scale) - 10          # stop above the collar so the neck join stays
mask = Image.new("L", sheet.size, 0)
m = np.array(mask); m[y0:y1, x0:x1] = 255
mask = Image.fromarray(m).filter(ImageFilter.GaussianBlur(10)).convert("RGB")
mask.save("turn2/back_head_mask.png")
img_name = upload_image(sheet_path); mask_name = upload_image("turn2/back_head_mask.png")
prompt = ("character sheet, turnaround, three views of the same character, back view of the head, chibi boy, messy brown hair seen from behind, "
          "both ears visible on both sides of the head, symmetrical head, clean lineart, cel shading, white background")
for denoise in (0.55, 0.7):
    files = repaint(img_name, mask_name, prompt, "turn2", f"backfix_{int(denoise*100)}", seed=31, denoise=denoise, batch=3)
    print(denoise, files, flush=True)

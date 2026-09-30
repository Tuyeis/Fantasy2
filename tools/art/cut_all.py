import sys, os, traceback
sys.path.insert(0, ".")
import numpy as np
from PIL import Image
import sheet_cut
PICKS = {"swordsman": 404, "mage": 101, "wukong": 101, "cat": 101, "knight": 101, "dark_witch": 101, "mageB": 404, "dark_witchB": 404}
only = sys.argv[1:] or list(PICKS)
for key in only:
    seed = PICKS[key]
    try:
        sheet_cut.main(f"turn_{key.rstrip('B')}/sheet_{seed}_0.png", f"cut_{key}", "auto", 0.5)
        ims = [Image.open(f"cut_{key}/{v}/_partition.png").convert("RGB") for v in ("front", "side", "back")]
        w = sum(i.width for i in ims); h = max(i.height for i in ims)
        s = Image.new("RGB", (w, h)); x = 0
        for i in ims: s.paste(i, (x, 0)); x += i.width
        s.resize((w // 3, h // 3)).save(f"shots/part_{key}.png")
        print(key, "OK", flush=True)
    except Exception as e:
        print(key, "FAILED", repr(e), flush=True)
        traceback.print_exc()

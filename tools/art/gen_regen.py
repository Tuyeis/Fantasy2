"""Regenerate sheets whose views overlapped or failed: smaller figures (TA_SCALE) and extra negatives."""
import os, subprocess, sys
PY = sys.executable
SEEDS = "505,606,707,808"
JOBS = {
    "mon_lich": ("lich, undead sorcerer, skull face with glowing green eyes, dark purple hooded robe with gold trim, bony hands, golden necklace, monster", "floating objects, fireballs, orbs, sparkles, dark background"),
    "mon_fire_imp": ("fire imp, small red demon, red skin, small black horns, short spiky orange hair, yellow eyes, pointy tail with an arrow tip, black shorts, mischievous grin, monster", "fire, flames, sparks, embers, dark background"),
    "mon_void_sovereign": ("1boy, dark demon lord, pale grey skin, black hair, crown of black crystal spikes, glowing violet eyes, black and violet plate armor, short dark cape, armored gauntlets, armored boots, monster, final boss", "nude, dark background, long cape covering the body, floating objects"),
    "mon_skeleton": ("skeleton warrior, skull head, glowing blue eye sockets, white bones, ribcage, small rusty iron helmet, torn dark red cloth around the waist, bony arms and legs, undead, monster", "big helmet, dark background"),
    "turn_elf4": ("1girl, elf girl, blonde hair tied in a short high ponytail, pointy elf ears, green eyes, green tunic with leaf embroidery, brown belt, brown shorts, brown knee-high boots, no cape", "long hair, dark background"),
    "turn_dark_witch2": ("1girl, witch girl, purple hair tied in a braid, small black witch hat with purple ribbon, black dress reaching the knees, purple striped stockings, black boots, no cape", "big hat, wide hat brim, long loose hair, dark background"),
    "turn_cat2": ("1boy, cat boy, orange hair, orange cat ears, orange cat tail, green eyes, black sleeveless ninja vest, grey shorts, dark wrappings on the legs, black shoes, no cape", "extra head, floating head, dark background"),
}
only = sys.argv[1:] or list(JOBS)
for out in only:
    desc, neg = JOBS[out]
    print("==", out, flush=True)
    env = dict(os.environ, TA_SCALE="0.76", EXTRA_NEG=neg)
    seeds = ",".join(sd for sd in SEEDS.split(",") if not os.path.exists(f"{out}/sheet_{sd}_0.png"))
    if seeds:
        subprocess.run([PY, "turnaround_open.py", out, desc, seeds], check=False, env=env)
if os.environ.get("SKIP_BOW"):
    sys.exit(0)
# a clean elf bow (no scenery, single string)
sys.path.insert(0, ".")
from comfy_client import dream
files = dream("a single elegant elven longbow standing vertically, pale wood with green leaf carvings, one thin string, no arrow, "
              "2d game item asset, bold black outline, flat cel shading, anime game art style, centered, isolated on a plain white background",
              "weapons", "elf_bow2", negative="tree, forest, scenery, landscape, person, hand, character, multiple objects, text, watermark, shadow, 3d render, photo, frame, double string",
              seed=77, width=768, height=1344, batch=4)
print("elf_bow2", files, flush=True)
print("ALL DONE", flush=True)

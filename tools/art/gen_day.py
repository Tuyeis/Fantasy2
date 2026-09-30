"""Day batch: town props + ground textures, remaining creatures, sheet regenerations. Sequential (one GPU)."""
import os, subprocess, sys
sys.path.insert(0, ".")
from comfy_client import dream, pony
import gen_town, gen_monsters

PY = sys.executable
# 1. town props and textures
for key in ["p_pine", "p_bush", "p_flower_bush", "p_lamp", "p_fountain", "t_grass", "t_path", "t_plaza", "t_water"]:
    prompt, neg, w, h = gen_town.JOBS[key]
    print(key, dream(prompt, "town", key, negative=neg, seed=41, width=w, height=h, batch=4), flush=True)
# 2. spider with DreamShaper (Pony cannot draw eight legs)
files = dream("a cute but dangerous giant spider monster, side view facing left, black and purple round body, eight thin legs, "
              "many small red eyes, small fangs, chibi, 2d game monster sprite, anime game art style, bold black outline, flat cel shading, "
              "isolated on a plain white background, centered, whole body visible",
              "mon_giant_spider", "dream", negative="person, human, text, watermark, frame, scenery, background, web, 3d render, photo",
              seed=61, width=1024, height=1024, batch=4)
print("giant_spider", files, flush=True)
# 3. remaining single creatures (Pony)
for key in ["harpy", "golem", "wraith", "fire_drake", "frost_hydra"]:
    out = "mon_" + key
    os.makedirs(out, exist_ok=True)
    for seed in (101, 202, 303, 404):
        if os.path.exists(f"{out}/single_{seed}_0.png"):
            continue
        neg = "multiple views, character sheet, text, frame, extra character" if key == "harpy" else \
              "multiple views, character sheet, front view, back view, human, 1boy, 1girl, text, speech bubble, frame, extra character"
        print(key, seed, pony(gen_monsters.SINGLE_PROMPT.format(d=gen_monsters.SINGLE[key]), out, f"single_{seed}", seed=seed,
                              width=1024, height=1024, extra_neg=neg), flush=True)
# 4. sheet regenerations
subprocess.run([PY, "gen_regen.py", "mon_void_sovereign", "turn_elf4", "turn_dark_witch2", "turn_cat2"], check=False)
print("DAY DONE", flush=True)

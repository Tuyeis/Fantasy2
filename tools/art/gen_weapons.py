import sys
sys.path.insert(0, ".")
from comfy_client import dream
STYLE = ("2d game item asset, bold black outline, flat cel shading, anime game art style, centered, isolated on a plain white background")
NEG = "person, hand, character, multiple objects, text, watermark, shadow, 3d render, photo, frame, background scenery"
JOBS = {
    "steel_sword": "a single steel longsword standing vertically with the tip down, silver blade, red leather grip, golden cross guard, round pommel",
    "vampire_dagger": "a single ornate dagger standing vertically with the tip down, curved dark silver blade, black grip, crimson gem on the guard",
    "dark_bow": "a single dark recurve bow standing vertically, black and purple wood, silver tips, taut white string, no arrow",
}
for key, desc in JOBS.items():
    files = dream(desc + ", " + STYLE, "weapons", key, negative=NEG, seed=21, width=768, height=1344, batch=4)
    print(key, files, flush=True)

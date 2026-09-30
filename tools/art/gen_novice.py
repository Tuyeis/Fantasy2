import sys, time
sys.path.insert(0, ".")
from comfy_client import pony
t = time.time()
files = pony("1boy, solo, chibi, young adventurer, brown messy hair, determined smile, blue tunic, leather belt, brown pants, brown boots, "
             "holding a simple wooden sword, full body, standing, facing viewer, front view, feet visible, cute, big eyes, "
             "clean lineart, cel shading, simple background, white background", "gen_test", "novice", seed=2024, batch=4)
print(files, round(time.time() - t, 1), "s")

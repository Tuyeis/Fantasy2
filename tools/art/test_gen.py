import sys, time
sys.path.insert(0, ".")
from comfy_client import pony
t = time.time()
files = pony("1boy, solo, chibi, sun wukong, monkey king, golden circlet, monkey tail, red and gold armor, red cape, holding red staff with gold ends, "
             "full body, standing, facing viewer, front view, feet visible, cute, big eyes, clean lineart, cel shading, "
             "simple background, white background", "gen_test", "wukong", seed=1234, batch=2)
print(files, round(time.time() - t, 1), "s")

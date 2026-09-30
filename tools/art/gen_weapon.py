import sys
sys.path.insert(0, ".")
from comfy_client import dream
files = dream("2d game item asset, a single wooden training sword standing vertically with the tip up, light oak wooden blade, "
              "short cross guard, leather wrapped grip, round pommel, bold black outline, flat cel shading, anime game art style, "
              "centered, isolated on a plain white background",
              "weapons", "wsword", negative="person, hand, character, multiple swords, text, watermark, shadow, 3d render, photo, frame",
              seed=21, width=768, height=1344, batch=4)
print(files)

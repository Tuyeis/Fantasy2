import sys
sys.path.insert(0, ".")
from comfy_client import pony, upload_image
name = upload_image("rig/pose_front.png")
for strength, end, tag in [(0.55, 0.5, "s55"), (0.7, 0.45, "s70")]:
    files = pony("1boy, solo, chibi, super deformed, big head, young adventurer, brown messy hair, determined smile, blue tunic, leather belt, brown pants, brown boots, "
                 "empty hands, arms slightly apart from the body, standing straight, legs slightly apart, front view, facing viewer, "
                 "full body, feet visible, cute, big eyes, clean lineart, cel shading, simple background, white background",
                 "rig", "novice_front_" + tag, seed=2024, batch=4, control_image=name, control_type="openpose",
                 control_strength=strength, control_end=end, extra_neg="weapon, sword, holding, crossed arms, hands on hips, giant hands, deformed hands, elf ears")
    print(tag, files, flush=True)

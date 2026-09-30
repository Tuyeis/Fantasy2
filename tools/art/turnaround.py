"""Three-view (front / side / back) OpenPose sheet for rig-ready characters + generation."""
import json
import os
import sys

sys.path.insert(0, ".")
from pose_rig import draw_pose  # noqa: E402
import pose_rig  # noqa: E402

SHEET_W, SHEET_H = 1536, 1024
FEET_Y = 960
SCALE = 0.88
CENTERS = {"front": 280, "side": 768, "back": 1256}

# Reference skeleton (old canvas: centre x 416, feet y 1085). COCO-18 indices.
FRONT_REF = {
    0: (416, 430), 1: (416, 560), 2: (336, 590), 3: (290, 700), 4: (262, 805),
    5: (496, 590), 6: (542, 700), 7: (570, 805), 8: (380, 820), 9: (372, 950), 10: (368, 1085),
    11: (452, 820), 12: (460, 950), 13: (464, 1085), 14: (382, 405), 15: (450, 405), 16: (330, 410), 17: (502, 410),
}
# Side view facing RIGHT: one visible eye/ear, shoulders and hips almost overlapping.
SIDE_REF = {
    0: (470, 432), 1: (416, 560), 2: (410, 592), 3: (418, 700), 4: (432, 805),
    5: (422, 592), 6: (430, 700), 7: (444, 805), 8: (410, 820), 9: (414, 950), 10: (410, 1085),
    11: (422, 820), 12: (426, 950), 13: (424, 1085), 15: (448, 405), 17: (392, 412),
}
# Back view: left/right swapped, no face keypoints, ears visible.
BACK_REF = {
    1: (416, 560), 5: (336, 590), 6: (290, 700), 7: (262, 805),
    2: (496, 590), 3: (542, 700), 4: (570, 805), 11: (380, 820), 12: (372, 950), 13: (368, 1085),
    8: (452, 820), 9: (460, 950), 10: (464, 1085), 17: (340, 420), 16: (492, 420),
}


def place(ref, center_x):
    return {k: (center_x + (x - 416) * SCALE, FEET_Y - (1085 - y) * SCALE) for k, (x, y) in ref.items()}


def sheet_pose():
    return {"front": place(FRONT_REF, CENTERS["front"]), "side": place(SIDE_REF, CENTERS["side"]), "back": place(BACK_REF, CENTERS["back"])}


def draw_sheet(path):
    pose_rig.W, pose_rig.H = SHEET_W, SHEET_H
    merged = {}
    views = sheet_pose()
    # draw_pose takes one skeleton; draw three and merge by max.
    from PIL import Image, ImageChops
    layers = []
    for i, (name, kp) in enumerate(views.items()):
        tmp = path + f".{name}.png"
        draw_pose(kp, tmp)
        layers.append(Image.open(tmp).convert("RGB"))
        os.remove(tmp)
    img = layers[0]
    for layer in layers[1:]:
        img = ImageChops.lighter(img, layer)
    img.save(path)
    json.dump({name: {str(k): v for k, v in kp.items()} for name, kp in views.items()}, open(path.replace(".png", ".json"), "w"), indent=1)
    return merged


if __name__ == "__main__":
    from comfy_client import pony, upload_image
    import comfy_client
    out = sys.argv[1] if len(sys.argv) > 1 else "turn"
    desc = sys.argv[2] if len(sys.argv) > 2 else ("young adventurer boy, brown messy hair, determined smile, blue tunic, leather belt, "
                                                  "brown shorts, brown boots, small leather satchel")
    seeds = [int(s) for s in (sys.argv[3].split(",") if len(sys.argv) > 3 else ["101", "202", "303", "404"])]
    os.makedirs(out, exist_ok=True)
    draw_sheet(os.path.join(out, "pose_sheet.png"))
    name = upload_image(os.path.join(out, "pose_sheet.png"))
    comfy_client.PONY_NEG = comfy_client.PONY_NEG.replace("multiple views, ", "").replace("reference sheet, ", "")
    prompt = ("character sheet, turnaround, three views of the same character, front view, side view facing right, back view, "
              "consistent design, chibi, super deformed, big head, " + desc + ", empty hands, arms slightly apart from the body, "
              "standing straight, full body, feet visible, cute, big eyes, clean lineart, cel shading, simple background, white background")
    for seed in seeds:
        files = pony(prompt, out, f"sheet_{seed}", seed=seed, width=SHEET_W, height=SHEET_H, batch=1, control_image=name,
                     control_type="openpose", control_strength=0.62, control_end=0.6,
                     extra_neg="weapon, sword, holding, text, speech bubble, 4 views, extra character, color palette, close-up")
        print(seed, files, flush=True)

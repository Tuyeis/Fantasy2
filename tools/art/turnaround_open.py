"""Three-view sheet with OPEN arms (rig pose): arms ~40 deg away from the body front/back, forward in the side view."""
import json, os, sys
sys.path.insert(0, ".")
import turnaround as ta
from comfy_client import pony, upload_image
import comfy_client

# Arms opened: elbows/wrists pushed outwards (front/back) and forwards (side).
ta.FRONT_REF = dict(ta.FRONT_REF)
ta.FRONT_REF.update({3: (250, 680), 4: (200, 765), 6: (582, 680), 7: (632, 765)})
ta.BACK_REF = dict(ta.BACK_REF)
ta.BACK_REF.update({6: (250, 680), 7: (200, 765), 3: (582, 680), 4: (632, 765)})
ta.SIDE_REF = dict(ta.SIDE_REF)
ta.SIDE_REF.update({3: (470, 690), 4: (525, 770), 6: (478, 690), 7: (533, 770)})

ta.SCALE = float(os.environ.get("TA_SCALE", ta.SCALE))   # smaller figures = more room between the three views
if __name__ == "__main__":
    out, desc, seeds = sys.argv[1], sys.argv[2], [int(s) for s in sys.argv[3].split(",")]
    strength = float(sys.argv[4]) if len(sys.argv) > 4 else 0.72
    os.makedirs(out, exist_ok=True)
    ta.draw_sheet(os.path.join(out, "pose_sheet.png"))
    name = upload_image(os.path.join(out, "pose_sheet.png"))
    comfy_client.PONY_NEG = comfy_client.PONY_NEG.replace("multiple views, ", "").replace("reference sheet, ", "")
    prompt = ("character sheet, turnaround, three views of the same character, front view, side view facing right, back view, "
              "consistent design, chibi, super deformed, big head, " + desc + ", empty hands, arms spread away from the body, a-pose, "
              "arms not touching the body, standing straight, full body, feet visible, cute, big eyes, clean lineart, cel shading, simple background, white background")
    for seed in seeds:
        files = pony(prompt, out, f"sheet_{seed}", seed=seed, width=ta.SHEET_W, height=ta.SHEET_H, control_image=name,
                     control_type="openpose", control_strength=strength, control_end=0.7,
                     extra_neg="weapon, sword, holding, text, speech bubble, 4 views, extra character, color palette, close-up, arms down, hands in pockets, " + os.environ.get("EXTRA_NEG", ""))
        print(seed, files, flush=True)

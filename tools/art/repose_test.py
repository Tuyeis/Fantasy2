import sys
sys.path.insert(0, ".")
import comfy_client
from comfy_client import repose, upload_image
comfy_client.PONY_NEG = comfy_client.PONY_NEG.replace("multiple views, ", "").replace("reference sheet, ", "")
control = upload_image("open_test/pose_sheet.png")
JOBS = {
    "knight": ("turn_knight/sheet_101_0.png", "1boy, young knight, silver hair, silver plate armor, blue tabard with a gold cross emblem, silver gauntlets, silver armored boots, no helmet, no cape"),
    "wukong": ("turn_wukong/sheet_101_0.png", "1boy, monkey king boy, sun wukong, golden circlet, brown fur, monkey ears, long monkey tail, golden armored vest, red scarf, orange pants, golden boots, no cape"),
    "cat": ("turn_cat/sheet_101_0.png", "1boy, cat boy, orange hair, orange cat ears, orange cat tail, green eyes, black sleeveless vest, grey shorts, black shoes"),
}
for key, (src, desc) in JOBS.items():
    img = upload_image(src)
    prompt = ("character sheet, turnaround, three views of the same character, front view, side view, back view, consistent design, chibi, " + desc +
              ", empty hands, arms spread away from the body, a-pose, arms not touching the body, full body, clean lineart, cel shading, simple background, white background")
    for d in (0.55, 0.68):
        files = repose(img, control, prompt, "repose", f"{key}_{int(d * 100)}", seed=5, denoise=d, extra_neg="weapon, holding, arms down, extra character")
        print(key, d, files, flush=True)

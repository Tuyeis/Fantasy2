"""Second day batch (DreamShaper for creatures Pony gets wrong), started after gen_day."""
import sys
sys.path.insert(0, ".")
from comfy_client import dream
STYLE = ("chibi, 2d game monster sprite, anime game art style, bold black outline, flat cel shading, "
         "isolated on a plain white background, centered, whole body visible")
NEG = "person, human, text, watermark, frame, scenery, background, 3d render, photo"
JOBS = {
    "golem": "a cute but dangerous stone golem monster, side view facing left, huge body made of grey boulders, small head, glowing cyan runes and eyes, big stone fists, short thick legs, some moss",
    "fire_drake": "a small red fire drake dragon monster, side view facing left, orange belly, small horns, bat wings, long tail with a flame tip, four legs, a little fire from the mouth",
    "frost_hydra": "a frost hydra boss monster, side view facing left, three long necks with icy blue dragon heads, heavy body, ice crystals on the back, short legs",
    "wraith": "a wraith ghost monster, side view facing left, tattered black hooded cloak, glowing white eyes in the dark hood, ghostly claws, no legs, floating, blue mist",
}
for key, desc in JOBS.items():
    print(key, dream(desc + ", " + STYLE, "mon_" + key, "dream", negative=NEG, seed=61, width=1024, height=1024, batch=4), flush=True)
print("DAY2 DONE", flush=True)

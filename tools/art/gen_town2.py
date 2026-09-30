"""Buildings, second try: front-facing facade seen slightly from above, nothing around the building."""
import sys
sys.path.insert(0, ".")
from comfy_client import dream
B = ("front view of the facade seen slightly from above, facing the camera, fantasy village building, chibi proportions, game asset, "
     "anime game art style, bold black outline, flat cel shading, soft warm colors, isolated on a plain white background, "
     "nothing around the building, centered, whole building visible")
NEG = ("trees, forest, sky, clouds, mountains, landscape, scenery, grass field, road, other buildings, isometric, diagonal view, "
       "person, character, text, watermark, signature, frame, border, 3d render, photo")
JOBS = {
    "b2_portal": "an ancient stone archway with a swirling violet magic portal inside the arch, glowing runes, purple crystals on the pillars, small stone steps",
    "b2_guild": "an adventurers guild hall, wide two story timber frame building with a blue tiled roof, big double door, sign with crossed swords, blue banners",
    "b2_shop": "a cozy item shop, timber frame house with a red tiled roof, red and white striped awning over the counter, potion bottles and crates in front",
    "b2_class_library": "a magic library with a purple roof and a small round tower, arched windows, a big book sign above the door, star ornaments",
    "b2_forge": "a blacksmith forge, stone building with a grey slate roof and a big chimney, open workshop front with anvil and glowing furnace",
    "b2_house": "a small cozy cottage with a green roof, round wooden door, flower boxes under the windows, small chimney",
    "b2_coliseum": "a small round arena coliseum, sandstone walls with rows of arches, golden flags on top, big open gate in the middle",
}
for key, desc in JOBS.items():
    files = dream(desc + ", " + B, "town", key, negative=NEG, seed=52, width=1152, height=896, batch=4)
    print(key, files, flush=True)
print("ALL DONE", flush=True)

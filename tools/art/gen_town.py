"""Town art in the anime cel style: buildings (3/4 top-down), props and ground textures. 4 candidates each."""
import sys
sys.path.insert(0, ".")
from comfy_client import dream
B = ("fantasy village building, chibi proportions, 3/4 top-down view from the front, game asset, anime game art style, "
     "bold black outline, flat cel shading, soft warm colors, isolated on a plain white background, centered, whole building visible")
P = ("game asset, anime game art style, bold black outline, flat cel shading, 3/4 top-down view, isolated on a plain white background, centered")
T = ("seamless tileable texture, flat top-down view, hand painted anime game style, soft cel shading, even lighting, no perspective, fills the whole image")
NEG = "person, character, people, text, watermark, signature, frame, border, ground, landscape, scenery, sky, 3d render, photo, multiple buildings"
NEG_T = "perspective, horizon, objects, people, text, watermark, frame, border, vignette, 3d render, photo"
JOBS = {
    "b_portal": ("an ancient stone archway portal with a swirling violet magic gate, glowing runes, small stone steps, purple crystals, " + B, NEG, 1024, 1024),
    "b_guild": ("an adventurers guild hall, big two story timber frame building with a blue tiled roof, wooden sign with crossed swords, blue banners, lanterns, " + B, NEG, 1152, 896),
    "b_shop": ("a cozy item shop, timber frame house with a red tiled roof, striped awning, potion bottles and crates at the entrance, hanging sign with a potion, " + B, NEG, 1152, 896),
    "b_class_library": ("a magic library building with a purple roof and a small round tower, arched windows, books and star ornaments, " + B, NEG, 1152, 896),
    "b_forge": ("a blacksmith forge, stone building with a grey slate roof, chimney with smoke, anvil and glowing furnace at the open front, barrels, " + B, NEG, 1152, 896),
    "b_house": ("a small cozy cottage with a green roof, round wooden door, flower boxes, chimney, " + B, NEG, 1024, 1024),
    "b_coliseum": ("a small arena coliseum, round sandstone walls with arches, golden flags on top, open gate, " + B, NEG, 1152, 896),
    "p_tree": ("a single round leafy green tree with a short brown trunk, " + P, NEG, 896, 1152),
    "p_pine": ("a single green pine tree, " + P, NEG, 896, 1152),
    "p_bush": ("a single round leafy green bush, " + P, NEG, 1024, 1024),
    "p_flower_bush": ("a single round green bush with pink and white flowers, " + P, NEG, 1024, 1024),
    "p_lamp": ("a single iron street lamp post with a warm glowing lantern, " + P, NEG, 768, 1344),
    "p_fountain": ("a round stone fountain with clear blue water and a small statue spout in the middle, " + P, NEG, 1024, 1024),
    "t_grass": ("lush green grass with tiny flowers, " + T, NEG_T, 1024, 1024),
    "t_path": ("dirt path with small embedded pebbles, " + T, NEG_T, 1024, 1024),
    "t_plaza": ("light grey cobblestone paving, rounded stones, " + T, NEG_T, 1024, 1024),
    "t_water": ("clear blue pond water with soft ripples and light sparkles, " + T, NEG_T, 1024, 1024),
}
if __name__ == "__main__":
    only = sys.argv[1:] or list(JOBS)
    for key in only:
        prompt, neg, w, h = JOBS[key]
        files = dream(prompt, "town", key, negative=neg, seed=41, width=w, height=h, batch=4)
        print(key, files, flush=True)
    print("ALL DONE", flush=True)

"""Dungeon art batch: battle backdrops per floor, top-down room floors per floor, props."""
import sys, os
sys.path.insert(0, ".")
from comfy_client import dream
os.makedirs("dungeon", exist_ok=True)
STYLE_BG = ("2d JRPG battle background, side view looking into a dungeon hall, wide empty stone floor in the lower half for the fighters, "
            "hand painted anime game art, atmospheric lighting, depth, detailed, no characters, no monsters, no text, no ui")
NEG_BG = "people, characters, monsters, creatures, text, watermark, ui, frame, border, blurry, photo, 3d render"
BG = {
    "bg_floor1": "ancient catacombs of warm brown stone, arched pillars, wall torches with warm orange light, cobwebs, old bones and pots at the sides",
    "bg_floor2": "frozen crystal caverns, blue ice walls with glowing cyan crystals, frost on the stone floor, cold mist, soft blue light",
    "bg_floor3": "dark abyss temple, purple and black obsidian stone, glowing violet runes, floating purple embers, ominous atmosphere",
    "bg_boss1": "goblin king throne room in a cave, crude wooden throne with gold, torches, banners made of hide, warm firelight",
    "bg_boss2": "frozen lake cavern with a huge ice cathedral, icicles, pale blue light shafts, cold mist over the frozen floor",
    "bg_boss3": "the void sovereign throne hall, cosmic starry void visible through broken walls, black crystal throne, violet light",
}
STYLE_FL = ("seamless top-down view of a dungeon floor for a 2d RPG game, flat overhead view, hand painted anime game art, "
            "stone floor tiles with cracks, small details, soft even lighting, no walls, no objects, no perspective")
NEG_FL = "walls, perspective, horizon, objects, people, characters, furniture, text, watermark, frame, border, photo, 3d render, blurry"
FL = {
    "floor1": "warm brown sandstone flagstones, dust, a few scattered pebbles and small bones",
    "floor2": "blue grey stone slabs with frost and ice patches, small crystals in the cracks",
    "floor3": "dark purple obsidian tiles with faint glowing violet rune lines in the cracks",
}
STYLE_P = ("single object, 2d RPG game asset, 3/4 top-down view, hand painted anime game art, bold outline, cel shading, "
           "isolated on a plain white background, centered, whole object visible")
NEG_P = "people, characters, text, watermark, frame, border, background scenery, floor, multiple objects, photo, 3d render"
PR = {
    "p_chest": "a wooden treasure chest with gold trim and a lock, closed",
    "p_chest_open": "an open wooden treasure chest with gold trim, glowing gold coins inside",
    "p_campfire": "a small campfire with logs in a ring of stones, bright flames",
    "p_campfire_out": "an extinguished campfire, burnt logs in a ring of stones, a thin smoke wisp",
    "p_shrine": "a small stone shrine altar with a glowing blue crystal on top",
    "p_pedestal": "a stone pedestal with an open glowing magic scroll on top",
    "p_stairs": "a stone staircase going down into a dark hole in the floor, top-down view",
    "p_spikes": "a floor spike trap, metal spikes coming out of a stone floor plate",
    "p_torch": "a wall mounted iron torch sconce with a burning flame",
    "p_bones": "a small pile of old bones and a skull",
    "p_barrels": "two old wooden barrels and a crate",
}
only = sys.argv[1:]
for key, desc in BG.items():
    if not only or key in only:
        print(key, dream(desc + ", " + STYLE_BG, "dungeon", key, negative=NEG_BG, seed=71, width=1536, height=864, batch=2), flush=True)
for key, desc in FL.items():
    if not only or key in only:
        print(key, dream(desc + ", " + STYLE_FL, "dungeon", key, negative=NEG_FL, seed=72, width=1152, height=768, batch=3), flush=True)
for key, desc in PR.items():
    if not only or key in only:
        print(key, dream(desc + ", " + STYLE_P, "dungeon", key, negative=NEG_P, seed=73, width=1024, height=1024, batch=2), flush=True)
print("DUNGEON DONE", flush=True)

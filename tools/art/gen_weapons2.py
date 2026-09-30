"""Second weapon batch: class weapons still missing + monster weapons. 4 candidates each (DreamShaper Lightning)."""
import sys
sys.path.insert(0, ".")
from comfy_client import dream
STYLE = ("2d game item asset, bold black outline, flat cel shading, anime game art style, centered, isolated on a plain white background")
NEG = "person, hand, character, multiple objects, text, watermark, shadow, 3d render, photo, frame, background scenery"
UP = ", standing vertically, head at the top"
JOBS = {
    # classes
    "mage_staff": "a single wooden wizard staff" + UP + ", glowing blue crystal orb held by curled wood at the top, gold rings",
    "witch_staff": "a single crooked dark wooden witch staff" + UP + ", purple crystal and small moon charm at the top",
    "wukong_staff": "a single long straight red lacquered pole staff, golden caps on both ends, chinese pattern, vertical",
    "cat_kunai": "a single ninja kunai standing vertically with the tip down, dark steel blade, wrapped black grip, ring pommel",
    "knight_sword": "a single knight longsword standing vertically with the tip down, bright steel blade, blue leather grip, golden cross guard",
    "knight_shield": "a single heater shield, front view, silver rim, blue field with a golden cross emblem",
    "elf_bow": "a single elegant elven longbow standing vertically, light green and white wood with leaf carvings, one thin string, no arrow",
    # monsters
    "goblin_dagger": "a single crude rusty dagger standing vertically with the tip down, chipped blade, rag wrapped grip",
    "goblin_scepter": "a single golden king scepter club" + UP + ", big gold head with red gems, short handle",
    "orc_axe": "a single crude orc battle axe" + UP + ", big iron axe head at the top, wooden handle with leather wraps",
    "skeleton_sword": "a single old rusty broken sword standing vertically with the tip down, notched blade, bone grip",
    "dark_greatsword": "a single black greatsword standing vertically with the tip down, glowing purple runes on the blade, spiked guard",
    "lich_staff": "a single bone staff" + UP + ", a skull with glowing green eyes at the top, dark purple cloth",
    "minotaur_axe": "a single huge double headed battle axe" + UP + ", two crescent iron blades at the top, thick wooden shaft",
    "imp_trident": "a single small red devil trident" + UP + ", three sharp prongs at the top, black shaft",
    "void_sword": "a single dark crystal sword standing vertically with the tip down, black blade with violet starry void glow, ornate guard",
}
only = sys.argv[1:] or list(JOBS)
for key in only:
    files = dream(JOBS[key] + ", " + STYLE, "weapons", key, negative=NEG, seed=33, width=768, height=1344 if key != "knight_shield" else 1024, batch=4)
    print(key, files, flush=True)
print("ALL DONE", flush=True)

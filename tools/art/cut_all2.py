import sys, os, traceback
sys.path.insert(0, ".")
from PIL import Image
import sheet_cut2
PICKS = {
    "novice": ("turn2/sheet_202_fixed.png", False), "swordsman": ("turn_swordsman/sheet_404_0.png", False),
    "mage": ("turn_mage/sheet_101_0.png", False), "wukong": ("turn_wukong/sheet_101_0.png", True),
    "cat": ("turn_cat/sheet_101_0.png", True), "knight": ("repose/knight_80_0.png", False), "wukong_r": ("repose/wukong_80_0.png", True),
    "vampire": ("turn_vampire2/sheet_101_0.png", False), "dark_elf": ("turn_dark_elf2/sheet_121_0.png", False),
    "dark_witch": ("turn_dark_witch2/sheet_606_0.png", False), "elf": ("turn_elf4/sheet_707_0.png", False),
    # monsters
    "goblin": ("mon_goblin/sheet_303_0.png", False), "goblin_king": ("mon_goblin_king/sheet_101_0.png", False),
    "orc": ("mon_orc/sheet_202_0.png", False), "skeleton": ("mon_skeleton/sheet_202_0.png", False),
    "zombie": ("mon_zombie/sheet_202_0.png", False),
    "dark_knight": ("mon_dark_knight/sheet_404_0.png", False), "lich": ("mon_lich/sheet_808_0.png", False),
    "succubus": ("mon_succubus/sheet_101_0.png", True), "fire_imp": ("mon_fire_imp/sheet_606_0.png", True),
    "minotaur": ("mon_minotaur/sheet_202_0.png", False), "void_sovereign": ("mon_void_sovereign/sheet_606_0.png", False),
}
only = sys.argv[1:] or list(PICKS)
for key in only:
    path, tail = PICKS[key]
    try:
        sheet_cut2.main(path, f"cut2_{key}", tail=tail)
        ims = [Image.open(f"cut2_{key}/{v}/_partition.png").convert("RGB") for v in ("front", "side", "back")]
        w = sum(i.width for i in ims); h = max(i.height for i in ims)
        s = Image.new("RGB", (w, h)); x = 0
        for i in ims: s.paste(i, (x, 0)); x += i.width
        s.resize((w // 3, h // 3)).save(f"shots/part2_{key}.png")
        print(key, "OK", flush=True)
    except Exception as e:
        print(key, "FAILED", repr(e), flush=True)
        traceback.print_exc()

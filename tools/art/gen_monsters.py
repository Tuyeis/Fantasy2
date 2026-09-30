"""Monster art in the class style (Pony, chibi anime).

Humanoids -> three-view sheet with open arms (puppet pipeline). Others -> single side-view sprite facing left.
usage: gen_monsters.py [keys...]
"""
import os, subprocess, sys
sys.path.insert(0, ".")
from comfy_client import pony

PY = sys.executable
SEEDS = "101,202,303,404"
HUMANOID = {
    "goblin": "1boy, small goblin, green skin, long pointy ears, big nose, yellow eyes, mischievous grin, ragged brown loincloth tunic, leather belt with pouches, barefoot, monster",
    "goblin_king": "1boy, goblin king, fat green goblin, long pointy ears, big nose, golden crown, red royal cape short, fur collar, brown leather armor, big belly, gold rings, monster, boss",
    "orc": "1boy, orc warrior, muscular, dark green skin, small tusks, black mohawk, angry eyes, spiked shoulder pad, leather armor, fur loincloth, bandaged arms, heavy boots, monster",
    "skeleton": "skeleton warrior, skull head, glowing blue eye sockets, white bones, ribcage, rusty iron helmet, torn dark red cloth around the waist, bony arms and legs, undead, monster",
    "zombie": "1boy, zombie, pale green grey skin, stitches, messy dark hair, one eye bigger, torn blue shirt, ripped brown pants, barefoot, undead, monster",
    "dark_knight": "dark knight, full black plate armor, horned black helmet with glowing red eyes in the visor, purple glowing runes, black gauntlets, black armored boots, torn purple tabard, monster",
    "lich": "lich, undead sorcerer, skull face with glowing green eyes, dark purple hooded robe with gold trim, bony hands, floating green magic runes, golden jewelry, monster",
    "succubus": "1girl, succubus, long magenta hair, small curved black horns, small bat wings on the back, heart-shaped tail, purple skin-tight dress, black gloves, black boots, demon, monster",
    "fire_imp": "fire imp, small red demon, red skin, small horns, flame hair, yellow eyes, pointy tail, black shorts, mischievous grin, fire sparks, monster",
    "minotaur": "minotaur, bull head with big horns, brown fur, nose ring, muscular body, leather harness, iron bracers, brown fur loincloth, hooves, monster",
    "void_sovereign": "1boy, void sovereign, dark demon lord, pale grey skin, long black hair, crown of black crystal horns, glowing violet eyes, black and violet royal armor, starry void patterns on the cloak, monster, final boss",
}
SINGLE = {
    "slime": "cute green slime monster, translucent jelly blob, glossy highlights, big eyes, small smile",
    "rat": "giant rat monster, grey brown fur, red eyes, long pink tail, big front teeth, four legs, standing on four legs",
    "bat": "cute bat monster, purple fur, big bat wings spread, big ears, small fangs, red eyes, flying",
    "mushroom": "toxic mushroom monster, big purple mushroom cap with green spots, small body with tiny legs, angry eyes, poison spores",
    "wolf": "wolf monster, grey fur, fierce yellow eyes, fangs, bushy tail, four legs, standing on four legs",
    "ice_wisp": "ice wisp, floating spirit of cold blue fire, ice crystal core, small cute face, frost sparkles, no legs",
    "giant_spider": "giant spider monster, black and purple body, eight legs, many red eyes, fangs, hairy",
    "harpy": "1girl, harpy, feathered wings instead of arms, bird talons, brown and white feathers, wild hair, flying, monster",
    "golem": "stone golem, huge body made of grey boulders, moss, glowing cyan runes and eyes, big fists, short thick legs",
    "wraith": "wraith, hooded ghost, tattered black cloak, glowing white eyes in the dark hood, ghostly claws, no legs, floating, blue mist",
    "fire_drake": "fire drake, small red dragon, orange belly, horns, wings, long tail, four legs, flames from the mouth",
    "frost_hydra": "frost hydra, three headed ice blue serpent dragon, three long necks, ice crystals on the back, heavy body, short legs, boss",
}
SINGLE_PROMPT = ("full body, side view, profile, facing left, chibi, super deformed, {d}, monster, cute but dangerous, "
                 "clean lineart, cel shading, anime style game sprite, simple background, white background")
if __name__ == "__main__":
    only = sys.argv[1:] or list(HUMANOID) + list(SINGLE)
    for key in only:
        print("==", key, flush=True)
        if key in HUMANOID:
            subprocess.run([PY, "turnaround_open.py", "mon_" + key, HUMANOID[key], SEEDS], check=False)
        else:
            out = "mon_" + key
            os.makedirs(out, exist_ok=True)
            for seed in [int(s) for s in SEEDS.split(",")]:
                files = pony(SINGLE_PROMPT.format(d=SINGLE[key]), out, f"single_{seed}", seed=seed, width=1024, height=1024,
                             extra_neg="multiple views, character sheet, front view, back view, human, 1boy, 1girl, text, speech bubble, frame, extra character" if key not in ("harpy",) else "multiple views, character sheet, text, frame, extra character")
                print(seed, files, flush=True)
    print("ALL DONE", flush=True)

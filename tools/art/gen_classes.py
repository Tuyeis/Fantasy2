"""Generate 3-view turnaround sheets (4 seeds) for every advanced class."""
import subprocess, sys
PY = sys.executable
CLASSES = {
    "swordsman": "1boy, young swordsman, spiky black hair, red headband, confident grin, red tunic with a light steel chest plate, brown belt, dark grey pants, brown boots, no cape",
    "mage": "1boy, young mage, silver white hair, big pointed purple wizard hat with gold band, short purple robe tunic reaching mid thigh with gold trim, dark pants, brown boots, no cape",
    "elf": "1girl, elf girl, long blonde hair in a ponytail, pointy elf ears, green eyes, green leaf pattern tunic, brown leather belt, brown shorts, knee-high leather boots, no cape",
    "wukong": "1boy, monkey king boy, sun wukong, golden circlet on the head, fluffy brown hair, monkey ears, long monkey tail, red and gold armored vest, red scarf, orange pants, golden boots, no cape",
    "cat": "1boy, cat boy, orange hair, orange cat ears, orange cat tail, green eyes, black sleeveless ninja vest, grey shorts, dark wrappings on the legs, black shoes, no cape",
    "knight": "1boy, young knight, short blond hair, silver plate armor, blue tabard with a gold cross emblem, silver gauntlets, silver armored boots, no helmet, no cape",
    "vampire": "1boy, vampire boy, pale skin, black hair, red eyes, small fangs, black and crimson noble vest, white frilly shirt, dark shorts, black boots, no cape",
    "dark_elf": "1boy, dark elf boy, grey purple skin, long white hair, pointy elf ears, golden eyes, dark purple leather armor, black shorts, dark leather boots, no cape, no hood",
    "dark_witch": "1girl, witch girl, long purple hair, big black witch hat with purple ribbon, black dress reaching the knees, purple striped stockings, black boots, no cape",
}
only = sys.argv[1:] or list(CLASSES)
for key in only:
    print("==", key, flush=True)
    subprocess.run([PY, "turnaround.py", "turn_" + key, CLASSES[key], "101,202,303,404"], check=False)
print("ALL DONE", flush=True)

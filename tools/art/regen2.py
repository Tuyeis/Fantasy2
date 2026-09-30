import subprocess, sys
PY = sys.executable
JOBS = {
    "elf": "1girl, elf girl, blonde hair tied in a short high ponytail, pointy elf ears, green eyes, green tunic with leaf embroidery, brown belt, brown shorts, brown knee-high boots, no cape",
    "dark_elf": "1boy, dark elf boy, dark grey purple skin, short white hair, pointy elf ears, golden eyes, wearing a dark purple sleeveless leather armor tunic, black shorts, dark leather boots, no cape",
}
for key, desc in JOBS.items():
    subprocess.run([PY, "turnaround.py", "turn_" + key + "2", desc, "111,121,131,141"], check=False)
print("ALL DONE", flush=True)

"""Ground texture -> seamless tile (2x2 mirror), softened to sit under cel-shaded art.
usage: make_tex.py <src> <out> <size> <contrast> <saturation> <blur>"""
import sys
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
src, out, size, con, sat, blur = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
im = Image.open(src).convert("RGB").resize((size // 2, size // 2), Image.LANCZOS)
if blur > 0:
    im = im.filter(ImageFilter.GaussianBlur(blur))
im = ImageEnhance.Contrast(im).enhance(con)
im = ImageEnhance.Color(im).enhance(sat)
tile = Image.new("RGB", (size, size))
tile.paste(im, (0, 0)); tile.paste(ImageOps.mirror(im), (size // 2, 0))
tile.paste(ImageOps.flip(im), (0, size // 2)); tile.paste(ImageOps.flip(ImageOps.mirror(im)), (size // 2, size // 2))
tile.save(out)
print(out)

import time
from rembg import remove, new_session
from PIL import Image
for model in ["isnet-anime", "u2net"]:
    t = time.time()
    try:
        s = new_session(model)
        img = Image.open("gen_test/wukong_0.png")
        out = remove(img, session=s, alpha_matting=False)
        bbox = out.getbbox()
        out.crop(bbox).save(f"gen_test/wukong_cut_{model}.png")
        print(model, "ok", bbox, round(time.time()-t,1))
    except Exception as e:
        print(model, "FAIL", e)

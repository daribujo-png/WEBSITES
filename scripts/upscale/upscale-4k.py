"""AI-upscale the Adria renders from 1920x1080 to 3840x2160 (EDSR x2, OpenCV dnn_superres).

Setup:  pip install opencv-contrib-python-headless
        curl -L -o scripts/upscale/EDSR_x2.pb https://raw.githubusercontent.com/Saafke/EDSR_Tensorflow/master/models/EDSR_x2.pb
Run:    python3 scripts/upscale/upscale-4k.py   (reads content-import/adria/orig, writes content-import/adria/4k)
"""
import os, time
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(ROOT, "content-import", "adria", "orig")
DST = os.path.join(ROOT, "content-import", "adria", "4k")
MODEL = os.path.join(HERE, "EDSR_x2.pb")

sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(MODEL)
sr.setModel("edsr", 2)
os.makedirs(DST, exist_ok=True)

TILE, PAD = 480, 16
for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    t = time.time()
    img = cv2.imread(os.path.join(SRC, name))
    h, w = img.shape[:2]
    out = np.zeros((h * 2, w * 2, 3), np.uint8)
    for y in range(0, h, TILE):
        for x in range(0, w, TILE):
            y0, x0 = max(0, y - PAD), max(0, x - PAD)
            y1, x1 = min(h, y + TILE + PAD), min(w, x + TILE + PAD)
            up = sr.upsample(img[y0:y1, x0:x1])
            oy, ox = (y - y0) * 2, (x - x0) * 2
            th, tw = min(TILE, h - y) * 2, min(TILE, w - x) * 2
            out[y * 2:y * 2 + th, x * 2:x * 2 + tw] = up[oy:oy + th, ox:ox + tw]
    stem = os.path.splitext(name)[0]
    cv2.imwrite(os.path.join(DST, f"{stem}-3840x2160.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"{stem}: {out.shape[1]}x{out.shape[0]} in {time.time() - t:.0f}s", flush=True)

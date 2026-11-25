"""Erzeugt neutrale Platzhalterbilder fuer den Entwurf (keine Werke von Jost Merscher).

Jedes Bild ist eine ruhige, abstrakte Komposition in Papier- und Erdtoenen.
Wenn Josts Fotos da sind, werden die Dateien in assets/works/ einfach ersetzt.
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "works"
OUT.mkdir(parents=True, exist_ok=True)

PAPER = [(236, 231, 220), (226, 219, 204), (214, 205, 188), (243, 239, 231)]
EARTH = [(158, 72, 44), (120, 98, 70), (64, 72, 78), (182, 150, 96), (92, 60, 48), (40, 40, 38), (138, 146, 140)]


def grain(img, amount=10, seed=0):
    rnd = random.Random(seed)
    noise = Image.effect_noise(img.size, amount).convert("L")
    noise = noise.filter(ImageFilter.GaussianBlur(0.6))
    tint = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img, Image.composite(img, tint, Image.new("L", img.size, 235)), 0.18)


def torn_poly(x0, y0, x1, y1, rnd, jitter=6, step=14):
    pts = []
    for x in range(int(x0), int(x1), step):
        pts.append((x, y0 + rnd.uniform(-jitter, jitter)))
    for y in range(int(y0), int(y1), step):
        pts.append((x1 + rnd.uniform(-jitter, jitter), y))
    for x in range(int(x1), int(x0), -step):
        pts.append((x, y1 + rnd.uniform(-jitter, jitter)))
    for y in range(int(y1), int(y0), -step):
        pts.append((x0 + rnd.uniform(-jitter, jitter), y))
    return pts


def painting(name, w, h, seed):
    rnd = random.Random(seed)
    base = rnd.choice(PAPER)
    img = Image.new("RGB", (w, h), base)
    d = ImageDraw.Draw(img, "RGBA")
    # zwei bis drei grosse Farbfelder, weich ineinander
    bands = rnd.randint(2, 3)
    y = 0
    for i in range(bands):
        bh = h // bands + rnd.randint(-h // 10, h // 10)
        c = rnd.choice(EARTH)
        d.rectangle([w * 0.08, y + h * 0.06, w * 0.92, min(h * 0.94, y + bh)], fill=c + (rnd.randint(170, 235),))
        y += bh
    img = img.filter(ImageFilter.GaussianBlur(rnd.uniform(3, 9)))
    d = ImageDraw.Draw(img, "RGBA")
    # eine einzelne feine Linie
    lx = rnd.uniform(w * 0.2, w * 0.8)
    d.line([(lx, h * 0.1), (lx + rnd.uniform(-40, 40), h * 0.9)], fill=base + (200,), width=3)
    return img


def collage(name, w, h, seed):
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h), rnd.choice(PAPER))
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(rnd.randint(4, 7)):
        cw, ch = rnd.uniform(0.18, 0.55) * w, rnd.uniform(0.12, 0.45) * h
        x0, y0 = rnd.uniform(0.04, 0.96 - cw / w) * w, rnd.uniform(0.04, 0.96 - ch / h) * h
        col = rnd.choice(EARTH + PAPER)
        shadow = torn_poly(x0 + 4, y0 + 6, x0 + cw + 4, y0 + ch + 6, rnd)
        d.polygon(shadow, fill=(0, 0, 0, 28))
        d.polygon(torn_poly(x0, y0, x0 + cw, y0 + ch, rnd), fill=col + (255,))
    # Kreis als Gegengewicht
    r = rnd.uniform(0.08, 0.16) * w
    cx, cy = rnd.uniform(0.25, 0.75) * w, rnd.uniform(0.25, 0.75) * h
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rnd.choice(EARTH) + (235,))
    # feines Raster wie aus einem Rechenheft
    if rnd.random() > 0.4:
        gx0, gy0 = rnd.uniform(0.1, 0.5) * w, rnd.uniform(0.1, 0.5) * h
        for k in range(9):
            d.line([(gx0 + k * 22, gy0), (gx0 + k * 22, gy0 + 176)], fill=(40, 40, 38, 70), width=1)
            d.line([(gx0, gy0 + k * 22), (gx0 + 176, gy0 + k * 22)], fill=(40, 40, 38, 70), width=1)
    return img


def objekt(name, w, h, seed):
    rnd = random.Random(seed)
    # Fotostudio-Hohlkehle: Verlauf von hell nach etwas dunkler
    img = Image.new("RGB", (w, h))
    top, bot = (222, 219, 212), (196, 191, 182)
    for yy in range(h):
        t = yy / h
        img.paste(tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)), [0, yy, w, yy + 1])
    d = ImageDraw.Draw(img, "RGBA")
    ground = h * 0.78
    # Koerper: Stapel aus Bloecken
    x = w * 0.5
    y = ground
    for i in range(rnd.randint(2, 4)):
        bw, bh = rnd.uniform(0.18, 0.36) * w, rnd.uniform(0.08, 0.2) * h
        off = rnd.uniform(-0.05, 0.05) * w
        col = rnd.choice(EARTH)
        d.ellipse([x - bw * 0.7 + off, y - 10, x + bw * 0.7 + off, y + 18], fill=(0, 0, 0, 40)) if i == 0 else None
        d.rectangle([x - bw / 2 + off, y - bh, x + bw / 2 + off, y], fill=col + (255,))
        d.rectangle([x - bw / 2 + off, y - bh, x - bw / 2 + off + bw * 0.12, y], fill=(255, 255, 255, 30))
        y -= bh
    d.line([(x, y), (x + rnd.uniform(-30, 30), y - h * 0.18)], fill=(40, 40, 38, 255), width=4)
    img = img.filter(ImageFilter.GaussianBlur(0.8))
    return img


WORKS = [
    ("werk-01", painting, 1500, 1900),
    ("werk-02", collage, 1600, 1600),
    ("werk-03", objekt, 1400, 1750),
    ("werk-04", painting, 1900, 1400),
    ("werk-05", collage, 1400, 1850),
    ("werk-06", painting, 1500, 1500),
    ("werk-07", objekt, 1600, 1300),
    ("werk-08", collage, 1900, 1350),
    ("werk-09", painting, 1350, 1800),
    ("werk-10", collage, 1500, 1500),
    ("werk-11", objekt, 1400, 1800),
    ("werk-12", painting, 2000, 1250),
]

for i, (name, fn, w, h) in enumerate(WORKS):
    img = fn(name, w, h, seed=1952 + i * 7)
    img = grain(img, seed=i)
    img.save(OUT / f"{name}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
    small = img.copy()
    small.thumbnail((800, 800))
    small.save(OUT / f"{name}-800.jpg", "JPEG", quality=78, optimize=True, progressive=True)
    print(name, img.size)

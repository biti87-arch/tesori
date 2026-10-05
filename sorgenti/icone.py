"""Genera le icone dell'app (moneta e gemma d'oro su fondo bordeaux) per Android, Windows e web."""
from PIL import Image, ImageDraw
import math, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ORO = (212, 168, 75, 255); ORO2 = (139, 105, 20, 255); CHIARO = (245, 237, 208, 255)

def sfondo(n):
    im = Image.new('RGBA', (n, n)); px = im.load(); c = n / 2
    for y in range(n):
        for x in range(n):
            d = min(1, math.hypot(x - c, y - c) / (n * 0.72))
            a = (110, 40, 20); b = (48, 16, 10)
            px[x, y] = tuple(int(a[i] * (1 - d) + b[i] * d) for i in range(3)) + (255,)
    return im

def primo_piano(n):
    S = n * 4; im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); s = S / 1024
    def cerchio(cx, cy, r, col): dr.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=col)
    # pila di monete
    for i, (cx, cy) in enumerate([(380, 700), (560, 700), (470, 610)]):
        cerchio(cx, cy, 190, ORO2); cerchio(cx, cy - 22, 190, ORO); cerchio(cx, cy - 22, 140, ORO2); cerchio(cx, cy - 22, 125, ORO)
    # gemma
    gx, gy = 700, 330
    pts = [(gx, gy - 190), (gx + 150, gy - 60), (gx + 90, gy + 150), (gx - 90, gy + 150), (gx - 150, gy - 60)]
    dr.polygon([(x * s, y * s) for x, y in pts], fill=CHIARO)
    dr.polygon([(x * s, y * s) for x, y in [(gx, gy - 190), (gx + 150, gy - 60), (gx, gy + 20), (gx - 150, gy - 60)]], fill=(196, 89, 17, 255))
    dr.polygon([(x * s, y * s) for x, y in [(gx, gy + 20), (gx + 150, gy - 60), (gx + 90, gy + 150), (gx - 90, gy + 150), (gx - 150, gy - 60)]], fill=(139, 105, 20, 255))
    dr.polygon([(x * s, y * s) for x, y in [(gx, gy - 190), (gx + 150, gy - 60), (gx, gy + 20)]], fill=(232, 130, 50, 255))
    return im.resize((n, n), Image.LANCZOS)

def icona(n, rotonda=False):
    im = sfondo(n); im.alpha_composite(primo_piano(n))
    if rotonda:
        m = Image.new('L', (n * 4, n * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255)
        im.putalpha(m.resize((n, n), Image.LANCZOS))
    return im

def fg_adattivo(n):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); f = primo_piano(int(n * 0.62)); o = (n - f.size[0]) // 2
    im.alpha_composite(f, (o, o)); return im

def splash(w, h, scuro=False):
    im = Image.new('RGBA', (w, h), (48, 16, 10, 255) if scuro else (245, 237, 208, 255))
    f = primo_piano(int(min(w, h) * 0.32)); im.alpha_composite(f, ((w - f.size[0]) // 2, (h - f.size[1]) // 2)); return im

for d in ('assets', 'desktop', 'www'): os.makedirs(f'{R}/{d}', exist_ok=True)
icona(1024).save(f'{R}/assets/icon-only.png'); fg_adattivo(1024).save(f'{R}/assets/icon-foreground.png')
sfondo(1024).save(f'{R}/assets/icon-background.png')
splash(2732, 2732).save(f'{R}/assets/splash.png'); splash(2732, 2732, True).save(f'{R}/assets/splash-dark.png')
icona(512).save(f'{R}/desktop/icon.png'); icona(192).save(f'{R}/www/icona.png')
res = f'{R}/android/app/src/main/res'
for d in os.listdir(res):
    p = os.path.join(res, d)
    for fn in os.listdir(p):
        fp = os.path.join(p, fn)
        if not fn.endswith('.png'): continue
        w, h = Image.open(fp).size
        if fn == 'ic_launcher.png': icona(w).save(fp)
        elif fn == 'ic_launcher_round.png': icona(w, True).save(fp)
        elif fn == 'ic_launcher_foreground.png': fg_adattivo(w).save(fp)
        elif fn == 'ic_launcher_background.png': sfondo(w).save(fp)
        elif fn == 'splash.png': splash(w, h, 'night' in d).save(fp)
print('ok')

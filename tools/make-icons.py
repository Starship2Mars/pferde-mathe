#!/usr/bin/env python3
"""Symbol-Blatt (mehrere Gegenstaende auf gruenem Hintergrund) in einzelne WebP-Symbole mit Alpha zerlegen.
Aufruf: make-icons.py blatt.jpg ausgabeordner name1 name2 ... [--size 192] [--order rows]
Namen in Lesereihenfolge (Reihe fuer Reihe, links nach rechts). Mit '-' ueberspringt man einen Platz."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi

def main():
    a = sys.argv[1:]
    src, outdir = a[0], a[1]
    size = int(a[a.index('--size') + 1]) if '--size' in a else 192
    names = [x for i, x in enumerate(a[2:], 2) if not x.startswith('--') and a[i - 1] not in ('--size', '--merge')]
    arr = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    h, w, _ = arr.shape
    border = np.concatenate([arr[:6].reshape(-1, 3), arr[-6:].reshape(-1, 3), arr[:, :6].reshape(-1, 3), arr[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    d = np.sqrt(((arr - bg) ** 2).sum(-1))
    alpha = np.clip((d - 38) / 57, 0, 1)
    gscore = g - np.maximum(r, b)
    alpha = np.minimum(alpha, np.clip(1 - (gscore - 25) / 70, 0, 1))
    solid = alpha > 0.5
    # Gruppen: Teile, die nah beieinander liegen, gehoeren zu einem Symbol
    grp, n = ndi.label(ndi.binary_dilation(solid, iterations=int(a[a.index('--merge') + 1]) if '--merge' in a else 22))
    sizes = ndi.sum(solid, grp, range(1, n + 1))
    ids = [i + 1 for i in np.argsort(-sizes)[:len(names)]]
    objs = []
    for i in ids:
        ys, xs = np.where((grp == i) & solid)
        objs.append((i, ys.mean(), xs.mean()))
    objs.sort(key=lambda o: (round(o[1] / (h / 2)), o[2]) if False else (0 if o[1] < h / 2 else 1, o[2]))
    out = arr.copy(); out[..., 1] = np.minimum(g, np.maximum(r, b) + 4)
    alpha = ndi.gaussian_filter(alpha, 0.6)
    alpha = np.clip((alpha - 0.18) / 0.82, 0, 1)
    os.makedirs(outdir, exist_ok=True)
    for (i, cy, cx), name in zip(objs, names):
        if name == '-': continue
        m = ndi.binary_dilation(grp == i, iterations=3)
        al = alpha * m
        rgba = Image.fromarray(np.dstack([np.clip(out, 0, 255), al * 255]).astype(np.uint8), 'RGBA')
        bb = rgba.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        rgba = rgba.crop((max(bb[0] - 3, 0), max(bb[1] - 3, 0), min(bb[2] + 3, w), min(bb[3] + 3, h)))
        s = size / max(rgba.size)
        if s < 1: rgba = rgba.resize((round(rgba.width * s), round(rgba.height * s)), Image.LANCZOS)
        p = os.path.join(outdir, name + '.webp'); rgba.save(p, 'WEBP', quality=82, method=6)
        print(p, rgba.size, round(os.path.getsize(p) / 1024, 1), 'KB')
main()

#!/usr/bin/env python3
"""Photoreale Sprites freistellen: Bild auf grünem (Chroma) Hintergrund -> WebP mit Alpha.
Aufruf: make-sprite.py roh.jpg ausgabe.webp [--flip] [--width 420] [--key green|auto]
Entfernt den Hintergrund per Farbabstand (weicher Rand), entfernt Grünstich am Rand (Despill),
schneidet auf die Umrisse zu und speichert verkleinert (WebP, Qualität 82)."""
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

def main():
    a = sys.argv[1:]
    src, dst = a[0], a[1]
    flip = '--flip' in a
    width = int(a[a.index('--width') + 1]) if '--width' in a else 420
    key = a[a.index('--key') + 1] if '--key' in a else 'auto'
    im = Image.open(src).convert('RGB')
    arr = np.asarray(im).astype(np.float32)
    h, w, _ = arr.shape
    # Hintergrundfarbe aus den Rändern schätzen
    border = np.concatenate([arr[:6].reshape(-1, 3), arr[-6:].reshape(-1, 3), arr[:, :6].reshape(-1, 3), arr[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    d = np.sqrt(((arr - bg) ** 2).sum(-1))
    lo, hi = 38.0, 95.0
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    # Grünanteil: je grüner (g deutlich über r,b) desto eher Hintergrund
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    if key == 'green' or (key == 'auto' and bg[1] > bg[0] + 40 and bg[1] > bg[2] + 40):
        gscore = g - np.maximum(r, b)
        alpha = np.minimum(alpha, np.clip(1 - (gscore - 25) / 70, 0, 1))
    # größte zusammenhängende Fläche behalten (Rauschen weg), Löcher füllen
    solid = alpha > 0.5
    lab, n = ndi.label(solid)
    if '--all' in a:
        sizes = ndi.sum(solid, lab, range(1, n + 1)); alpha = alpha * ndi.binary_dilation(np.isin(lab, [i for i in range(1, n + 1) if sizes[i - 1] > 400]), iterations=3)
    elif n > 1:
        sizes = ndi.sum(solid, lab, range(1, n + 1)); keep = 1 + int(np.argmax(sizes))
        main_ = lab == keep
        # kleine Teile direkt am Hauptkörper (Schweif, Ohren) bleiben: dilatieren und erneut
        near = ndi.binary_dilation(main_, iterations=6)
        keepmask = np.isin(lab, [i for i in range(1, n + 1) if (near & (lab == i)).any() and sizes[i - 1] > 40])
        alpha = alpha * ndi.binary_dilation(keepmask, iterations=3)
    alpha = ndi.gaussian_filter(alpha, 0.6)
    # Randdekontamination: Grün am Rand auf Nachbarfarbe begrenzen
    out = arr.copy()
    if key == 'green' or (key == 'auto' and bg[1] > bg[0] + 40 and bg[1] > bg[2] + 40):
        lim = np.maximum(r, b) + 4
        out[..., 1] = np.minimum(g, lim)
    # Rand etwas nach innen ziehen (kein Halo)
    alpha = np.clip((alpha - 0.18) / 0.82, 0, 1)
    rgba = np.dstack([np.clip(out, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bbox = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 4
    bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, w), min(bbox[3] + pad, h))
    img = img.crop(bbox)
    if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(dst, 'WEBP', quality=82, method=6)
    print(dst, img.size, round(__import__('os').path.getsize(dst) / 1024), 'KB')
main()

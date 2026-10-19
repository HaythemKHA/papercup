#!/usr/bin/env python3
"""
PAPER CUP — thème v0 · optimisation des images.

    python3 tools/optimize-images.py <dossier-des-originaux>

Le dossier d'entrée reprend l'arborescence de https://www.papercup.com.tn/solixy-cms-assets/
(ex. <dossier>/img/home/6.png). Pour chaque entrée de tools/media-manifest.json, le script
écrit dans assets/images/ des variantes AVIF + WebP aux largeurs demandées, et
src/data/media.json (dimensions, chemins) utilisé par le build.
Prérequis : Pillow ≥ 11 compilé avec AVIF et WebP.
"""
import json, sys
from pathlib import Path
from PIL import Image, features

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]).resolve()
OUT = ROOT / 'assets' / 'images'
manifest = json.loads((ROOT / 'tools' / 'media-manifest.json').read_text())
assert features.check('webp') and features.check('avif'), 'Pillow doit gérer WebP et AVIF'

def save_variants(im, out, widths, alpha):
    variants = []
    for w in widths:
        w = min(w, im.width)
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS)
        if not alpha:
            r = r.convert('RGB')
        base = OUT / f'{out}-{w}'
        base.parent.mkdir(parents=True, exist_ok=True)
        r.save(f'{base}.webp', 'WEBP', quality=80 if not alpha else 82, method=6)
        r.save(f'{base}.avif', 'AVIF', quality=58 if not alpha else 62, speed=4)
        variants.append({'w': w, 'h': h})
    return variants

media = {}
for item in manifest['items']:
    im = Image.open(SRC / item['src'])
    im = im.convert('RGBA') if item.get('alpha') else im.convert('RGB')
    if item.get('trim'):
        bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        im = im.crop(bbox)
    v = save_variants(im, item['out'], sorted(set(item['widths'])), item.get('alpha', False))
    media[item['out']] = {'ratio': round(im.width / im.height, 4), 'variants': v, 'alpha': item.get('alpha', False)}
    print(f"{item['out']:42} {im.width}x{im.height} → {[x['w'] for x in v]}")

c = manifest['clients']
for n in c['ids']:
    im = Image.open(SRC / c['src'].format(n=n)).convert('RGB')
    out = f'clients/client-{n}'
    v = save_variants(im, out, [c['width']], False)
    media[out] = {'ratio': round(im.width / im.height, 4), 'variants': v, 'alpha': False}
print(f"{len(c['ids'])} logos clients")

(ROOT / 'src' / 'data' / 'media.json').write_text(json.dumps(media, indent=1) + '\n')

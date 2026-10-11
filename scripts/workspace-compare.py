# Usage: python3 scripts/workspace-compare.py <baseline-dir> <after-dir>
# JSON must be identical. A screenshot may differ only by anti-aliasing noise (no pixel more than
# 16 grey levels apart), which is what two runs of the same code show.
import json, glob, os, sys
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]; bad = 0
for f in sorted(glob.glob(f'{a}/*.json')):
    x, y = json.load(open(f)), json.load(open(f'{b}/{os.path.basename(f)}'))
    for k in sorted(set(x) | set(y)):
        if x.get(k) != y.get(k): bad += 1; print('JSON', os.path.basename(f), k)
for f in sorted(glob.glob(f'{a}/*.png')):
    g = f'{b}/{os.path.basename(f)}'
    p, q = Image.open(f).convert('RGB'), Image.open(g).convert('RGB')
    if p.size != q.size: bad += 1; print('SIZE', os.path.basename(f), p.size, q.size); continue
    # Anti-aliasing noise is a few grey levels; a real change is far stronger somewhere.
    d = ImageChops.difference(p, q).convert('L')
    strong = d.point(lambda v: 255 if v > 16 else 0).getbbox()
    if strong: bad += 1; print('PIXELS', os.path.basename(f), strong)
print('identical' if not bad else f'{bad} differences')

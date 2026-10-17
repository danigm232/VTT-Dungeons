"""Read-only alpha/component audit: do not modify generated or source PNGs."""
from collections import deque
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
result = {}
for path in sorted((root / 'campaigns/stormwreck-isle/public/art/m3/facing-20261012').glob('*.png')):
    image = Image.open(path).convert('RGBA')
    width, height = image.size
    alpha = image.getchannel('A').tobytes()
    seen = bytearray(width * height)
    components = []
    for start in range(len(alpha)):
        if alpha[start] < 32 or seen[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        count = 0
        left = right = start % width
        top = bottom = start // width
        while queue:
            pixel = queue.popleft()
            x, y = pixel % width, pixel // width
            count += 1
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            for other in (pixel - width if y else -1, pixel + width if y + 1 < height else -1,
                          pixel - 1 if x else -1, pixel + 1 if x + 1 < width else -1):
                if other >= 0 and not seen[other] and alpha[other] >= 32:
                    seen[other] = 1
                    queue.append(other)
        if count >= 100:
            components.append({'box': [left, top, right + 1, bottom + 1], 'pixels': count,
                               'seed': [start % width, start // width]})
    result[path.stem] = {'size': [width, height], 'components': sorted(components, key=lambda c: -c['pixels'])[:24]}
print(json.dumps(result))

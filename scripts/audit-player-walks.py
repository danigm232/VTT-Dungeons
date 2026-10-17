"""Read-only alpha audit and crop metadata. Never modifies PNGs."""
from collections import deque
from pathlib import Path
from statistics import median
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
results = {}
for path in sorted((root / 'campaigns/one-shot/public/art/player-walks-v2').glob('*.png')):
    im = Image.open(path).convert('RGBA')
    width, height = im.size
    alpha = im.getchannel('A').tobytes()
    seen = bytearray(width * height)
    groups = [[] for _ in range(8)]
    for start in range(len(alpha)):
        if alpha[start] < 32 or seen[start]: continue
        seen[start] = 1
        queue = deque([start])
        count = total_x = total_y = 0
        left = right = start % width
        top = bottom = start // width
        while queue:
            pixel = queue.popleft()
            x, y = pixel % width, pixel // width
            count += 1; total_x += x; total_y += y
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            for other in (pixel - width if y else -1, pixel + width if y + 1 < height else -1,
                          pixel - 1 if x else -1, pixel + 1 if x + 1 < width else -1):
                if other >= 0 and not seen[other] and alpha[other] >= 32:
                    seen[other] = 1; queue.append(other)
        if count < 24: continue
        col = min(3, int(total_x / count / (width / 4)))
        row = min(1, int(total_y / count / (height / 2)))
        groups[row * 4 + col].append({'box': [left, top, right + 1, bottom + 1], 'pixels': count, 'seed': [start % width, start // width]})
    frames = []
    for i, parts in enumerate(groups):
        if not parts: raise RuntimeError(f'Empty frame {path.name}/{i}')
        parts.sort(key=lambda p: -p['pixels'])
        body = parts[0]['box']
        if parts[0]['pixels'] < 4000 or body[2] - body[0] > width / 3:
            raise RuntimeError(f'Background or joined neighbours in {path.name}/{i}')
        if len(parts) > 12: raise RuntimeError(f'Too many disconnected pieces in {path.name}/{i}: {len(parts)}')
        x = max(0, min(p['box'][0] for p in parts) - 2)
        y = max(0, min(p['box'][1] for p in parts) - 2)
        right = min(width, max(p['box'][2] for p in parts) + 2)
        bottom = min(height, max(p['box'][3] for p in parts) + 2)
        # Hip-band centre, not a varying silhouette bbox or outstretched book.
        band_top = int(body[1] + (body[3] - body[1]) * .46)
        band_bottom = int(body[1] + (body[3] - body[1]) * .60)
        mass = weighted = 0
        for py in range(band_top, band_bottom):
            for px in range(body[0], body[2]):
                a = alpha[py * width + px]
                if a >= 96: mass += a; weighted += px * a
        pivot = weighted / mass if mass else (body[0] + body[2]) / 2
        frames.append({'x': x, 'y': y, 'width': right - x, 'height': bottom - y,
                       'anchorX': round((pivot - x) / (right - x), 6), 'anchorY': 1,
                       'alphaSeeds': [[p['seed'][0] - x, p['seed'][1] - y] for p in parts],
                       'bodyHeight': body[3] - body[1]})
    reference = median(f['bodyHeight'] for f in frames)
    for frame in frames:
        frame['logicalWidth'] = round(frame['width'] * 92 / reference, 6)
        frame['logicalHeight'] = round(frame['height'] * 92 / reference, 6)
        del frame['bodyHeight']
    results[path.stem] = {'size': [width, height], 'referenceHeight': reference, 'frames': frames}
print(json.dumps(results))

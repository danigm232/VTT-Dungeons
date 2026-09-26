from collections import deque
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "campaigns/stormwreck-isle/public/art/token-atlas.png"
out = root / "campaigns/stormwreck-isle/public/art/tokens"
out.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert("RGBA")
pixels = image.load()
w, h = image.size

def background_pixel(x: int, y: int) -> bool:
    r, g, b, _ = pixels[x, y]
    spread = max(r, g, b) - min(r, g, b)
    return spread <= 18 and min(r, g, b) >= 105

seen = bytearray(w * h)
queue = deque()
for x in range(w):
    for y in (0, h - 1):
        if background_pixel(x, y):
            queue.append((x, y)); seen[y * w + x] = 1
for y in range(h):
    for x in (0, w - 1):
        if background_pixel(x, y) and not seen[y * w + x]:
            queue.append((x, y)); seen[y * w + x] = 1

while queue:
    x, y = queue.popleft()
    pixels[x, y] = (*pixels[x, y][:3], 0)
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        idx = ny * w + nx
        if 0 <= nx < w and 0 <= ny < h and not seen[idx] and background_pixel(nx, ny):
            seen[idx] = 1; queue.append((nx, ny))

names = ("wizard", "cleric", "rogue", "harpy")
cell_w = w // 4
for index, name in enumerate(names):
    left = index * cell_w
    right = w if index == 3 else (index + 1) * cell_w
    token = image.crop((left, 0, right, h))
    alpha = token.getchannel("A")
    box = alpha.getbbox()
    if box is None:
        raise RuntimeError(f"No foreground found for {name}")
    token = token.crop(box)
    token.thumbnail((220, 220), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(token, ((256 - token.width) // 2, 236 - token.height))
    canvas.save(out / f"{name}.png", optimize=True)

print(f"Created {len(names)} transparent tokens in {out}")

"""Deterministic local repair of the Stormwreck training-door art.

The 0.2/0.3 assets are retained; this emits siblings and a SHA-256 manifest.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "campaigns/stormwreck-isle/public/art"
SOURCE = ART / "objects-v3"
TARGET = ART / "objects-v4"
TARGET.mkdir(exist_ok=True)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def repair_room() -> Path:
    source = ART / "objects-v2/wreck-objects-room-v2.png"
    original = Image.open(source).convert("RGBA")
    if original.size != (576, 432):
        raise ValueError("Unexpected room geometry")
    room = original.copy()
    # Recover the wood floor at the old partition site, then transfer the old
    # partition to the logical column. All operations are bounded to x=248..324.
    for top, bottom in [(0, 192), (230, 353)]:
        floor = original.crop((248, top, 272, bottom))
        room.paste(floor, (276, top))
    upper = original.crop((276, 0, 300, 176))
    room.paste(upper, (300, 0))
    # The fixed northern jamb reaches the exact north edge of the 48px door.
    room.paste(original.crop((276, 160, 300, 176)).resize((24, 16)), (300, 176))
    lower = original.crop((276, 230, 300, 353))
    room.paste(lower, (300, 240))
    # Re-establish the bottom joint without moving the exterior deck.
    room.paste(original.crop((276, 343, 300, 353)), (300, 353))
    output = TARGET / "wreck-objects-room-v4.png"
    room.save(output)
    return output


def wood_strip(damaged: bool) -> Image.Image:
    file = SOURCE / ("door-damaged-closed-v3.png" if damaged else "door-intact-closed-v3.png")
    image = Image.open(file).convert("RGBA")
    # Reuse the pixel-art timber itself, not the old framing/posts/perspective.
    timber = image.crop((34, 141 if not damaged else 146, 151, 158 if not damaged else 163))
    timber = timber.resize((48, 6), Image.Resampling.BOX)
    if damaged:
        timber = ImageEnhance.Contrast(timber).enhance(1.3)
    return timber


def leaf(damaged: bool, open_: bool) -> Image.Image:
    asset = Image.new("RGBA", (96, 96))
    draw = ImageDraw.Draw(asset)
    if open_:
        # H=(24,24), free end=(72,24): the same leaf turns 90 degrees east.
        draw.rectangle((25, 28, 73, 37), fill=(0, 0, 0, 51))
        draw.rectangle((24, 21, 72, 27), fill=(28, 18, 10, 255))
        asset.alpha_composite(wood_strip(damaged), (24, 21))
        draw.line((24, 21, 72, 21), fill=(204, 151, 77, 220), width=1)
        draw.line((24, 27, 72, 27), fill=(34, 23, 15, 255), width=1)
        for x in (28, 68):
            draw.rectangle((x, 22, x + 2, 25), fill=(99, 111, 101, 255))
    else:
        draw.rectangle((28, 25, 37, 73), fill=(0, 0, 0, 51))
        draw.rectangle((21, 24, 27, 72), fill=(28, 18, 10, 255))
        asset.alpha_composite(wood_strip(damaged).transpose(Image.Transpose.ROTATE_270), (21, 24))
        draw.line((21, 24, 21, 72), fill=(204, 151, 77, 220), width=1)
        draw.line((27, 24, 27, 72), fill=(34, 23, 15, 255), width=1)
        for y in (28, 68):
            draw.rectangle((22, y, 25, y + 2), fill=(99, 111, 101, 255))
    if damaged:
        # Repeat splinter/char locations in leaf-local coordinates in both poses.
        marks = [(41, 24), (54, 24), (63, 24)] if open_ else [(24, 41), (24, 54), (24, 63)]
        for x, y in marks:
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(14, 11, 9, 225))
            draw.line((x, y, x + (4 if open_ else 1), y + (1 if open_ else 4)), fill=(221, 174, 105, 255), width=1)
    return asset


def debris() -> Image.Image:
    asset = Image.new("RGBA", (96, 96))
    draw = ImageDraw.Draw(asset)
    # Low timber fragments stay inside the door cell, leaving the path open.
    for polygon in [((16, 43), (35, 38), (40, 45), (20, 51)),
                    ((34, 57), (53, 47), (61, 52), (47, 64)),
                    ((49, 34), (73, 40), (67, 46), (44, 40))]:
        draw.polygon(polygon, fill=(76, 54, 32, 244))
        draw.line((*polygon[0], *polygon[1]), fill=(172, 115, 55, 255), width=2)
    for x, y in [(26, 57), (59, 60), (68, 54), (30, 35)]:
        draw.polygon(((x, y), (x + 5, y - 2), (x + 2, y + 5)), fill=(106, 89, 62, 230))
    return asset


def main() -> None:
    inputs = [ART / "objects-v2/wreck-objects-room-v2.png", *(SOURCE / name for name in
        ("door-intact-closed-v3.png", "door-damaged-closed-v3.png"))]
    outputs = [repair_room()]
    for condition in ("intact", "damaged"):
        for state in ("closed", "open"):
            file = TARGET / f"door-{condition}-{state}-v4.png"
            leaf(condition == "damaged", state == "open").save(file)
            outputs.append(file)
    file = TARGET / "door-destroyed-v4.png"
    debris().save(file)
    outputs.append(file)
    manifest = {"method": "deterministic Pillow repair; retained v2/v3 originals", "inputs": {str(p.relative_to(ROOT)): digest(p) for p in inputs},
                "outputs": {str(p.relative_to(ROOT)): digest(p) for p in outputs}, "doorLogicalSize": [96, 96], "hinge": [24, 24]}
    (TARGET / "SOURCE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()

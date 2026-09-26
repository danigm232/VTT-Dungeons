from pathlib import Path
from PIL import Image
import sys


def contain_transparent(source: Path, target: Path, size: tuple[int, int]) -> None:
    image = Image.open(source).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"No alpha content in {source}")
    image = image.crop(bbox)
    margin = max(2, round(min(size) * 0.04))
    inner = (size[0] - margin * 2, size[1] - margin * 2)
    image.thumbnail(inner, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, optimize=True)


def main() -> None:
    if len(sys.argv) != 6:
        raise SystemExit("usage: process-object-art.py BACKGROUND CLOSED OPEN CRATE_H CRATE_V")
    output = Path("campaigns/stormwreck-isle/public/art/objects-v2")
    background = Image.open(sys.argv[1]).convert("RGB").resize((576, 432), Image.Resampling.LANCZOS)
    output.mkdir(parents=True, exist_ok=True)
    background.save(output / "wreck-objects-room-v2.png", optimize=True)
    contain_transparent(Path(sys.argv[2]), output / "door-closed-v2.png", (128, 128))
    contain_transparent(Path(sys.argv[3]), output / "door-open-v2.png", (128, 128))
    contain_transparent(Path(sys.argv[4]), output / "crate-horizontal-v2.png", (192, 96))
    contain_transparent(Path(sys.argv[5]), output / "crate-vertical-v2.png", (96, 192))
    for path in sorted(output.glob("*.png")):
        image = Image.open(path)
        print(f"{path}: {image.size[0]}x{image.size[1]} {image.mode}")


if __name__ == "__main__":
    main()

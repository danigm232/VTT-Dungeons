"""Register Mike and Mía's eight seat views from their original sheets."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ART = Path("campaigns/stormwreck-isle/public/art/characters/party-seat-views-v1")
CHARACTERS = ROOT / "prototypes/godot-shared/characters"
DIRECTIONS = ("s", "se", "e", "ne", "n", "nw", "w", "sw")
# Pelvis and midpoint of the boot soles in each original sheet cell.
CONTACTS = {
    "mia": [
        (223, 272, 224, 422), (213, 291, 272, 423), (163, 318, 292, 414),
        (157, 318, 254, 411), (222, 316, 218, 412), (302, 329, 212, 408),
        (302, 326, 149, 420), (241, 301, 181, 417),
    ],
    "mike": [
        (221, 255, 221, 427), (196, 257, 261, 422), (174, 268, 306, 411),
        (180, 270, 311, 404), (218, 259, 222, 422), (275, 262, 127, 404),
        (271, 267, 124, 415), (237, 266, 182, 425),
    ],
}
STANDING_REFERENCE = 530


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def import_sheet(actor: str, source: Path) -> None:
    sheet = Image.open(source)
    if sheet.mode != "RGBA" or sheet.size != (1774, 887):
        raise ValueError(f"Unexpected original sheet format for {actor}")
    destination = ROOT / ART / actor
    original = destination / "originals/seat-sheet.png"
    original.parent.mkdir(parents=True, exist_ok=True)
    if not original.exists():
        shutil.copyfile(source, original)
    if digest(original) != digest(source):
        raise ValueError(f"The stored original for {actor} differs")
    record = {"original": original.relative_to(ROOT).as_posix(),
              "originalSHA256": digest(original), "views": []}

    for index, direction in enumerate(DIRECTIONS):
        row, col = divmod(index, 4)
        cell = sheet.crop((col * sheet.width // 4, row * sheet.height // 2,
                           (col + 1) * sheet.width // 4, (row + 1) * sheet.height // 2))
        cell.putalpha(cell.getchannel("A").point(lambda value: value if value >= 8 else 0))
        left, top, right, bottom = cell.getchannel("A").getbbox()
        if min(left, top, cell.width - right, cell.height - bottom) < 7 or bottom - top < 380:
            raise ValueError(f"Missing resolution or clearance in {actor} {direction}")
        cropped = cell.crop((left - 2, top - 2, right + 2, bottom + 2))
        output = destination / f"seat-{direction}.png"
        cropped.save(output, optimize=True)
        x, y, boot_x, boot_y = CONTACTS[actor][index]
        pivot = [(x - left + 2) / cropped.width, (y - top + 2) / cropped.height]
        soles = [(boot_x - left + 2) / cropped.width, (boot_y - top + 2) / cropped.height]
        name = f"sw-{actor}-seat-{direction}.json"
        draft = CHARACTERS / "drafts" / name
        definition = json.loads(draft.read_text(encoding="utf-8"))
        definition.update(frames=[output.relative_to(ROOT).as_posix()],
                          pivot=pivot, soleContact=soles, referenceHeight=STANDING_REFERENCE)
        definition["production"]["original"] = record["original"]
        registered = CHARACTERS / "definitions/animations" / name
        registered.write_text(json.dumps(definition, indent=2) + "\n", encoding="utf-8")
        record["views"].append({"id": definition["id"], "file": definition["frames"][0],
                                "sha256": digest(output), "pelvis": pivot, "soles": soles,
                                "visiblePixels": [right - left, bottom - top]})
    (destination / "SOURCE_MANIFEST.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("actor", choices=tuple(CONTACTS))
    parser.add_argument("sheet", type=Path)
    args = parser.parse_args()
    import_sheet(args.actor, args.sheet)

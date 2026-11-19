"""Register the original overhead rest poses and their pillow contacts."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
CHARACTERS = ROOT / "prototypes/godot-shared/characters"
ART = ROOT / "campaigns/stormwreck-isle/public/art/characters/rest-poses-v1"
CONTACTS = {
    "mike": ((511, 176), (509, 1506)),
    "maria": ((510, 224), (512, 1516)),
    "mia": ((512, 197), (513, 1511)),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def register(actor: str, source: Path) -> None:
    image = Image.open(source)
    if image.mode != "RGBA":
        raise ValueError("The rest pose needs its original transparency")
    alpha = image.getchannel("A").point(lambda value: value if value >= 8 else 0)
    bounds = alpha.getbbox()
    left, top, right, bottom = bounds
    if bottom - top < 1000 or min(left, top, image.width - right, image.height - bottom) < 6:
        raise ValueError(f"Insufficient clearance or resolution for {actor}")
    image.putalpha(alpha)
    crop = image.crop((left - 3, top - 3, right + 3, bottom + 3))

    original = ART / "originals" / f"{actor}.png"
    original.parent.mkdir(parents=True, exist_ok=True)
    if not original.exists():
        shutil.copyfile(source, original)
    if digest(original) != digest(source):
        raise ValueError(f"Preserved original for {actor} does not match")
    derived = ART / f"{actor}-rest.png"
    crop.save(derived)

    def point(xy: tuple[int, int]) -> list[float]:
        x, y = xy
        return [(x - left + 3) / crop.width, (y - top + 3) / crop.height]

    head, boots = map(point, CONTACTS[actor])
    name = f"sw-{actor}-rest-on-bed.json"
    definition_path = CHARACTERS / "definitions/animations" / name
    source_definition = definition_path if definition_path.exists() else CHARACTERS / "drafts" / name
    definition = json.loads(source_definition.read_text(encoding="utf-8"))
    definition.update(frames=[derived.relative_to(ROOT).as_posix()], pivot=head,
                      soleContact=boots, referenceHeight=bottom - top)
    definition["production"].update(original=original.relative_to(ROOT).as_posix(),
                                    originalSHA256=digest(original), derivedSHA256=digest(derived))
    definition_path.write_text(json.dumps(definition, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("actor", choices=tuple(CONTACTS))
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    register(args.actor, args.source)

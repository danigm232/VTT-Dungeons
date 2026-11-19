"""Extract the eight authored seat views without resampling their pixels."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


WORKSPACE = Path(__file__).resolve().parent.parent
ART = Path("campaigns/stormwreck-isle/public/art/characters/seat-views-v1")
CHARACTERS = WORKSPACE / "prototypes/godot-shared/characters"
DEFINITIONS = CHARACTERS / "definitions/animations"
# Pelvis contact measured within each cell of the original 1774 × 887 sheet.
CONTACT = {
    "s": (230, 269),
    "se": (214, 276),
    "e": (185, 309),
    "ne": (183, 303),
    "n": (230, 292),
    "nw": (249, 302),
    "w": (251, 306),
    "sw": (217, 279),
}
STANDING_REFERENCE_PX = 510
# Midpoint of the two boot contacts, in pixels of each trimmed view.
SOLE_CONTACT = {
    "s": (95, 401), "se": (81, 402), "e": (151, 391), "ne": (152, 380),
    "n": (92, 381), "nw": (63, 384), "w": (52, 391), "sw": (76, 396),
}


def extract(source: Path) -> None:
    sheet = Image.open(source)
    if sheet.mode != "RGBA" or sheet.size != (1774, 887):
        raise ValueError("Expected the original Trinity RGBA sheet at 1774 × 887")

    root = WORKSPACE / ART
    original = root / "originals/trinity-seat-sheet.png"
    original.parent.mkdir(parents=True, exist_ok=True)
    if not original.exists():
        shutil.copyfile(source, original)
    if original.read_bytes() != source.read_bytes():
        raise ValueError("The original stored for this revision has a different checksum")

    records = []
    for index, (view, contact) in enumerate(CONTACT.items()):
        row, col = divmod(index, 4)
        rect = (
            col * sheet.width // 4,
            row * sheet.height // 2,
            (col + 1) * sheet.width // 4,
            (row + 1) * sheet.height // 2,
        )
        cell = sheet.crop(rect)
        # The generator emits distant RGB traces at alpha 1–7. Preserve the
        # drawn outline and remove those traces before cropping to the figure.
        cell.putalpha(cell.getchannel("A").point(lambda a: a if a >= 8 else 0))
        left, top, right, bottom = cell.getchannel("A").getbbox()
        if min(left, top, cell.width - right, cell.height - bottom) < 8:
            raise ValueError(f"{view} touches another cell")
        cropped = cell.crop((left - 2, top - 2, right + 2, bottom + 2))
        if cropped.height < 380:
            raise ValueError(f"{view} is below the intended native resolution")
        pivot = [
            (contact[0] - left + 2) / cropped.width,
            (contact[1] - top + 2) / cropped.height,
        ]
        image_path = ART / f"trinity-seated-{view}.png"
        cropped.save(WORKSPACE / image_path, optimize=True)
        definition_path = DEFINITIONS / f"sw-maria-seat-{view}.json"
        source_definition = (
            definition_path if definition_path.exists()
            else CHARACTERS / "drafts" / definition_path.name
        )
        definition = json.loads(source_definition.read_text(encoding="utf-8"))
        sole_contact = [
            SOLE_CONTACT[view][0] / cropped.width,
            SOLE_CONTACT[view][1] / cropped.height,
        ]
        if not definition.get("mirrorHorizontally"):
            definition.update(
                frames=[image_path.as_posix()],
                pivot=pivot,
                referenceHeight=STANDING_REFERENCE_PX,
                soleContact=sole_contact,
            )
            definition["production"]["original"] = original.relative_to(WORKSPACE).as_posix()
            definition_path.write_text(json.dumps(definition, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        records.append({
            "id": definition["id"],
            "definition": definition_path.relative_to(WORKSPACE).as_posix(),
            "derived": image_path.as_posix(),
            "sha256": hashlib.sha256((WORKSPACE / image_path).read_bytes()).hexdigest(),
            "cell": rect,
            "visiblePixels": [right - left, bottom - top],
            "pelvis": pivot,
            "soleContact": sole_contact,
        })

    manifest = {
        "reference": "prototypes/godot-campamentos/assets/tokens/animations/seated/rogue-seated.png",
        "original": original.relative_to(WORKSPACE).as_posix(),
        "originalSHA256": hashlib.sha256(original.read_bytes()).hexdigest(),
        "standingReferencePx": STANDING_REFERENCE_PX,
        "visualAudit": ["VA-01", "VA-03", "VA-10", "REF-01"],
        "acceptance": "pending user review",
        "views": records,
    }
    (root / "SOURCE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    extract(parser.parse_args().source)

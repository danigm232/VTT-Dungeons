"""Prepare private-table VTT assets from the user's ZIP without altering originals."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "campaigns/one-shot/source"
ART = ROOT / "campaigns/one-shot/public/art"
ART.mkdir(parents=True, exist_ok=True)

MAPS = {
    "temple": None,  # freshly generated original art, copied from the selected output
    "garden": "El jardin de la srta fritz IA.png",
    "cafe": "Cafe no-me-olvides IA.png",
    "market": "El Mercado Nocturno IA.png",
    "mirror": "El Espejo de plata del amor verdadero IA.png",
    "dinner": "Cena con Anteros.png",
}
TOKENS = {
    "anteros": "Astra_Anteros_circular.png",
    "fritz": "Astra_Srta-Fritz_circular.png",
    "roses": "Astra_Rosas-asesinas_circular.png",
    "patron": "Astra_Aldeano-cansado_circular_v02.png",
    "ben": "Astra_Ben_circular.png",
    "margaret": "Astra_Margaret_circular.png",
    "boris": "Astra_Boris-el-carnicero_circular.png",
    "cow": "Astra_Vaca-del-mercado_circular.png",
    "reflection": "Astra_Reflejo-de-hielo_circular.png",
}
PORTRAITS = {"bartender": "Astra_Aldeano-tabernario_retrato_v01.png",
             "patron-woman": "Astra_Aldeana_retrato_v01.png"}


def digest(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main() -> None:
    records: list[dict[str, object]] = []
    for slug, filename in MAPS.items():
        source = SOURCE / (filename or "temple-original.png")
        if not source.is_file():
            raise FileNotFoundError(source)
        target = ART / f"{slug}.png"
        shutil.copyfile(source, target)
        records.append({"role": "map", "slug": slug, "source": str(source.relative_to(ROOT)),
                        "output": str(target.relative_to(ROOT)), "size": Image.open(target).size,
                        "sha256": digest(target)})
    for slug, filename in TOKENS.items():
        source = SOURCE / "astra-tokens" / filename
        image = Image.open(source).convert("RGBA")
        image.thumbnail((192, 192), Image.Resampling.LANCZOS)
        target = ART / "tokens" / f"{slug}.png"
        target.parent.mkdir(exist_ok=True)
        image.save(target, optimize=True)
        records.append({"role": "token", "slug": slug, "source": str(source.relative_to(ROOT)),
                        "output": str(target.relative_to(ROOT)), "size": image.size,
                        "sha256": digest(target)})
    for slug, filename in PORTRAITS.items():
        source = SOURCE / "astra-tokens" / filename
        portrait = ImageOps.fit(Image.open(source).convert("RGBA"), (192, 192), Image.Resampling.LANCZOS)
        mask = Image.new("L", (192, 192)); ImageDraw.Draw(mask).ellipse((5, 5, 187, 187), fill=255)
        portrait.putalpha(mask)
        target = ART / "tokens" / f"{slug}.png"
        portrait.save(target, optimize=True)
        records.append({"role": "portrait-derived-token", "slug": slug, "source": str(source.relative_to(ROOT)),
                        "output": str(target.relative_to(ROOT)), "size": portrait.size, "sha256": digest(target)})
    # Reuse the existing player art, not its campaign data or rights assumptions.
    existing = ROOT / "campaigns/stormwreck-isle/public/art/tokens"
    for slug in ("wizard", "cleric", "rogue"):
        target = ART / "tokens" / f"{slug}.png"
        shutil.copyfile(existing / f"{slug}.png", target)
        records.append({"role": "player-token", "slug": slug, "source": str((existing / f"{slug}.png").relative_to(ROOT)),
                        "output": str(target.relative_to(ROOT)), "sha256": digest(target)})
    manifest = {"distribution": "private table only; third-party PDF/map rights not cleared for public release",
                "mapsAndTokens": records}
    (ART / "ASSET_MANIFEST.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {len(records)} private-table assets")


if __name__ == "__main__":
    main()

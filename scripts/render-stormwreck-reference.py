from pathlib import Path
import sys
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[1]
source = root / "OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf"
out = root / "output/stormwreck-characters-20261117/reference-pages"
out.mkdir(parents=True, exist_ok=True)
document = pdfium.PdfDocument(str(source))
for number in map(int, sys.argv[1:]):
    page = document[number - 1]
    image = page.render(scale=1.6).to_pil()
    path = out / f"page-{number:02}.png"
    image.save(path)
    print(str(path))

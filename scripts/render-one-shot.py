"""Read-only PDF inspection: render scanned adventure pages to temporary PNGs."""
from pathlib import Path
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[1]
source = root / "campaigns/one-shot/source/adventure.pdf"
out = root / "tmp/oneshot-pages"
out.mkdir(parents=True, exist_ok=True)
pdf = pdfium.PdfDocument(source)
for number, page in enumerate(pdf, 1):
    image = page.render(scale=1.5).to_pil()
    target = out / f"page-{number:02}.png"
    image.save(target)
    print(number, image.size, target)

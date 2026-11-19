from pathlib import Path
from hashlib import sha256
import json
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
source = root / "OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf"
out = root / "output/stormwreck-characters-20261117"
out.mkdir(parents=True, exist_ok=True)
reader = PdfReader(source)
pages = [{"pdfPage": i + 1, "text": page.extract_text() or ""} for i, page in enumerate(reader.pages)]
(out / "adventure-pages.json").write_text(json.dumps({"source": str(source), "sha256": sha256(source.read_bytes()).hexdigest(), "pages": pages}, ensure_ascii=False, indent=2), encoding="utf-8")
(out / "adventure-text.txt").write_text("\n\n".join(f"=== PDF PAGE {p['pdfPage']} ===\n{p['text']}" for p in pages), encoding="utf-8")
print(json.dumps({"pages": len(pages), "characters": sum(len(p["text"]) for p in pages), "pageStarts": [{"pdfPage": p["pdfPage"], "start": p["text"][:110]} for p in pages]}, ensure_ascii=True))

"""Return the image-tool-corrected anatomy patches to their exact source rectangles."""
from pathlib import Path
import json, hashlib, shutil
from PIL import Image
root=Path(__file__).resolve().parents[1]
out=root/'output/stormwreck-characters-20261117'
jobs=json.loads((out/'generated-jobs.json').read_text())
original=Path('C:/Users/User/.codex/generated_images/01a0b95d-1b97-75b2-9ce4-b7d86fc18e3c/exec-3e9efc00-e6e4-45e4-beae-384a6189684b.png'); corrected=Path(jobs['varnoth-eyes']['path'])
source=Image.open(original).convert('RGBA'); patches=Image.open(corrected).convert('RGBA')
mapping=json.loads((out/'varnoth-eye-patch-map.json').read_text())
for i,rectangle in enumerate(mapping['rectangles']):
    x,y=i%4,i//4
    patch=patches.crop((round(x*patches.width/4),round(y*patches.height/2),round((x+1)*patches.width/4),round((y+1)*patches.height/2)))
    # Deterministic registration/composition of AI-edited patches; never repaint.
    patch=patch.resize((100,96),Image.Resampling.LANCZOS)
    # The generated grid has a thin neighbouring-shirt spill across row two.
    # This six-pixel gutter is outside every original head (all start at y=9).
    patch.paste((0,0,0,0),(0,0,100,6))
    source.paste(patch,tuple(rectangle[:2]))
folder=root/'campaigns/stormwreck-isle/public/art/characters/base-v1/originals'
shutil.copyfile(corrected,folder/'varnoth-heads-corrected.png')
target=folder/'varnoth-eyes-composited.png';source.save(target)
report={'bodyOriginal':str(original),'bodySha256':hashlib.sha256(original.read_bytes()).hexdigest(),'editedHeads':str(corrected),'headsSha256':hashlib.sha256(corrected.read_bytes()).hexdigest(),'map':mapping,'operation':'Exact grid extraction and scale registration of image-tool-corrected heads into original body atlas; no repainting or per-phase body scaling','review':'viewer-right blind left eye and viewer-left right prosthesis checked; live-loop review pending'}
(out/'varnoth-eye-composition.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
jobs['varnoth']={'path':str(target),'promptFile':jobs['varnoth-eyes']['promptFile']}
(out/'generated-jobs.json').write_text(json.dumps(jobs,indent=2)+'\n')
print(json.dumps({'result':str(target)}))

"""Review-only GIF packaging; keep the eight registered art phases unchanged."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib
root=Path(__file__).resolve().parents[1];out=root/'output/stormwreck-characters-20261117'
gallery=json.loads((out/'idle-gallery-manifest.json').read_text(encoding='utf-8'))
folder=out/'loops';folder.mkdir(exist_ok=True)
contact=Image.new('RGB',(1080,1680),(20,32,36));draw=ImageDraw.Draw(contact)
records=[]
for index,actor in enumerate(gallery['records']):
    sources=[(out/p).resolve() for p in actor['frames']]
    frames=[Image.open(p).convert('RGBA') for p in sources]
    w,h=frames[0].size
    assert all(f.size==(w,h) for f in frames)
    factor=min(300/w,460/h)
    dimensions=(round(w*factor),round(h*factor))
    packaged=[]
    for frame in frames:
        canvas=Image.new('RGBA',(320,480),(20,32,36,255))
        phase=frame.resize(dimensions,Image.Resampling.LANCZOS)
        canvas.alpha_composite(phase,((320-dimensions[0])//2,470-dimensions[1]))
        packaged.append(canvas.convert('RGB'))
    palette=packaged[0].quantize(colors=256,dither=Image.Dither.NONE)
    indexed=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in packaged]
    duration=round(1000/actor['fps']/10)*10
    target=folder/(actor['id']+'.gif')
    indexed[0].save(target,save_all=True,append_images=indexed[1:],duration=duration,loop=0,disposal=2,optimize=False)
    with Image.open(target) as check: assert check.n_frames==8,actor['id']+' GIF dropped a phase'
    thumb=packaged[0].resize((136,204),Image.Resampling.LANCZOS)
    contact.paste(thumb,((index%6)*180+22,(index//6)*240+4))
    label=actor['name'].encode('latin-1','replace').decode('latin-1')[:26]
    draw.text(((index%6)*180+8,(index//6)*240+215),label,fill=(232,214,174))
    records.append({'id':actor['id'],'file':str(target.relative_to(root)).replace('\\','/'),'frames':8,'durationPerPhaseMs':duration,'source':[{'file':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources],'operation':'one common preview scale/canvas for all eight frames; no interpolation or per-phase body resizing'})
contact.save(out/'idle-roster-contact.png')
(out/'loop-exports.json').write_text(json.dumps({'cycles':len(records),'frames':len(records)*8,'records':records},indent=2),encoding='utf-8')
print(json.dumps({'cycles':len(records),'gifFrames':sum(r['frames'] for r in records),'contact':str(out/'idle-roster-contact.png')}))

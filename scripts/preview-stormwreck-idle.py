"""Package eight real native renders as a review loop; no sprite repainting."""
from pathlib import Path
import hashlib, json
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / 'output/stormwreck-characters-20261117'
native = folder / 'native'
target = folder / 'preview'
target.mkdir(exist_ok=True)
approval = target / 'runara-preview.json'
if approval.exists() and 'approved by user' in json.loads(approval.read_text(encoding='utf-8')).get('artisticAcceptance', ''):
    raise SystemExit('Approved Runara preview preserved. Use a versioned destination for a new proposal.')
paths = [native / f'sw-runara-idle-{i:02}.png' for i in range(1, 9)]
# Identical crop for all phases. Preserve the exact native rendering and scale.
crop = (480, 170, 800, 570)
frames = [Image.open(p).convert('RGB').crop(crop) for p in paths]
palette = frames[0].quantize(colors=256, dither=Image.Dither.NONE)
indexed = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in frames]
gif = target / 'runara-reposo-8.gif'
indexed[0].save(gif, save_all=True, append_images=indexed[1:], duration=400, loop=0, disposal=2, optimize=False)
webp = target / 'runara-reposo-8.webp'
frames[0].save(webp, save_all=True, append_images=frames[1:], duration=400, loop=0, lossless=True)
for i, im in enumerate(frames, 1): im.save(target / f'runara-{i:02}.png')
with Image.open(gif) as check:
    count = check.n_frames
    durations = []
    for i in range(count):
        check.seek(i)
        durations.append(check.info['duration'])
assert count == 8 and durations == [400] * 8
report = {'character':'sw-runara','action':'idle','frames':8,'fps':2.5,'loopSeconds':3.2,'sameCrop':crop,'operation':'GIF/WebP review packaging of exact native captures, no generated interpolation or body editing','source':[{'file':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],'gif':str(gif.relative_to(root)).replace('\\','/'),'artisticAcceptance':'pending user review'}
(target / 'runara-preview.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
html = '''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Runara · reposo de ocho fotogramas</title><style>body{margin:0;background:#142024;color:#f4ebd9;font:16px system-ui;display:grid;min-height:100vh;place-items:center}main{text-align:center;max-width:700px;padding:24px}h1{font:26px Georgia;margin:0 0 8px}p{color:#c6c6bc}img{height:min(66vh,600px);max-width:100%;object-fit:contain}button,input{font:inherit}button{color:inherit;background:#263a3e;border:1px solid #b49b64;border-radius:8px;padding:10px 18px;margin:8px}input{width:200px}label{display:block;margin:12px}small{display:block;color:#bdc7c8;margin:10px}</style><main><h1>Runara · animación en reposo</h1><p>Ocho fotogramas consecutivos · mismo ángulo · bucle de 3,2 segundos</p><img id="actor" src="runara-01.png" alt="Runara respirando en reposo"><div><button id="play">Pausar</button><button id="step">Un fotograma</button></div><label>Velocidad <input id="speed" type="range" min="1" max="6" step=".5" value="2.5"> <span id="rate">2,5 fps</span></label><small id="phase">Fotograma 1 / 8</small><p>Capturas reales del motor. Revisión visual pendiente.</p></main><script>const a=document.querySelector('#actor'),b=document.querySelector('#play'),s=document.querySelector('#speed'),p=document.querySelector('#phase');let f=0,playing=true,timer;const images=Array.from({length:8},(_,i)=>{const im=new Image();im.src='runara-'+String(i+1).padStart(2,'0')+'.png';return im});function draw(){a.src=images[f].src;p.textContent='Fotograma '+(f+1)+' / 8'}function start(){clearInterval(timer);timer=setInterval(()=>{if(playing){f=(f+1)%8;draw()}},1000/Number(s.value))}b.onclick=()=>{playing=!playing;b.textContent=playing?'Pausar':'Reproducir'};document.querySelector('#step').onclick=()=>{playing=false;b.textContent='Reproducir';f=(f+1)%8;draw()};s.oninput=()=>{document.querySelector('#rate').textContent=s.value.replace('.',',')+' fps';start()};start();</script></html>'''
(target / 'index.html').write_text(html,encoding='utf-8')
print(json.dumps({'gif':str(gif),'frames':count,'durationMs':durations,'viewer':str(target/'index.html')}))

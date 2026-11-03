"""Diagnostic contact sheets of the catalogue crops; never changes game PNGs."""
from pathlib import Path
from collections import deque
import json, sys
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
folder = Path(sys.argv[1] if len(sys.argv)>1 else root/'output/silverfarben-audit-20261020/before')
report = json.loads((folder/'catalogue.json').read_text(encoding='utf-8'))
cache = {}; crops = {}
def crop(frame):
    key=json.dumps(frame,sort_keys=True)
    if key in crops:return crops[key]
    frame = {'url':frame} if isinstance(frame,str) else frame
    url = frame['url']
    if url not in cache: cache[url] = Image.open(root/'campaigns/one-shot/public'/url.lstrip('/')).convert('RGBA')
    source = cache[url]
    if 'x' in frame:
        x,y,w,h = (frame[k] for k in ('x','y','width','height'))
        assert x>=0 and y>=0 and x+w<=source.width and y+h<=source.height, (url,frame)
        im = source.crop((x,y,x+w,y+h))
    else: im = source.copy()
    if frame.get('alphaSeeds'):
        w,h=im.size; a=im.getchannel('A').tobytes(); kept=bytearray(w*h); q=deque()
        for x,y in frame['alphaSeeds']:
            i=y*w+x
            assert 0<=x<w and 0<=y<h, (url,x,y)
            if a[i]>=32: kept[i]=1;q.append(i)
        while q:
            i=q.popleft();x,y=i%w,i//w
            for j in (i-1 if x else -1,i+1 if x+1<w else -1,i-w if y else -1,i+w if y+1<h else -1):
                if j>=0 and not kept[j] and a[j]>=32:kept[j]=1;q.append(j)
        mask=bytearray(a)
        for i in range(len(a)):
            x,y=i%w,i//w
            if not kept[i] and not ((x and kept[i-1]) or (x+1<w and kept[i+1]) or (y and kept[i-w]) or (y+1<h and kept[i+w])):mask[i]=0
        im.putalpha(Image.frombytes('L',(w,h),bytes(mask)))
    crops[key]=(im,frame)
    return im,frame

states = report['states']
names = [n for n in states if not n.startswith('direction-') and not n.startswith('idle-') and not n.startswith('disengage-')]
for page in range((len(names)+7)//8):
    subset=names[page*8:(page+1)*8]
    sheet=Image.new('RGB',(1340,len(subset)*180),'#193334');d=ImageDraw.Draw(sheet)
    for row,name in enumerate(subset):
        clip=states[name]; y=row*180
        d.text((8,y+6),f'{name} / {clip["fps"]}fps',fill='#ffe0a0')
        for col,frame in enumerate(clip['frames'][:8]):
            im,meta=crop(frame)
            if clip.get('flipX'): im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            lw=meta.get('logicalWidth',report['asset']['logicalWidth']);lh=meta.get('logicalHeight',report['asset']['logicalHeight'])
            im=im.resize((max(1,round(lw*1.35)),max(1,round(lh*1.35))),Image.Resampling.LANCZOS)
            ax=meta.get('anchorX',report['asset']['anchorX']);ay=meta.get('anchorY',report['asset']['anchorY'])
            if clip.get('flipX'): ax=1-ax
            px=180+col*145;py=y+162
            sheet.paste(im,(round(px-im.width*ax),round(py-im.height*ay)),im)
            d.line((px-30,py,px+30,py),fill='#718878');d.text((px-3,y+25),str(col),fill='#bed2cf')
    sheet.save(folder/f'contact-{page+1:02}.png')
print(json.dumps({'pages':(len(names)+7)//8,'clips':len(states),'pngs':len(cache)}))

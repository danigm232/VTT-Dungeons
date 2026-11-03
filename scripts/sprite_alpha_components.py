"""Map/character-independent atlas measurement; never changes source pixels."""
from collections import deque
from hashlib import sha256
import numpy as np
from PIL import Image


def components(alpha):
    h,w=alpha.shape;data=alpha.tobytes();seen=bytearray(w*h)
    labels=np.zeros((h,w),dtype=np.int32);flat=labels.ravel();parts=[]
    for start in range(w*h):
        if data[start]<32 or seen[start]:continue
        number=len(parts)+1;seen[start]=1;queue=deque([start]);area=0
        x0=x1=start%w;y0=y1=start//w
        while queue:
            pixel=queue.popleft();x,y=pixel%w,pixel//w;flat[pixel]=number;area+=1
            x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
            for other in (pixel-1 if x else -1,pixel+1 if x+1<w else -1,pixel-w if y else -1,pixel+w if y+1<h else -1):
                if other>=0 and not seen[other] and data[other]>=32:seen[other]=1;queue.append(other)
        parts.append({'box':[x0,y0,x1+1,y1+1],'area':area,'seed':[start%w,start//w],'label':number})
    return labels,parts


def measure_atlas(path,url,rows,columns,reference_height=None,logical_height=92,pivot_band=(.55,.75)):
    """One uniform anatomical scale per atlas, connected-alpha isolation per pose.

    reference_height is a standing-equivalent length, NOT the bounding height of
    a horizontal swimmer/crawler. Choosing it is a visual QA decision.
    """
    image=Image.open(path).convert('RGBA');w,h=image.size;pixels=np.asarray(image)
    alpha=pixels[:,:,3]
    if any(alpha[y,x]>=32 for x,y in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]):raise ValueError(f'{path}: opaque background')
    labels,parts=components(alpha);groups=[[] for _ in range(rows*columns)]
    for part in parts:
        if part['area']<8:continue
        x,y,r,b=part['box']
        row=min(rows-1,int((y+b)/2/h*rows));col=min(columns-1,int((x+r)/2/w*columns))
        groups[row*columns+col].append(part)
    frames=[];bodies=[];hashes=[]
    for index,group in enumerate(groups):
        group.sort(key=lambda p:-p['area'])
        if not group or group[0]['area']<1000:raise ValueError(f'{path}: missing body in cell {index}')
        if len(group)>12:raise ValueError(f'{path}: too many fragments in cell {index}')
        body=group[0];bx,by,br,bb=body['box'];bodies.append(body['box'])
        if br-bx>w/columns*1.25 or bb-by>h/rows*1.15:raise ValueError(f'{path}: joined neighbours at {index}: {body["box"]}')
        if len(group)>1 and group[1]['area']>body['area']*.65:raise ValueError(f'{path}: two bodies in cell {index}')
        for part in group:
            left,top,right,bottom=part['box']
            if left==0 or top==0 or right==w or bottom==h:raise ValueError(f'{path}: clipped silhouette at image edge, cell {index}')
        x=max(0,min(p['box'][0] for p in group)-2);y=max(0,min(p['box'][1] for p in group)-2)
        r=min(w,max(p['box'][2] for p in group)+2);b=min(h,max(p['box'][3] for p in group)+2)
        band=labels[by+int((bb-by)*pivot_band[0]):by+int((bb-by)*pivot_band[1]),bx:br]==body['label']
        points=np.argwhere(band);pivot=bx+float(points[:,1].mean()) if len(points) else (bx+br)/2
        frames.append({'url':url,'x':x,'y':y,'width':r-x,'height':b-y,
            'anchorX':round((pivot-x)/(r-x),6),'anchorY':round((bb-y)/(b-y),6),
            'alphaSeeds':[[p['seed'][0]-x,p['seed'][1]-y] for p in group]})
        isolated=pixels[y:b,x:r].copy();keep=np.isin(labels[y:b,x:r],[p['label'] for p in group]);isolated[~keep]=0
        hashes.append(sha256(isolated.tobytes()).hexdigest())
    if len(set(hashes))!=len(frames):raise ValueError(f'{path}: duplicate pose pixels, not six distinct drawings')
    reference_height=reference_height or bodies[0][3]-bodies[0][1]
    if reference_height<=0:raise ValueError('Invalid anatomical scale')
    scale=logical_height/reference_height
    for frame in frames:
        frame['logicalWidth']=round(frame['width']*scale,6);frame['logicalHeight']=round(frame['height']*scale,6)
    return {'size':[w,h],'rows':rows,'columns':columns,'referenceHeight':reference_height,
        'frames':frames,'bodyBounds':bodies,'poseHashes':hashes,'sourceSha256':sha256(path.read_bytes()).hexdigest()}

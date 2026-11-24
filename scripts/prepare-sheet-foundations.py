"""Rebuild the sheet's UI-only derivatives from the project's original paintings."""
from collections import deque
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ART = Path(__file__).resolve().parents[1] / "prototypes/godot-shared/character_sheet/art"
OUT = ART / "foundation"
OUT.mkdir(exist_ok=True)
atlas_sources = [
    ("v4/illustrated-icons.png", 5, 3, "heart shield speed initiative star hand dexterity book eye history feather magic casting die leaf"),
    ("v5/action-icons.png", 4, 3, "short-sword arcane-missiles burning-hands arcane-barrier magic-detection sacred-flame help dodge disengage dash hide concentration"),
    ("v2/icons-v2.png", 6, 4, "backpack gold potion mace handaxe shortbow dagger frost healing bless wand spellbook quill stealth key holy wizard soldier chainmail gloves torch lantern heraldic-shield hourglass"),
    ("engraved-icons.png", 4, 3, "_ _ _ _ _ sword _ _ _ _ _ _"),
]
icons, records = {}, {}


def separate(source, cols, rows):
    """Assign whole ink islands to cells. Fixed cell edges split several originals."""
    alpha = source.getchannel("A")
    small = alpha.copy()
    small.thumbnail((480, 480))
    mask = np.asarray(small) > 15
    h, w = mask.shape
    labels = np.full((h, w), -1, dtype=np.int16)
    seen = np.zeros((h, w), dtype=bool)
    islands = []
    for sy, sx in np.argwhere(mask):
        if seen[sy, sx]:
            continue
        queue, points = deque([(int(sx), int(sy))]), []
        seen[sy, sx] = True
        while queue:
            x, y = queue.pop()
            points.append((x, y))
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < w and 0 <= ny < h and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx] = True
                    queue.append((nx,ny))
        xx, yy = np.array(points).T
        cell = min(cols-1, int(xx.mean()*cols/w)) + cols*min(rows-1, int(yy.mean()*rows/h))
        if len(xx) < h*w/(cols*rows)*.035:
            islands.append((xx,yy))
        else:
            labels[yy,xx] = cell
    # Detached sparks can cross a nominal grid line. Attach them to the
    # nearest painted silhouette, before extracting any rectangle.
    solid_y,solid_x=np.where(labels>=0)
    for xx,yy in islands:
        nearest=np.argmin((solid_x-xx.mean())**2+(solid_y-yy.mean())**2)
        labels[yy,xx]=labels[solid_y[nearest],solid_x[nearest]]
    for index in range(cols*rows):
        expanded = Image.fromarray(np.uint8(labels==index)*255).filter(ImageFilter.MaxFilter(5))
        membership = expanded.resize(source.size, Image.Resampling.NEAREST)
        original = np.asarray(alpha)
        final = np.where((np.asarray(membership)>0) & (original>=12), original, 0).astype("uint8")
        tile = source.copy()
        tile.putalpha(Image.fromarray(final))
        bounds = tile.getbbox()
        if not bounds:
            raise ValueError(f"Empty icon {index}")
        yield bounds, tile.crop(bounds)


def normalized(tile, side=96):
    # Give fine blades more area than heavy discs. Balance their optical centre
    # against their extents, while guaranteeing a clear border on all four sides.
    density = np.asarray(tile.getchannel("A")).mean()/255
    extent = round(side*np.clip(.96-.13*density,.80,.92))
    tile.thumbnail((extent,extent), Image.Resampling.LANCZOS)
    aa = np.asarray(tile.getchannel("A"),dtype=float)
    y,x = np.indices(aa.shape)
    cx,cy = (aa*x).sum()/aa.sum(),(aa*y).sum()/aa.sum()
    shift = np.array([cx-tile.width/2,cy-tile.height/2])*.36
    pos = np.rint(np.clip((side-np.array(tile.size))/2-shift,4,side-np.array(tile.size)-4)).astype(int)
    canvas = Image.new("RGBA",(side,side))
    canvas.alpha_composite(tile,tuple(pos))
    return canvas


for file, cols, rows, names in atlas_sources:
    source = Image.open(ART/file).convert("RGBA")
    for key, (bounds,tile) in zip(names.split(),separate(source,cols,rows),strict=True):
        if key != "_":
            icons[key] = normalized(tile)
            records[key] = dict(source=file, bounds=bounds)

for key, base in (("throw-dagger","dagger"),("throw-handaxe","handaxe")):
    icon = Image.new("RGBA",(96,96))
    draw = ImageDraw.Draw(icon)
    for x,y in ((8,54),(10,65),(21,69)):
        draw.line((x,y+11,x+21,y-8),fill="#6a4525",width=4)
        draw.line((x,y+10,x+20,y-8),fill="#ebbd60",width=2)
    icon.alpha_composite(icons[base].resize((78,78), Image.Resampling.LANCZOS),(13,1))
    icons[key] = normalized(icon.crop(icon.getbbox()))
    records[key] = dict(source=records[base]["source"], derivedFrom=base, treatment="engraved motion trails")

sheet = Image.new("RGBA",(8*96,96*((len(icons)+7)//8)))
for i,(key,im) in enumerate(icons.items()):
    sheet.paste(im,((i%8)*96,(i//8)*96))
    records[key].update(cell=i, visible=im.getbbox())
sheet.save(OUT/"symbols.png",optimize=True)


def clear_paper(image):
    """Flood the connected writing surface, retaining isolated gilt highlights."""
    small = image.copy()
    small.thumbnail((820,820))
    rgb=np.array(small.convert("RGB"),dtype=float)
    r,g,b=rgb.transpose(2,0,1)
    eligible=(g>120)&(b>57)&(r-g<83)&(b/g.clip(1)>.47)
    mask=Image.fromarray(eligible.astype("uint8")*255).copy()
    seed=(small.width//2,small.height//2)
    assert mask.getpixel(seed)==255
    ImageDraw.floodfill(mask,seed,127)
    outside=Image.fromarray(np.uint8(np.array(mask)!=127)*255)
    outside=outside.filter(ImageFilter.MinFilter(3)).resize(image.size,Image.Resampling.LANCZOS)
    image.putalpha(Image.fromarray(np.minimum(np.array(outside),np.array(image.getchannel("A")))))
    assert image.getpixel((image.width//2,image.height//2))[3]==0
    return image


clear_paper(Image.open(ART/"manuscript-frame.png").convert("RGBA")).save(OUT/"binding.png",optimize=True)
royal=Image.open(ART/"v7/royal-controls.png").convert("RGBA")
plate=royal.crop((royal.width//2,0,royal.width,royal.height//2))
plate=plate.crop(plate.getchannel("A").point(lambda a:255 if a>=32 else 0).getbbox())
clear_paper(plate).save(OUT/"gilt.png",optimize=True)

# The same hand-made vellum supplies both long tonal variations and fine fibres.
painting=Image.open(ART/"v5/paper.png").convert("RGB")
original=painting.convert("L")
macro=np.array(original.resize((128,86)).filter(ImageFilter.GaussianBlur(4)).resize(original.size,Image.Resampling.BICUBIC),dtype=float)
grain=np.asarray(original,dtype=float)-np.asarray(original.filter(ImageFilter.GaussianBlur(2)),dtype=float)
vellum=np.asarray(painting,dtype=float)*.65 + np.array([245,232,207])*.35
vellum+=((macro-np.median(macro))*.12+grain*.20)[:,:,None]
Image.fromarray(np.uint8(np.clip(vellum,0,255))).save(OUT/"vellum.jpg",quality=94,subsampling=0)

places=Image.open(ART/"v5/ink-places.png").convert("RGBA")
themes="mountains keep ruins forest library coast".split()
def print_ink(tile, theme, relief=False):
    tile.thumbnail((650,370),Image.Resampling.LANCZOS)
    grey=np.asarray(tile.convert("L"),dtype=float)
    if relief:
        field=np.asarray(tile.convert("L").filter(ImageFilter.GaussianBlur(2.5)),dtype=float)
        darkness=np.clip((field-grey)*5.8,0,196)
    else:
        local=np.asarray(tile.convert("L").filter(ImageFilter.GaussianBlur(3.2)),dtype=float)
        darkness=np.clip((205-grey)*.60+(local-grey)*2.1,0,205)*(np.asarray(tile.getchannel("A"))/255)
    y,x=np.indices(grey.shape)
    u=np.abs(2*x/max(1,tile.width-1)-1)
    v=np.abs(2*y/max(1,tile.height-1)-1)
    # A long, irregular feather removes the hard sides of the library engraving.
    rim=np.maximum(u**3,v**3)+.21*(u*v)**1.5+.055*np.sin(x/23)*np.cos(y/16)
    fade=np.clip((1-rim)/.62,0,1)
    if relief: fade*=np.minimum(np.clip((1-u)*12,0,1),np.clip((1-v)*12,0,1))
    layer=Image.new("RGBA",tile.size,(91,57,34))
    layer.putalpha(Image.fromarray(np.uint8(darkness*fade**1.35)))
    layer.save(OUT/("ink-"+theme+".png"),optimize=True)

for i,theme in enumerate(themes):
    x,y=i%3,i//3
    print_ink(places.crop((x*724,y*362,(x+1)*724,(y+1)*362)),theme)
chapel=Image.open(ART/"v2/mia-stage.png").convert("RGBA")
print_ink(chapel.crop((8,0,1016,1496)),"temple",True)
sources=[file for file,_,_,_ in atlas_sources]+["manuscript-frame.png","v7/royal-controls.png","v5/paper.png","v5/ink-places.png","v2/mia-stage.png"]
manifest={"symbols":records,"sources":{p:sha256((ART/p).read_bytes()).hexdigest() for p in sources},
          "themes":themes+["temple"],"scope":"UI, ornamental frames and printed scenery"}
(OUT/"catalogue.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")

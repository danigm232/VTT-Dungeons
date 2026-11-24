"""Compose the labelled proof sheets from the textures exported by Godot."""
import json
import sys
from hashlib import sha256
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"output/ficha-fase-0"
ART=ROOT/"prototypes/godot-shared/character_sheet/art/foundation"
FONT=ART.parents[1]/"fonts/CrimsonPro.ttf"
def font(size,bold=False):
    face=ImageFont.truetype(str(FONT),size)
    face.set_variation_by_axes([710 if bold else 480])
    return face

def paste(canvas,icon,x,y,limit):
    icon=icon.convert("RGBA")
    icon.thumbnail(limit,Image.Resampling.LANCZOS)
    canvas.paste(icon,(round(x+(limit[0]-icon.width)/2),round(y+(limit[1]-icon.height)/2)),icon)

families=[
    ("Lectura y estadísticas","book sword magic backpack history feather edit close heart shield speed initiative star hand dexterity eye die casting leaf"),
    ("Acciones, magia y rasgos","short-sword arcane-missiles burning-hands arcane-barrier magic-detection sacred-flame help dodge disengage dash hide concentration throw-dagger throw-handaxe combat/unarmed combat/ready combat/search combat/study combat/influence combat/use-object healing bless holy stealth frost"),
    ("Equipo, objetos y controles",""),
]
translations={
    "amulet":"Amuleto","arcane-barrier":"Escudo arcano","arcane-missiles":"Misil mágico","arrows":"Flechas",
    "backpack":"Mochila","bedroll":"Saco de dormir","bless":"Bendición","book":"Libro","boots":"Botas",
    "bottle":"Botella","burning-hands":"Manos ardientes","casting":"Foco arcano","chainmail":"Cota de malla",
    "chest":"Cofre","cloak":"Capa","close":"Cerrar","combat/unarmed":"Golpe sin armas","compass":"Brújula",
    "components":"Componentes","concentration":"Concentración","crowbar":"Palanqueta","dagger":"Daga",
    "dash":"Correr","dexterity":"Destreza","die":"Dado","disengage":"Destrabarse","dodge":"Esquivar",
    "edit":"Editar","eye":"Sabiduría","feather":"Pluma","frost":"Rayo de escarcha","gem":"Gema",
    "gloves":"Guantes","gold":"Oro","hammer":"Martillo","hand":"Fuerza","handaxe":"Hacha de mano",
    "healing":"Palabra de curación","heart":"Corazón","helmet":"Yelmo","help":"Ayudar",
    "heraldic-shield":"Escudo heráldico","hide":"Esconderse","history":"Historia","holy":"Emblema sagrado",
    "hourglass":"Reloj de arena","initiative":"Iniciativa","ink":"Tinta","key":"Llave","lantern":"Farol",
    "leaf":"Especie","leather":"Cuero","mace":"Maza","magic":"Conjuros","magic-detection":"Detectar magia",
    "map":"Mapa","other":"Objeto genérico","plus":"Añadir","potion":"Poción","quill":"Pluma de escritura",
    "rations":"Raciones","ring":"Anillo","robe":"Túnica","rope":"Cuerda","sacred-flame":"Llama sagrada",
    "scroll":"Pergamino","shield":"Escudo","short-sword":"Espada corta","shortbow":"Arco corto","soldier":"Soldado",
    "spear":"Lanza","speed":"Velocidad","spellbook":"Grimorio","star":"Competencia","stealth":"Sigilo",
    "store":"Guardar","sword":"Combate","take":"Sacar","throw-dagger":"Lanzar daga","throw-handaxe":"Lanzar hacha",
    "tinderbox":"Yesquero","tools":"Herramientas","torch":"Antorcha","transfer":"Transferir","undo":"Deshacer",
    "wand":"Varita","waterskin":"Cantimplora","wizard":"Mago","combat/ready":"Preparar","combat/search":"Buscar",
    "combat/study":"Estudiar","combat/influence":"Influir","combat/use-object":"Usar objeto"
}
rows=json.loads((OUT/"simbolos.json").read_text("utf8"))
atlas=Image.open(OUT/"simbolos-godot.png")
by_id={}
for i,row in enumerate(rows):
    id=row["id"]
    if id not in translations: raise ValueError("Falta nombre de revisión: "+id)
    x,y=i%8*96,i//8*96
    by_id[id]=atlas.crop((x,y,x+96,y+96))
groups=[]
assigned=set()
for name,ids in families:
    keys=[key for key in ids.split() if key in by_id] if ids else sorted(set(by_id)-assigned,key=lambda key:translations[key])
    assigned.update(keys)
    groups.append((name,keys))
columns,tile_width,tile_height=7,165,106
width=columns*tile_width+48
height=106+sum(54+((len(keys)+columns-1)//columns)*tile_height for _,keys in groups)+270
page=Image.new("RGB",(width,height),"#f2e3c8")
draw=ImageDraw.Draw(page)
draw.text((25,18),"Iconografía de la ficha",font=font(44,True),fill="#382419")
draw.text((26,70),f"{len(rows)} símbolos del catálogo de Godot · {sum(r['seen'] for r in rows)} cargados al recorrer las fichas de Mike, Mia y Trinit",font=font(21),fill="#68472e")
y=100
for name,keys in groups:
    draw.rounded_rectangle((20,y,width-20,y+40),5,fill="#542522")
    draw.text((33,y+4),name,font=font(26,True),fill="#fff1cc")
    y+=47
    for i,key in enumerate(keys):
        x=24+(i%columns)*tile_width
        top=y+(i//columns)*tile_height
        draw.line((x,top+tile_height-4,x+tile_width-12,top+tile_height-4),fill="#c7ae87")
        paste(page,by_id[key],x,top,(tile_width-12,56))
        draw.text((x+(tile_width-12)//2,top+60),translations[key],font=font(18,True),anchor="mt",fill="#322219")
        draw.text((x+(tile_width-12)//2,top+84),key,font=font(14),anchor="mt",fill="#705941")
    y+=((len(keys)+columns-1)//columns)*tile_height+7
draw.rounded_rectangle((20,y,width-20,y+39),5,fill="#542522")
draw.text((33,y+3),"Indicadores dibujados por Godot",font=font(26,True),fill="#fff1cc")
seals=Image.open(OUT/"sellos.png")
for i,name in enumerate(["Sin registrar","Sin competencia","Competencia","Pericia","Espacio disponible","Espacio gastado"]):
    x=24+i*tile_width
    paste(page,seals.crop((i*48,0,i*48+48,48)),x,y+47,(tile_width-8,46))
    draw.text((x+(tile_width-8)//2,y+101),name,font=font(18),anchor="mt",fill="#382419")
paste(page,Image.open(OUT/"insignia-ca.png"),24+6*tile_width,y+47,(tile_width-8,46))
draw.text((24+6.5*tile_width,y+101),"Insignia de CA",font=font(18),anchor="mt",fill="#382419")
draw.text((28,y+140),"Puntos de golpe",font=font(23,True),fill="#382419")
for i in range(6):
    paste(page,Image.open(OUT/f"latido-{i}.png"),215+i*85,y+131,(67,61))
page.crop((0,0,width,y+210)).save(OUT/"lamina-iconos.png",optimize=True)

state_plate=Image.new("RGB",(760,150),"#f0dfbf")
draw=ImageDraw.Draw(state_plate)
draw.text((18,8),"Pestaña de Combate",font=font(28,True),fill="#39251c")
for i,(key,caption) in enumerate(zip(["normal","hover","selected","disabled"],["En reposo","Bajo el puntero","Seleccionada","Deshabilitada"])):
    paste(state_plate,Image.open(OUT/f"estado-{key}.png"),i*190+4,48,(181,53))
    draw.text((i*190+95,115),caption,font=font(20),anchor="mt",fill="#4e3222")
state_plate.save(OUT/"estados.png")

inks=["library","keep","coast","forest","temple","mountains","ruins"]
names=["Biblioteca","Castillo","Costa","Bosque","Templo","Montaña","Ruinas"]
paper=Image.open(ART/"vellum.jpg").resize((1120,535))
draw=ImageDraw.Draw(paper)
draw.text((22,15),"Grabados sobre el pergamino común",font=font(33,True),fill="#432c1e")
for i,(key,name) in enumerate(zip(inks,names)):
    im=Image.open(ART/f"ink-{key}.png")
    edge=im.getchannel("A")
    assert all(edge.crop(rect).getextrema()[1]==0 for rect in [(0,0,im.width,1),(0,0,1,im.height),(im.width-1,0,im.width,im.height),(0,im.height-1,im.width,im.height)])
    x,y=12+i%4*275,75+i//4*223
    paste(paper,im,x,y,(260,157))
    draw.text((x+130,y+172),name,font=font(23,True),anchor="mt",fill="#654127")
paper.save(OUT/"grabados.jpg",quality=93)

proof=json.loads((OUT/"ayuda.json").read_text("utf8"))
im=Image.open(OUT/"ayuda-accion.png")
x,y,w,h=map(int,proof["card"])
im.crop((max(0,x-18),max(0,y-18),min(im.width,x+w+18),min(im.height,y+h+18))).save(OUT/"ayuda-detalle.png")
if len(sys.argv)>1:
    origin=Path(sys.argv[1])
    refs={}
    for key,file in zip(["resumen","combate","conjuros","inventario","historia"],[
        "Resumen del mago elfo Mike-1.png","Hoja de combate de Mike, mago elfo-2.png",
        "Interfaz de conjuros del mago elfo Mike-3.png","Inventario del mago elfo Mike-4.png",
        "Crónica del aventurero élfico-5.png"]):
        source=origin/file
        with Image.open(source) as im:
            refs[key]={"file":file,"size":im.size,"sha256":sha256(source.read_bytes()).hexdigest()}
            im.thumbnail((1000,625),Image.Resampling.LANCZOS)
            im.convert("RGB").save(OUT/("referencia-"+key+".jpg"),quality=91)
    (OUT/"referencias.json").write_text(json.dumps(refs,ensure_ascii=False,indent=2),encoding="utf8")
print(f"{len(rows)} símbolos auditados; siete grabados y cuatro estados.")

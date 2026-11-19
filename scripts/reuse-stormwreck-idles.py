"""Extract existing authored eight-phase rest rows; preserve current anatomy/scale."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib
root=Path(__file__).resolve().parents[1];lib=root/'prototypes/godot-shared/characters'
sprites=root/'prototypes/godot-shared/sprites'
catalog=json.loads((sprites/'frames.json').read_text())
out=root/'output/stormwreck-characters-20261117'
contact=Image.new('RGB',(1440,900),(23,35,40));draw=ImageDraw.Draw(contact)
for row,key in enumerate(['zombie','zombie-2','zombie-3','zombie-4','harpy']):
    atlas_id=key+('-utility' if key=='harpy' else '-reactions')
    spec=catalog['atlases'][atlas_id];source=sprites/spec['file'];image=Image.open(source).convert('RGBA')
    folder=root/'campaigns/stormwreck-isle/public/art/characters/base-v1'/key;folder.mkdir(exist_ok=True)
    files=[];hashes=[]
    for i,frame in enumerate(spec['frames'][56:64]):
        x,y,w,h=[int(frame[n]) for n in ['x','y','width','height']]
        phase=image.crop((x,y,x+w,y+h));path=folder/f'idle-{i+1:02}.png';phase.save(path)
        files.append(str(path.relative_to(root)).replace('\\','/'));hashes.append(hashlib.sha256(phase.tobytes()).hexdigest())
        preview=phase.copy();preview.thumbnail((174,168));contact.paste(preview,(i*180+(180-preview.width)//2,row*180+12),preview)
    assert len(set(hashes))==8,key+' repeats phases'
    character=json.loads((lib/'definitions/characters'/f'{key}.json').read_text(encoding='utf-8'))
    definition={'version':1,'id':'sw-'+key+'-idle8','kind':'animation','name':character['name']+' · reposo ocho fases','campaign':'stormwreck-isle','anatomy':character['anatomy'],'character':key,'action':'idle','direction':'s','frames':files,'fps':2.5,'loop':True,'pivot':[.5,1-6/h],'referenceHeight':spec['reference_height'],'minimumDistinctFrames':8,'compatibility':{'anatomies':[character['anatomy']],'equipment':False,'overlays':True},'dependencies':[],'events':[],'initialFrame':0,'transition':'preserve existing support and scale','production':{'method':'reuse-existing-authored-idle-row','original':str(source.relative_to(root)).replace('\\','/'),'originalSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'atlas':atlas_id,'indices':list(range(56,64)),'operation':'Exact metadata rectangle extraction, no generation, repainting or per-frame scale changes'},'review':{'technical':'eight distinct pixel hashes verified','visual':'pending row and native-loop review','userAcceptance':'pending','evidence':[]},'limitations':['One authored front-facing idle cycle. Existing other directions remain intact.','The two harpy encounter actors retain one shared appearance with existing runtime variants.']}
    (lib/'drafts'/f'sw-{key}-idle8.json').write_text(json.dumps(definition,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    draw.text((row*0+5,row*180+163),key,fill=(240,210,150))
contact.save(out/'reused-idle-contact.png')
print(json.dumps({'cycles':5,'frames':40,'distinctPerCycle':8,'contact':str(out/'reused-idle-contact.png')}))

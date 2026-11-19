"""Register existing idle stance by translation; keep original atlases and scale."""
from pathlib import Path
from PIL import Image
import json, hashlib, shutil
root=Path(__file__).resolve().parents[1];out=root/'output/stormwreck-characters-20261117'
lib=root/'prototypes/godot-shared/characters'
records=[]
for key in ['harpy','zombie','zombie-2','zombie-3','zombie-4']:
    path=lib/'definitions/animations'/f'sw-{key}-idle8.json'
    d=json.loads(path.read_text(encoding='utf-8'))
    backup=out/'pre-registration'/key;backup.mkdir(parents=True,exist_ok=True)
    images=[];points=[];originals=[]
    for filename in d['frames']:
        file=root/filename;before=backup/file.name
        if not before.exists():shutil.copyfile(file,before)
        im=Image.open(before).convert('RGBA');alpha=im.getchannel('A');bounds=alpha.getbbox()
        support=alpha.crop((0,round(bounds[3]-(bounds[3]-bounds[1])*.25),im.width,bounds[3])).getbbox()
        points.append(((support[0]+support[2])/2,bounds[3]));images.append(im)
        originals.append({'file':str(before.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(before.read_bytes()).hexdigest()})
    width,height=images[0].size
    # Extra canvas protects wing tips and clothing during horizontal registration.
    canvas_width=width+128;baseline=height-6;offsets=[];aligned=[]
    for filename,im,(x,y) in zip(d['frames'],images,points):
        dx=round(canvas_width/2-x);dy=baseline-y
        registered=Image.new('RGBA',(canvas_width,height+12),(0,0,0,0));registered.paste(im,(dx,dy));aligned.append(registered)
        offsets.append([dx,dy])
    bounds=[im.getchannel('A').getbbox() for im in aligned]
    half=max(canvas_width/2-min(b[0] for b in bounds),max(b[2] for b in bounds)-canvas_width/2)+10
    crop=(round(canvas_width/2-half),max(0,min(b[1] for b in bounds)-10),round(canvas_width/2+half),baseline+10)
    for filename,im in zip(d['frames'],aligned):im.crop(crop).save(root/filename)
    new_height=crop[3]-crop[1];pivot=[.5,(baseline-crop[1])/new_height]
    report={'id':d['id'],'originals':originals,'supportCenters':points,'translations':offsets,'commonCrop':crop,'canvas':[crop[2]-crop[0],new_height],'pivot':pivot,'operation':'Shared-canvas translation registration and ONE shared symmetric crop of the complete lower stance; no per-phase scaling, repainting or anatomical changes','userAcceptance':'pending'}
    report_file=out/(key+'-support-registration.json');report_file.write_text(json.dumps(report,indent=2),encoding='utf-8')
    d['pivot']=pivot;d['production']['supportRegistration']=str(report_file.relative_to(root)).replace('\\','/')
    d['production']['operation']='Exact atlas rectangle extraction; translated stance registration; one shared symmetric crop; no repainting or per-phase scaling'
    d['review']['technical']='eight distinct frames; support registered; native verification pending'
    d['review']['evidence'].append(str(report_file.relative_to(root)).replace('\\','/'))
    path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    records.append({'id':d['id'],'horizontalDriftBeforePixels':max(x for x,y in points)-min(x for x,y in points),'verticalDriftBeforePixels':max(y for x,y in points)-min(y for x,y in points),'newCanvas':[canvas_width,height]})
print(json.dumps(records))

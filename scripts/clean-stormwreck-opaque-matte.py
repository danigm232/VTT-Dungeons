"""Alpha-matte cleanup only. Visible opaque painting and registration stay intact."""
from pathlib import Path
from PIL import Image
import json, hashlib, shutil
root=Path(__file__).resolve().parents[1];lib=root/'prototypes/godot-shared/characters'
out=root/'output/stormwreck-characters-20261117'
for key in ['ghoul','myconid-adult','runara-dragon']:
    path=lib/'definitions/characters'/f'sw-{key}.json';d=json.loads(path.read_text(encoding='utf-8'))
    backup=out/'pre-alpha-cleanup'/key;backup.mkdir(parents=True,exist_ok=True);records=[]
    for filename in d['source']['files']:
        file=root/filename;original=backup/file.name
        if not original.exists():shutil.copyfile(file,original)
        image=Image.open(original).convert('RGBA');before=image.getchannel('A').getbbox();alpha=image.getchannel('A').point(lambda a:0 if a<24 else a)
        image.putalpha(alpha);clean=Image.new('RGBA',image.size,(0,0,0,0));clean.paste(image,(0,0),alpha.point(lambda a:255 if a else 0));clean.save(file)
        records.append({'source':str(original.relative_to(root)).replace('\\','/'),'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'candidate':filename,'candidateSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'boundsBefore':before,'boundsAfter':alpha.getbbox()})
    report={'id':d['id'],'operation':'Remove only alpha<24/255 fringe from opaque figures; preserve every remaining RGBA value, dimensions and body calibration; no rescaling or repainting','phases':records,'distinctPhases':len({r['candidateSha256'] for r in records})}
    assert report['distinctPhases']==8
    report_file=out/f'{key}-alpha-matte.json';report_file.write_text(json.dumps(report,indent=2),encoding='utf-8')
    d['production']['alphaMatteReport']=str(report_file.relative_to(root)).replace('\\','/')
    d['review']['technical']='alpha fringe cleaned; targeted native verification pending'
    path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (lib/'drafts'/f'sw-{key}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'id':d['id'],'frames':8,'rawAlphaFootEnds':[r['boundsAfter'][3] for r in records]}))

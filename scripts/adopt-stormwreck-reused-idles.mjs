import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
for(const key of ['zombie','zombie-2','zombie-3','zombie-4','harpy']){
 const file=resolve(root,'prototypes/godot-shared/characters/drafts/sw-'+key+'-idle8.json');
 const d=JSON.parse(await readFile(file,'utf8'));
 d.review.visual='eight-phase row reviewed: same individual and front view, slow idle movement; native continuous playback pending';
 d.review.evidence=['output/stormwreck-characters-20261117/reused-idle-contact.png'];
 await writeFile(file,JSON.stringify(d,null,2)+'\n');
 const r=spawnSync(process.execPath,[resolve(root,'scripts/character-pipeline.mjs'),'adopt','--file',file],{cwd:root,encoding:'utf8'});
 if(r.status){process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status);}
 console.log(JSON.stringify({adopted:d.id,phases:8}));
}

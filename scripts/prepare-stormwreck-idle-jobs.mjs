import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out='output/stormwreck-characters-20261117';
const roster=JSON.parse(await readFile(resolve(root,out,'roster.json'),'utf8'));
const common=await readFile(resolve(root,out,'idle8-common.prompt.txt'),'utf8');
const jobs=[];
for(const entry of roster.newBases){
 const key=entry.id.replace(/^sw-/,'');
 const d=JSON.parse(await readFile(resolve(root,entry.definition),'utf8'));
 let prompt='Use case: stylized-concept. '+common+'\nSubject: '+entry.name+'. '+d.production.brief+'.\nReferences: first image establishes the warm inked painted art language ONLY; do not copy the woman or her robe. Any additional adventure illustration is an anatomy/species reference, not scenery or a game texture. Clothing is baked into this new base; no separate equipable assets.';
 if(d.anatomy.startsWith('reptilian')) prompt+=' Kobold anatomy: a long narrow reptile muzzle, nonhuman reptilian head, two arms with clawed hands, two digitigrade legs with three-toed clawed feet, one tail. Not a human with a reptile mask. Two modest swept horns. Never add extra limbs.';
 if(d.anatomy==='reptilian-small') prompt+=' This kobold has NO WINGS.';
 if(d.anatomy==='reptilian-winged-small') prompt+=' Two wings are separate from two arms, never replace the hands with wing hands. Fold wings near the back to keep a readable compact idle silhouette.';
 if(d.anatomy==='fungal-biped'||key==='violet-fungus') prompt+=' Fungal idle: slow subtle cap and gill breathing, slight independent tendril settling, stable root support. No humanoid skin or clothes, no jumping or walking.';
 if(d.anatomy==='dragon-quadruped') prompt+=' Exactly FOUR walking legs, TWO distinct wings, ONE tail. Wings folded but recognisable, never mistaken for extra legs. Compact three-quarter grounded idle; subtle nostril/chest breathing and tail-tip settling. Keep all paws planted.';
 if(key==='spore-octopus') prompt+=' Idle arms flex softly at tips while support points stay stable; keep exactly eight complete readable arms, no detached bits or extra arm fragments.';
 if(key==='fume-drake') prompt+=' Idle is gently swirling green smoky body with a readable central silhouette. Eight distinct sequential wisps; no bones, legs or feet.';
 if(key==='stirge') prompt+=' Hovering idle: eight sequential small wingbeat phases, fixed head/body scale and consistent six legs/proboscis; not eight directions. Whole wing span fits every cell.';
 const promptFile=out+'/'+key+'-idle8.prompt.txt';
 try{await access(resolve(root,promptFile));}catch{await writeFile(resolve(root,promptFile),prompt+'\n');}
 const refs=['campaigns/stormwreck-isle/public/art/characters/base-v1/runara/idle-01.png'];
 if(key==='myla')refs.push(out+'/reference-pages/page-09.png');
 if(['sinensa','myconid-adult','myconid-sprout'].includes(key))refs.push(out+'/reference-pages/page-45.png');
 if(['runara-dragon','aidron'].includes(key))refs.push(out+'/reference-pages/page-41.png');
 if(key==='sparkrender')refs.push(out+'/reference-pages/page-40.png');
 if(key==='fire-snake')refs.push(out+'/reference-pages/page-47.png');
 if(key==='owlbear')refs.push(out+'/reference-pages/page-46.png');
 jobs.push({id:key,definition:entry.definition,promptFile,references:refs});
}
await writeFile(resolve(root,out,'idle-jobs.json'),JSON.stringify(jobs,null,2)+'\n');
console.log(JSON.stringify({jobs:jobs.length,baseViews:1,phasesPerIdle:8}));

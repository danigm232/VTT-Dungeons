import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/loading-identity-v6');
const candidate=await readFile(resolve(out,'candidate/catalog.json')),data=JSON.parse(candidate);
const base=await readFile(resolve(out,'base-catalog.json'));
const reviewed=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/characters/scopes/loading-identities-v6.json'),'utf8'));
if(reviewed.status!=='reviewed-candidate'||reviewed.revision!==data.identityRegistry.revision)throw Error('Install blocked: character resources are not promoted at this revision');
const projects=['pecio','retiro','campamentos'];
let previous={records:[]};try{previous=JSON.parse(await readFile(resolve(out,'installation.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
for(const p of projects){const current=await readFile(resolve(root,`prototypes/godot-${p}/loading/catalog.json`));const known=previous.records.some(r=>r.project===p&&r.catalogSha256===createHash('sha256').update(current).digest('hex'));if(!current.equals(base)&&!current.equals(candidate)&&!known)throw Error('Install blocked: another task changed '+p+' loading data');}
const records=[];
for(const p of projects){const path=resolve(root,`prototypes/godot-${p}/loading`);await mkdir(resolve(path,'art'),{recursive:true});
 for(let i=JSON.parse(base).atlasCount;i<data.atlasCount;i++){const src=resolve(out,`candidate/art/atlas-${i}.webp`),dst=resolve(path,`art/atlas-${i}.webp`);let identical=false;try{identical=(await readFile(src)).equals(await readFile(dst));}catch(error){if(error.code!=='ENOENT')throw error;}if(!identical)await copyFile(src,dst);}
 await writeFile(resolve(path,'catalog.json'),candidate);
 records.push({project:p,catalogSha256:createHash('sha256').update(candidate).digest('hex'),scopeRevision:reviewed.revision});
}
await writeFile(resolve(out,'installation.json'),JSON.stringify({scope:'loading-identities-v6',records,notes:'Only selected loading art/catalog changed. Coordinators, maps, network sessions and other character definitions preserved.'},null,2));
console.log('Reviewed loading identities installed in Pecio, Retiro and Campamentos; shared map work preserved.');

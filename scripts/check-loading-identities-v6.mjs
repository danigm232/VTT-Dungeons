import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {importLibrary} from './character-pipeline.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/loading-identity-v6');
const baseline=JSON.parse(await readFile(resolve(out,'base-catalog.json'),'utf8'));
const candidate=JSON.parse(await readFile(resolve(out,'candidate/catalog.json'),'utf8'));
let checks=0;function check(value,message){assert.ok(value,message);checks++;}
for(const actor of ['mike','mia','maria'])for(const scene of baseline.scenes){
 const old=baseline.actors[actor].scenes[scene.id],next=candidate.actors[actor].scenes[scene.id];
 if(actor!=='mike'&&scene.id!=='persuasion'){assert.deepEqual(next,old,actor+'/'+scene.id+' must remain unchanged');checks++;continue;}
 for(const choice of [next.ambient,next.prepare,...next.success,...next.failure,next.settledSuccess,next.settledFailure]){
  const clip=candidate.selections[choice.clip];
  check(clip.identityVersion===6,actor+'/'+scene.id+' must use reviewed identity family');
  if(scene.id==='persuasion')check(clip.paired&&clip.sourceDefinition.endsWith(`sw-${actor}-loading-handshake-v6.json`),'Same hero/merchant pair in EVERY phase');
  check(clip.frames.every(id=>id>=baseline.frames.length),'Old rejected hero frames must not reappear');
 }
}
const expectedScenes=structuredClone(baseline.scenes);
expectedScenes.find(s=>s.id==='medicine').successAnimation.caption='Termina el vendaje; el compañero comprueba el brazo y le da las gracias.';
check(JSON.stringify(candidate.scenes)===JSON.stringify(expectedScenes),'Scene layout, props and rules preserved; medicine caption matches seated thanks');
await assert.rejects(importLibrary({scope:'../escape',onlyIds:['mike']}),/safe name/);checks++;
await assert.rejects(importLibrary({scope:'loading-identities-v6',onlyIds:['missing-loading-character']}),/Unknown scoped/);checks++;
await assert.rejects(importLibrary({scope:'loading-identities-v6',onlyIds:['sw-mike-loading-scroll-v6']}),/Import blocked/);checks++;
await writeFile(resolve(out,'catalog-checks.json'),JSON.stringify({passed:true,checks,scope:'Mike identities and paired merchant only; 34 other hero/skill combinations byte-identical'},null,2));
console.log('LOADING_IDENTITY_CHECKS '+checks+' passed; 0 failed');

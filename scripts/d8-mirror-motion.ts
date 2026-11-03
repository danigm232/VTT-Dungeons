import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GameState} from '../engine/server/game';
import {oneShotBundle} from '../campaigns/one-shot/server';
const dir=process.argv[2]??'output/d8-mirror-candidate-20261018';
const e0=JSON.parse(await readFile(`${dir}/e0.json`,'utf8'));
const state=new GameState(oneShotBundle);state.claim('c'.repeat(32),'motion-review','maria');state.changeScene('mirror');
const hero=state.characters.get('maria')!,frames:any[]=[];const started=Date.now();
const capture=()=>{const snapshot=state.publicSnapshot();snapshot.camera={mode:'follow',focusId:'maria'};frames.push({at:Date.now()-started,snapshot});};
capture();
for(const route of e0.routes.slice(1,process.argv.includes('--perimeter')?undefined:3))for(const next of route.path.slice(1)){
 const facing=next.col>hero.cell.col?'east':next.col<hero.cell.col?'west':next.row>hero.cell.row?'south':'north';
 assert(state.startStep(hero,facing));capture();
 while(hero.step){await new Promise(r=>setTimeout(r,80));state.tick();capture();}
 assert.deepEqual(hero.cell,next);assert.equal(hero.hp,hero.maxHp);
}
await writeFile(`${dir}/movement-fixtures.json`,JSON.stringify({durationMs:Date.now()-started,frames}));
console.log(`Movement replay: ${frames.length} authoritative frames, no damage, ${Date.now()-started}ms`);

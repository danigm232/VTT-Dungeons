import {readFile, writeFile, mkdir, readdir, copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd();
const folder=path.resolve(process.env.CAMPS_REVIEW_OUTPUT??'output/camps-detail-20261011');
const [before,after,files]=await Promise.all([
 readFile(path.join(folder,'visual-report-before.json'),'utf8').then(JSON.parse),
 readFile(path.join(folder,'visual-report.json'),'utf8').then(JSON.parse),
 readdir(folder)
]);
const scenes=['camp-a1-rooms','camp-forest-pleamar','camp-wreck-beach','camp-cliffs-observatory','camp-coastal-refuge'];
const describe=samples=>({
 samples:samples.length,
 allReady:samples.every(s=>s.ready&&s.visibility==='visible'),
 meshes:Math.max(...samples.map(s=>s.meshes)),
 vertices:Math.max(...samples.map(s=>s.vertices)),
 maxDrawCalls:Math.max(...samples.map(s=>s.drawCalls)),
 observedFpsRange:samples.some(s=>typeof s.observedFps==='number')?
  [Math.min(...samples.map(s=>s.observedFps)),Math.max(...samples.map(s=>s.observedFps))]:null,
 renderSizes:[...new Set(samples.filter(s=>s.renderWidth).map(s=>`${s.renderWidth}x${s.renderHeight}`))],
 compactProfiles:[...new Set(samples.map(s=>s.compact).filter(s=>s!==undefined))]
});
const captures=await Promise.all(files.filter(f=>/^(before|after|desktop|mobile-portrait|mobile-landscape)-.*\.png$/.test(f)).map(async file=>{
 const data=await readFile(path.join(folder,file));
 return {file,width:data.readUInt32BE(16),height:data.readUInt32BE(20),bytes:data.length};
}));
const summary={date:'2026-10-11',scenes:scenes.map(scene=>({scene,before:describe(before.filter(s=>s.scene===scene)),after:describe(after.filter(s=>s.scene===scene))})),
 captureCounts:Object.fromEntries(['before','after','desktop','mobile-portrait','mobile-landscape'].map(prefix=>[prefix,captures.filter(c=>c.file.startsWith(prefix+'-')).length])),
 deviceCaptures:captures.filter(c=>!c.file.startsWith('before-')&&!c.file.startsWith('after-')),
 performanceLimit:'Browser measurements on Intel UHD; viewport emulation is not physical mobile or projector certification.'};
const assertions=new Map(),suiteNames=new Set();
for(const name of ['focal-tests.json','supporting-tests.json','grid-tests.json']){
 const report=JSON.parse(await readFile(path.join(folder,name),'utf8'));
 for(const suite of report.testResults){
  if(/d8-v48\.test\.ts$/.test(suite.name))continue;
  suiteNames.add(suite.name);
  for(const result of suite.assertionResults)assertions.set(suite.name+':'+result.fullName,result.status);
 }
}
summary.directedTests={uniqueTests:assertions.size,files:suiteNames.size,passed:[...assertions.values()].filter(s=>s==='passed').length,
 failed:[...assertions.values()].filter(s=>s==='failed').length,reports:['focal-tests.json','supporting-tests.json','grid-tests.json'],
 excluded:'D8 V48 reproduction is outside camps and remains documented separately.'};
await mkdir(path.join(folder,'source-after'),{recursive:true});
const sources=['a1-visuals.ts','outdoor-visuals.ts','camp-atmosphere.ts','camp-detail-kit.ts'];
for(const file of sources)await copyFile(path.join(root,'campaigns/camp-rests/public',file),path.join(folder,'source-after',file));
for(const [file,name] of [['apps/web/world.ts','world.ts'],['engine/client/terrain3d.ts','terrain3d.ts']])await copyFile(path.join(root,file),path.join(folder,'source-after',name));
const manifest=[];
for(const name of [...sources.map(f=>'campaigns/camp-rests/public/'+f),
 'apps/web/world.ts','engine/client/terrain3d.ts',
 'campaigns/camp-rests/public/art/camp-detail-v1/foliage-atlas.png',
 'campaigns/camp-rests/public/art/camp-detail-v1/coastal-rock.png']){
 const data=await readFile(path.join(root,name));manifest.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(path.join(folder,'detail-summary.json'),JSON.stringify(summary,null,2));
await writeFile(path.join(folder,'source-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({scenes:summary.scenes,captureCounts:summary.captureCounts},null,2));

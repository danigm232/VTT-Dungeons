import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root=path.resolve('output/godot-pecio-layers-20261114');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,''));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifests=[read('manifest.json'),read('finish-manifest.json')];
let verifiedOriginals=0;
for(const manifest of manifests) for(const original of manifest.originals){
  const bytes=fs.readFileSync(path.join(root,original.file));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),original.sha256,original.file);
  assert.equal(bytes.readUInt32BE(16),1280,original.file);
  assert.equal(bytes.readUInt32BE(20),720,original.file);
  verifiedOriginals++;
}
const references=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>match[1]);
let verifiedReferences=0;
for(const reference of references){
  if(/^(?:https?:|data:)/.test(reference)) continue;
  const target=path.resolve(root,reference);
  assert(target.startsWith(root+path.sep),reference);
  assert(fs.statSync(target).isFile(),reference);
  verifiedReferences++;
}
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
for(const [index,script] of scripts.entries()) new vm.Script(script,{filename:`report-inline-${index}.js`});
const comparisons=(html.match(/data-vtt-comparison data-title=/g)||[]).length;
assert.equal(comparisons,32);
assert(html.includes('id="finish"')&&html.includes('id="finish-profile"')&&html.includes('id="finish-view"'));
assert.equal(manifests[1].captures,105);
assert.equal(manifests[1].construction_captures,15);
assert.equal(manifests[1].regressions.length,6);
const result={verified_originals:verifiedOriginals,verified_local_references:verifiedReferences,inline_scripts_parsed:scripts.length,comparisons,finish_captures:105,construction_captures:15,browser_interaction:'not verified: local browser access blocked by browser URL policy',fps_measured:false};
fs.writeFileSync(path.join(root,'report-validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));

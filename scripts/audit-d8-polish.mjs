import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..'),source=resolve(root,'campaigns/one-shot/playground');
const unpack=text=>JSON.parse(JSON.parse(JSON.parse(text).payload).code);
const previous=unpack(await readFile(resolve(source,'historico/playground_v64.json'),'utf8'));
const currentSource=await readFile(resolve(source,'d8night.config.ts'),'utf8');
const config=async(code)=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const [before,after]=await Promise.all([config(previous.files['d8night.config.ts']),config(currentSource)]);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rows=Object.keys(after.D8NIGHT.maps).map(id=>{
  const keys=['CANON','MAP','spawn','camera','label'];
  const checks=Object.fromEntries(keys.map(key=>[key,digest(before.D8NIGHT.maps[id][key])===digest(after.D8NIGHT.maps[id][key])]));
  return {scene:id,checks,gameplayDigest:digest(keys.map(key=>after.D8NIGHT.maps[id][key]))};
});
const functions=code=>{
  const file=ts.createSourceFile('renderer.ts',code,ts.ScriptTarget.Latest,true),result={};
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name)result[node.name.text]=node.getText(file);ts.forEachChild(node,visit);};visit(file);return result;
};
const oldFunctions=functions(previous.files['renderer.ts']),newFunctions=functions(await readFile(resolve(source,'renderer.ts'),'utf8'));
const gameplayFunctions=Object.fromEntries(['setupGameplayGeometryV17','navigationZoneAtV17','buildAmbientInspectablesV17','performSceneryActionV17','blocked','interaction'].map(name=>[name,Boolean(oldFunctions[name]&&oldFunctions[name]===newFunctions[name])]));
const result={baseline:'V64',candidate:after.D8_VERSION,rows,gameplayFunctions,checkedAt:new Date().toISOString()};
await mkdir(resolve(root,'output/d8-polish-20261016'),{recursive:true});
await writeFile(resolve(root,'output/d8-polish-20261016/gameplay-invariants.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(rows.some(row=>Object.values(row.checks).includes(false))||Object.values(gameplayFunctions).includes(false))process.exitCode=1;

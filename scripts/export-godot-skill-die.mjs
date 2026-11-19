import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..');
const source=(await readFile(resolve(root,'apps/web/ui/skill-d20.ts'),'utf8')).replace('export class SkillD20','class SkillD20');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const hook=`\nconst svg=document.querySelector('#die svg');svg.setAttribute('viewBox','0 0 220 220');const core=document.createElementNS('http://www.w3.org/2000/svg','g');core.classList.add('skill-die-core');core.setAttribute('transform','scale(2.2)');while(svg.firstChild)core.append(svg.firstChild);svg.append(core);const mesh=new SkillD20(svg);svg.querySelector('.skill-die-tumble').setAttribute('transform','translate(110 110) scale(1.4) translate(-110 -110)');window.godotDieRoll=()=>new Promise(resolve=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches){resolve();return;}const start=performance.now();function tick(now){const p=Math.min(1,(now-start)/1115);mesh.paint(p);if(p<1)requestAnimationFrame(tick);else{mesh.paint(undefined);resolve();}}requestAnimationFrame(tick);});\n`;
await writeFile(resolve(root,'prototypes/godot-pecio/loading/die.js'),'// Generated from the original VTT SkillD20. No campaign dice effects.\n'+js+hook);

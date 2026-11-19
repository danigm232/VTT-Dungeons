import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';

const root = resolve(import.meta.dirname, '..');
const expansion = process.argv.includes('--expansion');
const output = resolve(root, 'output/stormwreck-motion-detail', expansion ? 'expansion' : '.');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const subjects = expansion ? await readJson(resolve(output, 'subjects.json')) : [
    {actor:'zombie', title:'Zombi marinero', action:'walk', direction:'se', definition:'sw-zombie-walk-detail', legacyAtlas:'zombie-walk'},
    {actor:'harpy', title:'Arpías', action:'fly', direction:'se', definition:'sw-harpy-fly-detail', legacyAtlas:'harpy-flight'},
    {actor:'harpy-2', definition:'sw-harpy-fly-detail', sharedAppearance:true},
];
const report = await readJson(resolve(output, 'native-proof.json'));
const catalogue = await readJson(resolve(root, 'prototypes/godot-shared/characters/candidate-catalogue.json'));
if (report.revision !== catalogue.revision || report.errors.length || report.findings.length !== subjects.length ||
    subjects.some(subject => !report.findings.some(item => item.id === subject.actor && item.distinctRenders === 8))) {
    throw Error('The full current native review must pass before building the gallery');
}
const spriteRoot = resolve(root, 'prototypes/godot-shared/sprites');
const [legacy, sources] = await Promise.all([
    readJson(resolve(spriteRoot, 'frames.json')),
    readJson(resolve(spriteRoot, 'art-sources.json')),
]);
const inventory = [];
for (const [id, atlas] of Object.entries(legacy.atlases)) {
    if (!/^(harpy|zombie)-/.test(id)) continue;
    const file = sources.atlases[id].file;
    const original = await readFile(resolve(spriteRoot, file));
    const heights = atlas.frames.map(frame => frame.source_bounds[3]);
    inventory.push({id, owner:'prototypes/godot-shared/sprites/frames.json', original:file,
        originalSize:[original.readUInt32BE(16), original.readUInt32BE(20)], originalSha256:digest(original),
        poses:heights.length, nativeVisibleHeightRange:[Math.min(...heights), Math.max(...heights)],
        referenceHeight:atlas.reference_height, status:'Inventariado, conserva su arte fuera de la muestra'});
}
const entries = [];
const originals = [];
for (const {actor, title, action, direction, definition:id, legacyAtlas} of subjects.filter(subject => !subject.sharedAppearance)) {
    const definitionPath = `prototypes/godot-shared/characters/definitions/animations/${id}.json`;
    const definition = await readJson(resolve(root, definitionPath));
    const importReport = await readJson(resolve(root, definition.production.importReport));
    const before = `${actor}-before.png`;
    const frames = Array.from({length:8}, (_,index) => `${actor}-after-${String(index+1).padStart(2,'0')}.png`);
    for (const file of [before,...frames]) {
        const bytes = await readFile(resolve(output,file));
        if (bytes.readUInt32BE(16) !== 1280 || bytes.readUInt32BE(20) !== 720) throw Error(`Mismatched capture: ${file}`);
        originals.push({file,sha256:digest(bytes)});
    }
    entries.push({id, title, owner:definitionPath, action, fps:definition.fps, direction, before, frames,
        legacyAtlas, source:definition.production.original, sourceSha256:definition.production.originalSha256, prompt:definition.production.promptFile,
        sourceHeight:[Math.min(...importReport.visibleHeights),Math.max(...importReport.visibleHeights)],
        sourceFrames:await Promise.all(definition.frames.map(async file => ({file,sha256:digest(await readFile(resolve(root,file)))}))),
        reference:'VA-03/10/14, REF-01 y el diseño original aportado en el proyecto',
        acceptance:'Comparación nativa inspeccionada. Revisión artística del usuario pendiente.'});
}
await writeFile(resolve(output, 'asset-review.json'), JSON.stringify({revision:report.revision,camera:report.camera,target:report.target,
    resolution:report.resolution,ortho:report.orthographicSize,inventory,entries,originals},null,2)+'\n');

const sections = entries.map(entry => {
    const text = entry.action === 'walk' ? 'Marcha' : 'Vuelo';
    const facing = entry.direction === 'n' ? 'Vista norte, de espaldas' : 'Vista sureste';
    return `<section><h2>${entry.title} · ${text}</h2><p>${facing} · 8 fases · ${entry.sourceHeight.join('–')} px de altura de silueta en los originales nuevos.</p>
${visualComparison({before:entry.before,after:entry.frames[0],title:`${text} · misma cámara y escala de ficha`,width:1280,height:720})}
<details><summary>Ver ciclo de ocho fases</summary><img class="loop" src="${entry.frames[0]}" alt="${text}, fase 1" width="1280" height="720"><div class="controls"><button type="button" data-play="${entry.id}">Reproducir</button><button type="button" data-step="${entry.id}">Siguiente fase</button><output data-phase>1 / 8</output></div></details></section>`;
}).join('\n');

const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stormwreck · Nitidez de sprites</title>
<style>:root{color-scheme:dark}body{background:#102024;margin:0;color:#ece4d5;font:16px/1.55 system-ui}main{max-width:1000px;margin:auto;padding:30px 22px}h1,h2{font-family:Georgia;color:#ecd29d}h1{font-size:34px}section{margin:32px 0;padding-top:12px;border-top:1px solid #566662}.loop{width:100%;height:auto;display:block;margin:12px 0}.controls{display:flex;align-items:center;gap:10px}button{color:inherit;background:#29434a;border:1px solid #819991;border-radius:5px;padding:9px 13px;font:inherit}summary,button{cursor:pointer}a,summary{color:#ecd29d}p{max-width:75ch}</style>
<main><h1>Stormwreck · Nitidez de sprites</h1><p>${entries.length} ciclos de ocho dibujos en una cuadrícula de 4 × 2. Pulsa una captura para alternar. Las dos versiones se muestran con el mismo encuadre.</p>${sections}<p><a href="asset-review.json">Inventario de resolución y procedencia</a> · <a href="native-proof.json">Prueba de animación en Godot</a>${expansion ? ' · <a href="../index.html">Primera entrega</a>' : ''}</p></main>
<script>
const clips=${JSON.stringify(entries.map(({id,frames,fps,title})=>({id,frames,fps,title})))};
for(const clip of clips){
    const play = document.querySelector('[data-play="'+clip.id+'"]');
    const step = document.querySelector('[data-step="'+clip.id+'"]');
    const panel = play.closest('details');
    const preview = panel.querySelector('img');
    const output = panel.querySelector('output');
    let phase = 0, timer = null;
    const advance = () => {phase = (phase + 1) % clip.frames.length;preview.src=clip.frames[phase];preview.alt=clip.title+' · fase '+(phase+1);output.textContent=(phase+1)+' / '+clip.frames.length;};
    const pause = () => {clearInterval(timer);timer=null;play.textContent='Reproducir';};
    play.onclick=()=>{if(timer!==null){pause();return;}timer=setInterval(advance,1000/clip.fps);play.textContent='Pausar';};
    step.onclick=()=>{pause();advance();};
    panel.ontoggle=()=>{if(!panel.open)pause();};
}
</script>${visualComparisonAssets()}</html>`;
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);
await writeFile(resolve(output, 'index.html'), html);
console.log(`Inventariados ${inventory.length} atlas. ${entries.length} comparaciones verificadas con ${entries.length * 8} fases nativas.`);

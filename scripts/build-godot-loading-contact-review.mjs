import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {visualComparison, visualComparisonAssets} from './lib/visual-comparison.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'output/loading-contact-20261127');
const loading = resolve(root, 'prototypes/godot-campamentos/loading');
const catalog = JSON.parse(await readFile(resolve(loading, 'catalog.json'), 'utf8'));
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

const examples = [
  ['mike-athletics-20-140', 'Atletismo · Mike espera en tierra antes del salto', 384, 95],
  ['maria-acrobatics-20-140', 'Acrobacias · Trinity sigue en la plataforma durante la preparación', 384, 95],
  ['full-medicine', 'Medicina · apoyos de Mike, el paciente y su taburete', 1280, 720],
  ['full-medicine-action', 'Medicina · contacto durante el vendaje', 1280, 720],
  ['full-handshake', 'Persuasión · sombra separada para cada figura', 1280, 720],
  ['full-mechanism', 'Investigación · el mecanismo se asienta sobre la piedra', 1280, 720],
  ['full-horse', 'Trato con animales · sombras junto a los cascos', 1280, 720],
  ['full-audience', 'Interpretación · sombra a lo ancho del público', 1280, 720],
];
const records = [];
for (const side of ['before', 'after', 'finishes']) {
  const files = (await readdir(resolve(out, side))).filter(file => file.endsWith('.png')).sort();
  for (const file of files) {
    const name = `${side}/${file}`;
    records.push({file: name, sha256: createHash('sha256').update(await readFile(resolve(out, name))).digest('hex')});
  }
}
const indexed = new Set(records.map(record => record.file));
const comparison = examples.map(([file, title, width, height]) => {
  for (const side of ['before', 'after']) {
    if (!indexed.has(`${side}/${file}.png`)) throw Error(`Missing ${side} capture of ${file}`);
  }
  return visualComparison({before: `before/${file}.png`, after: `after/${file}.png`, title, width, height});
}).join('');

const labels = {'-100':'Ambiente', '-200':'Ambiente II', '-300':'Ambiente III', '140':'Preparación', '163':'Acción · 1,63 s', '225':'Acción · 2,25 s', '290':'Acción · 2,90 s', '350':'Acción · 3,50 s', '415':'Acción · 4,15 s', '480':'Acción · 4,80 s', '550':'Acción · 5,50 s', '1000':'Acción · 10 s', '1300':'Desenlace'};
const actors = Object.entries(catalog.actors).map(([id, actor]) => {
  const skills = catalog.scenes.map(scene => {
    const states = [20, 1].map(roll => {
      const times = (roll === 20 ? [-100,-200,-300] : []).concat([140,163,225,290,350,415,480,550,1000,1300]);
      const images = times.map(time => {
        const file = `${time === 1300 ? 'finishes' : 'after'}/${id}-${scene.id}-${roll}-${time}.png`;
        if (!indexed.has(file)) throw Error(`Missing ${file}`);
        return `<figure><a href="${file}"><img src="${file}" alt="${esc(scene.name)} · ${labels[time]}" width="384" height="95" loading="lazy"></a><figcaption>${labels[time]}</figcaption></figure>`;
      }).join('');
      return `<h4>${roll === 20 ? 'Éxito y ambiente' : 'Fallo'}</h4><div class="grid">${images}</div>`;
    }).join('');
    return `<details><summary>${esc(scene.name)}</summary>${states}</details>`;
  }).join('');
  return `<details><summary>${esc(actor.label)} · 18 habilidades</summary>${skills}</details>`;
}).join('');
const hashes = [];
for (const file of ['catalog.json','ground_contacts.json','art/floor.webp','art/chasm.webp',...Array.from({length:catalog.atlasCount}, (_, i) => `art/atlas-${i}.webp`)]) {
  hashes.push({file, sha256: createHash('sha256').update(await readFile(resolve(loading, file))).digest('hex')});
}
await writeFile(resolve(out, 'manifest.json'), JSON.stringify({camera: [1280, 720], renderer: 'Godot Forward+', crop: [0,204,1280,316], previewSize: [384,95], records, assets: hashes}, null, 2));
await writeFile(resolve(out, 'index.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apoyos de las escenas de carga</title><style>
body{margin:auto;max-width:1100px;padding:24px;background:#10272b;color:#eee3ce;font:16px/1.55 system-ui}h1,h2{font-family:Georgia}a{color:#eac991}details{margin:10px 0;padding:10px 16px;border:1px solid #496362}summary{cursor:pointer;padding:.45rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:12px}.grid figure{margin:0}.grid img{width:100%;height:auto}
</style><h1>Apoyos de las escenas de carga</h1><p>Auditoría de las 18 habilidades con Mike, Mía y Trinity. Los dos saltos conservan su trayectoria y la preparación vuelve a quedarse sobre la plataforma. Las parejas de Medicina, Juego de manos y Persuasión, el caballo y el público reciben sombras ajustadas a sus apoyos.</p>
<h2>Comparar antes y después</h2>${comparison}<h2>Revisar las secuencias</h2>${actors}
<p><a href="manifest.json">Capturas y huellas de los archivos</a></p>${visualComparisonAssets()}</html>`);
console.log(`Report includes ${records.length} captures and ${examples.length} matching comparisons.`);

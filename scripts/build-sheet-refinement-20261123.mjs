import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {visualComparison, visualComparisonAssets} from './lib/visual-comparison.mjs';

const integral = process.argv.includes('--integral');
const before = integral ? 'output/ficha-refinamiento-20261123' : 'output/ficha-auditoria-20261123';
const after = integral ? 'output/ficha-auditoria-integral' : 'output/ficha-refinamiento-20261123';
const regular = ['01-resumen', '02-combate', '03-conjuros', '04-inventario', '05-historia', '06-editar', '07-mia-resumen', '08-maria-resumen', '09-mochila-independiente'];
const compact = ['10-compacto-resumen', '11-compacto-combate', '12-compacto-conjuros', '13-compacto-inventario', '14-compacto-historia', '15-compacto-editar'];
const extra = ['combate-listas-desplazadas', 'amplio-resumen', 'amplio-combate', 'amplio-conjuros', 'amplio-inventario', 'amplio-historia', 'amplio-editar', 'trinit-recursos', 'mia-conjuros', 'mia-compacto'];
const additional = integral ? ['muestra-fase-2', 'mia-pg-temporales', 'inventario-consumir', 'inventario-personal-transferir', 'editar-dm', 'compacto-mochila-independiente', 'amplio-mochila-independiente'] : extra;
const records = [];

function record(folder, id) {
  const file = `${folder}/${id}.png`;
  const image = readFileSync(file);
  if (image.readUInt32BE(0) !== 0x89504e47) throw new Error(`PNG inválido ${file}`);
  const info = {file, width: image.readUInt32BE(16), height: image.readUInt32BE(20), sha256: createHash('sha256').update(image).digest('hex')};
  records.push(info);
  return info;
}

function label(id) {
  const text = id.replace(/^\d+-/, '').replaceAll('-', ' ');
  return text[0].toUpperCase() + text.slice(1);
}

const comparisons = [...regular, ...compact, ...(integral ? extra : [])].map(id => {
  const original = record(before, id);
  const revised = record(after, id);
  if (original.width !== revised.width || original.height !== revised.height) throw new Error(`Dimensiones distintas en ${id}`);
  return visualComparison({
    before: `../${before.split('/').at(-1)}/${id}.png`, after: `${id}.png`,
    title: label(id), width: revised.width, height: revised.height,
  });
});
const extras = additional.map(id => {
  const info = record(after, id);
  return `<figure><a href="${id}.png"><img src="${id}.png" width="${info.width}" height="${info.height}" alt="${label(id)}" loading="lazy"></a><figcaption>${label(id)} · ${info.width} × ${info.height}</figcaption></figure>`;
});
writeFileSync(`${after}/originales.json`, JSON.stringify(records, null, 2));
writeFileSync(`${after}/index.html`, `<!doctype html>
<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Ficha y mochila de Godot</title>
<style>
body{background:#122022;color:#f5e6ca;font:16px/1.5 system-ui;max-width:1500px;margin:auto;padding:24px}
h1,h2{font-family:Georgia}a{color:#f4cc88}nav{display:flex;gap:1.5em;flex-wrap:wrap}
figure{margin:20px 0 34px}img{max-width:100%;height:auto}
</style>
<h1>Ficha y mochila de Godot</h1>
<p>Pulsa una imagen para superponer la versión revisada en el mismo encuadre. Cada pareja usa el mismo personaje, resolución, escena inicial y estado de prueba. La fase del agua y del reposo puede variar.</p>
<nav><a href="#principal">1600 × 900</a><a href="#compacta">1366 × 768</a><a href="#amplia">1920 × 1080 y otras vistas</a><a href="originales.json">Originales y hashes</a></nav>
<h2 id="principal">Ficha y mochila · 1600 × 900</h2>
${comparisons.slice(0, regular.length).join('\n')}
<h2 id="compacta">Ficha compacta · 1366 × 768</h2>
${comparisons.slice(regular.length, regular.length + compact.length).join('\n')}
<h2 id="amplia">1920 × 1080 y otras vistas</h2>
${comparisons.slice(regular.length + compact.length).join('\n')}
${integral ? '<h2>Muestra de trabajo y comprobaciones adicionales</h2>' : ''}
${extras.join('\n')}
${visualComparisonAssets()}</html>`);

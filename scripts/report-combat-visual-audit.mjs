import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const root = resolve(import.meta.dirname, '..');
const folder = resolve(root, 'output/combat-visual-audit-20261124');
const reviewFolder = resolve(folder, 'review');
const projects = ['pecio', 'retiro', 'campamentos'];
const cases = {
  'alcance-lanzamiento': 'Alcance normal y alcance largo de la daga',
  niebla: 'Nube de niebla con las fichas a la vista',
  flecha: 'Flecha en vuelo antes del impacto',
  cono: 'Dirección y alcance de Manos ardientes',
  'derrota-oculta': 'Retirada del marcador al ocultar la ficha caída',
};
const files = ['combat_visuals.gd', 'combat_overlay.gd', 'combat_cues.gd', 'visual_profiles.json', 'audit_combat_visuals.gd'];
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const originals = [];
const checks = [];
const renders = [];
const sections = [];
const sourceHashes = {};

for (const file of files) {
  const hash = sha256(await readFile(resolve(root, 'prototypes/godot-shared/combat', file)));
  sourceHashes[file] = hash;
  for (const project of projects) {
    const local = await readFile(resolve(root, `prototypes/godot-${project}/combat`, file));
    if (sha256(local) !== hash) throw Error(`Copia fuera de sincronía: ${project}/${file}`);
  }
}

for (const project of projects) {
  const report = JSON.parse(await readFile(resolve(reviewFolder, project + '-frames.json'), 'utf8'));
  const native = JSON.parse(await readFile(resolve(folder, project + '-checks.json'), 'utf8'));
  const log = await readFile(resolve(reviewFolder, project + '-render.log'), 'utf8');
  if (report.errors.length || native.errors.length || report.captures.length !== 2 * Object.keys(cases).length
      || !log.includes('Forward+') || !log.includes('0 failures') || /SCRIPT ERROR|ERROR: Shader compilation/m.test(log)) {
    throw Error(`Comprobación incompleta para ${project}`);
  }
  checks.push({ project, checks: native.checks, actions: native.pose_coverage.length, evidence: project + '-checks.json' });
  renders.push({ project, copies: report.captures.length, log: 'review/' + project + '-render.log' });
  const pairs = [];
  for (const [id, title] of Object.entries(cases)) {
    const before = report.captures.find((record) => record.case === id && record.phase === 'antes');
    const after = report.captures.find((record) => record.case === id && record.phase === 'despues');
    if (!before || !after || ['camera', 'size', 'pixels', 'tokens'].some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))) {
      throw Error(`Encuadre o colocación distintos: ${project}/${id}`);
    }
    for (const frame of [before, after]) {
      const bytes = await readFile(resolve(reviewFolder, 'captures', frame.file));
      if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Formato de captura incorrecto');
      if (bytes.readUInt32BE(16) !== frame.pixels[0] || bytes.readUInt32BE(20) !== frame.pixels[1]) throw Error('Dimensiones diferentes');
      originals.push({ project, ...frame, file: 'review/captures/' + frame.file, sha256: sha256(bytes) });
    }
    pairs.push(visualComparison({ title, before: 'review/captures/' + before.file, after: 'review/captures/' + after.file,
      width: before.pixels[0], height: before.pixels[1] }));
  }
  const label = project[0].toUpperCase() + project.slice(1);
  sections.push(`<section id="${project}"><h2>${label}</h2>${pairs.join('')}</section>`);
}

const baseline = {};
for (const name of ['combat_visuals.gd', 'combat_overlay.gd']) {
  baseline[name] = sha256(await readFile(resolve(reviewFolder, 'baseline', name)));
}
const reused = {};
for (const path of [
  'prototypes/godot-shared/characters/definitions/characters/maria.json',
  'prototypes/godot-shared/combat/art/tokens/generated-20261004/rogue-rise.png',
  'prototypes/godot-shared/characters/binding_layer.gd',
]) reused[path] = sha256(await readFile(resolve(root, path)));
const regressionLogs = ['test_sprites.log', 'test_npcs-final.log', 'test_npc_regressions-final.log', 'test_surface-final.log',
  'test_condition_overlays-candidate.log', 'test_combat_rules-final.log', 'test_combat_integration-final.log'];
const regressions = [];
for (const name of regressionLogs) {
  const log = await readFile(resolve(folder, name), 'utf8');
  const marker = log.match(/^(?:SPRITE CONTRACT|NPC CONTRACT|NPC REGRESSIONS|MODULAR SURFACE|CONDITION OVERLAYS) (\d+) checks; 0 failures$/m);
  const jsonLine = log.split(/\r?\n/).find((line) => line.startsWith('{"errors"'));
  const result = jsonLine ? JSON.parse(jsonLine) : null;
  if ((!marker && result?.failed !== 0) || /SCRIPT ERROR|^ERROR:|\bFAIL /m.test(log)) throw Error('Suite incompleta: ' + name);
  regressions.push({ log: name, checks: marker ? Number(marker[1]) : result.passed });
}
await writeFile(resolve(folder, 'originales.json'), JSON.stringify({ sourceHashes, baseline, reused, checks, regressions, renders, originals }, null, 2) + '\n');
await writeFile(resolve(folder, 'index.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visuales de combate · Godot</title><style>
body{background:#101a23;color:#e9e3d4;font:16px/1.55 system-ui;max-width:1120px;margin:auto;padding:28px}
h1,h2{color:#e5c58e} a{color:#a8dcdb} section{margin:50px 0} nav a{display:inline-block;margin-right:20px}
</style><h1>Visuales de combate en Godot</h1>
<p>Capturas de la escena nativa en Forward+. Cada comparación reproduce el mismo caso con la cámara, el tamaño y las posiciones de ficha comprobados. El «antes» se genera con los dos scripts anteriores conservados junto al informe.</p>
<p>Pulsa la imagen para alternar. El control de ampliación permite revisar el contacto, la transparencia y el apoyo de la ficha.</p>
<nav><a href="#pecio">Pecio</a><a href="#retiro">Retiro</a><a href="#campamentos">Campamentos</a><a href="originales.json">Originales y resultados</a></nav>
${sections.join('')}${visualComparisonAssets()}</html>`);
console.log(JSON.stringify({ checks, renders, pairs: originals.length / 2 }));

import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';

const root = resolve(import.meta.dirname, '..');
const path = 'output/loading-anatomy-20261127';
const out = resolve(root, path);
const native = JSON.parse(await readFile(resolve(out, 'native-validation.json'), 'utf8'));
const ids = [664,665,666,667,668,669,670,671];
const names = ['Examinar la herida','Preparar la venda','Empezar el vendaje','Terminar el vendaje','Agradecimiento','Liarse con la venda','Sorpresa','Desenlace del fallo'];
if (native.checks !== 16 || !native.passed) throw Error('The eight poses must reach the native renderer in both versions');
const overlays = ids.map((id, i) => visualComparison({
  before:`native-baseline/${id}.png`,after:`native-candidate/${id}.png`,
  title:`${names[i]} · fotograma ${id}`,width:1280,height:720,
})).join('');
const atlasFiles = ids.flatMap(id => [`native-baseline/${id}.png`,`native-candidate/${id}.png`]);
const records = [];
for (const file of atlasFiles) {
  records.push({file,sha256:createHash('sha256').update(await readFile(resolve(out,file))).digest('hex')});
}
const guide = 'docs/evidence/captures/loading-anatomy-20261127/medicine-edit-guide.png';
const provenance = {
  file:guide,
  sha256:createHash('sha256').update(await readFile(resolve(root,guide))).digest('hex'),
  tool:'Edición integrada de imágenes. Guía para trazar la eliminación localizada sobre el original.',
  prompt:'Surgical localized correction of the supplied transparent game sprite sheet. Keep EXACT layout: 4 columns by 2 rows with the 8 same poses in order. Keep identity, shading, outlines, painted texture, faces, upper bodies, costumes, book, bandages, human patient, stool, support baseline and all positions pixel faithful. The adult blond blue-robed elf Mike is on the LEFT of each cell. In each original frame he was mistakenly drawn with THREE black boots: two directly adjacent at the left, and another pointing right. REMOVE ONLY the extreme LEFTMOST black boot and the spurious black shin above it, filling the space with TRUE TRANSPARENCY where outside the robe; preserve the middle front boot and the boot pointing to the right, for exactly TWO natural legs and two feet. Preserve the gold-edged blue coat hem over the legs. Preserve everything else, particularly the other human’s two brown boots and stool. Keep all figures complete and all original poses. No stylistic change, no floor, no shadow, no labels, truly transparent RGBA. The lower part is the only area allowed to change.',
};
await writeFile(resolve(out,'manifest.json'),JSON.stringify({native,records,provenance},null,2));
await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Medicina de Mike · Corrección de anatomía</title>
<style>body{max-width:1050px;margin:auto;padding:24px;background:#10272b;color:#eee3ce;font:16px/1.55 system-ui}h1{font-family:Georgia}a{color:#eac991}</style>
<h1>Medicina de Mike · Corrección de anatomía</h1><p>Los ocho dibujos de esta secuencia tenían una bota y una pierna de más. Pulsa una imagen para comprobar el retoque en Godot con la misma cámara, pose y posición. Las caras, el paciente y el resto del dibujo se conservan.</p>
${overlays}<p><a href="manifest.json">Capturas, procedencia y verificación</a></p>${visualComparisonAssets()}</html>`);
await writeFile(resolve(out,'review.json'),JSON.stringify({
  scope:native.scope,revision:native.revision,technical:'passed',visual:'reviewed',userAcceptance:'pending',
  nativeReport:`${path}/native-validation.json`,evidence:[`${path}/index.html`,`${path}/manifest.json`],
},null,2));

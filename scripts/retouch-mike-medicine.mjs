import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(process.env.DUNGEONS_SHARP_MODULE || 'sharp');
const root = resolve(import.meta.dirname, '..');
const definitionPath = resolve(root, 'prototypes/godot-shared/characters/definitions/animations/sw-mike-loading-medicine-v6.json');
const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
const correction = definition.production.anatomyCorrection;
const originals = correction.originalFrames ?? definition.frames;
// Per-frame traces of the coat edge and gap between the first two boots.
// Coordinates are within the original alpha crop. The guided local cut masks
// the duplicated silhouette and leaves the surviving legs and upper artwork intact.
const trace = [
  [[0,200],[17,205],[22,208],[29,212],[38,217],[41,218],[40,226],[42,236],[46,244],[48,252],[48,257],[0,257]],
  [[0,201],[16,206],[22,211],[30,215],[39,220],[43,221],[42,227],[42,236],[45,243],[47,250],[48,258],[0,258]],
  [[0,194],[16,200],[22,205],[31,209],[39,214],[43,215],[42,224],[42,230],[45,238],[49,245],[49,253],[0,253]],
  [[0,197],[17,201],[24,206],[34,212],[43,216],[46,217],[43,225],[43,234],[47,240],[50,247],[51,254],[0,254]],
  [[0,202],[16,207],[23,212],[32,217],[41,221],[45,222],[43,228],[43,236],[46,242],[49,248],[49,257],[0,257]],
  [[0,201],[16,206],[23,211],[31,215],[40,219],[44,221],[42,227],[43,236],[46,242],[49,248],[49,256],[0,256]],
  [[0,202],[17,207],[25,212],[34,217],[42,221],[46,222],[43,228],[43,236],[46,241],[50,247],[51,256],[0,256]],
  [[0,198],[16,203],[23,209],[32,213],[41,217],[44,219],[41,226],[42,234],[45,240],[50,247],[51,254],[0,254]],
];
const derived = [];
const affectedBounds = [];
const sources = [];
for (const [i, original] of originals.entries()) {
  const encoded = await readFile(resolve(root, original));
  const {data, info: {width, height}} = await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left = width;
  let top = height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] >= 32) {
      left = Math.min(x, left);
      top = Math.min(y, top);
    }
  }
  if (left === width) throw Error(`Empty source frame ${original}`);
  const points = trace[i];
  const polygon = points.map(([x,y]) => `${x+left},${y+top}`).join(' ');
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><polygon points="${polygon}" fill="white"/></svg>`);
  const mask = await sharp(svg).ensureAlpha().raw().toBuffer();
  for (let k = 3; k < data.length; k += 4) data[k] = Math.round(data[k] * (255 - mask[k]) / 255);
  const output = `${dirname(original)}/anatomy-20261127/${original.split('/').at(-1)}`;
  await mkdir(resolve(root, dirname(output)), {recursive:true});
  await sharp(data, {raw:{width,height,channels:4}}).webp({lossless:true}).toFile(resolve(root,output));
  affectedBounds.push([0,Math.min(...points.map(p=>p[1]))-1,Math.max(...points.map(p=>p[0]))+1,Math.max(...points.map(p=>p[1]))+1]);
  derived.push(output);
  sources.push({original, sha256:createHash('sha256').update(encoded).digest('hex')});
}
if (process.argv.includes('--register-sources')) {
  definition.frames = derived;
  Object.assign(correction, {status:'localized-retouch', originalFrames:originals, affectedBounds,
    sourceDigests:sources, method:'Built-in image edit guide; antialiased alpha trace per frame applied to the original crop.',
    tool:'scripts/retouch-mike-medicine.mjs', guide:'docs/evidence/captures/loading-anatomy-20261127/medicine-edit-guide.png'});
  definition.review.visual = 'candidate awaiting native review of local anatomy restoration';
  definition.review.userAcceptance = 'pending';
  definition.review.evidence = ['output/loading-anatomy-20261127/native-validation.json','output/loading-anatomy-20261127/index.html'];
  await writeFile(definitionPath,JSON.stringify(definition,null,2)+'\n');
}
console.log(`Localized anatomical retouch produced for ${derived.length} original poses.`);

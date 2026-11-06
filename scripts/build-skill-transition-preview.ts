import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'vite';
import { skillSceneRoles } from '../engine/client/skill-micro-scene';
import { skillSpriteClips } from '../apps/web/ui/skill-scene-sprite';
import { skillMicroScenes } from '../apps/web/ui/skill-scenes';
import { publicCampaignDefinition as campaign } from '../campaigns/stormwreck-isle/public/pack';

const root = resolve(import.meta.dirname, '..');
const output = resolve(process.argv[2] ?? resolve(root, 'output/skill-transition/PROBAR-LAS-18-PANTALLAS.html'));
const roles = new Set(skillMicroScenes.flatMap(scene => [...skillSceneRoles(scene)]));
const actors = campaign.roster.map(({ id, tokenId, label }) => ({
  id, label, actor: { asset: campaign.tokens[tokenId]!, animations: campaign.tokenAnimations[tokenId] ?? {} }
}));
const urls = new Set<string>();
for (const { actor } of actors) {
  urls.add(actor.asset.url);
  for (const { clip } of skillSpriteClips(actor, roles).values()) {
    for (const frame of clip?.frames ?? []) urls.add(typeof frame === 'string' ? frame : frame.url);
  }
}

async function readSprite(url: string) {
  const type = { png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg' }[url.split('.').at(-1)!];
  if (!type || !url.startsWith('/art/')) throw new Error(`Recurso de sprite inesperado ${url}`);
  for (const folder of ['stormwreck-isle', 'camp-rests']) {
    try {
      const bytes = await readFile(resolve(root, 'campaigns', folder, 'public', url.slice(1)));
      return [url, `data:${type};base64,${bytes.toString('base64')}`];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`Falta el sprite ${url}`);
}

const [images, built] = await Promise.all([
  Promise.all([...urls].map(readSprite)),
  build({ configFile: false, root, logLevel: 'warn', build: { write: false,
    lib: { entry: resolve(root, 'apps/web/skill-transition-preview.ts'), name: 'DungeonsSkillPreview', formats: ['iife'] }
  } })
]);
const bundle = Array.isArray(built) ? built[0] : built;
if (!bundle || !('output' in bundle)) throw new Error('Vite no devolvió el visor');
const css = bundle.output.find(file => file.type === 'asset' && file.fileName.endsWith('.css'));
const js = bundle.output.find(file => file.type === 'chunk' && file.isEntry);
if (!css || css.type !== 'asset' || !js || js.type !== 'chunk') throw new Error('Falta el código o la hoja de estilos del visor');
const payload = JSON.stringify({ actors, images: Object.fromEntries(images) }).replaceAll('<', '\\u003c');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Probar las 18 pantallas · Dungeons VTT</title><style>${String(css.source)}</style><body><script type="application/json" id="skillPreviewData">${payload}</script><script>${js.code.replace(/<\/script/gi, '<\\/script')}</script></body></html>`);
console.log(`Visor de ${skillMicroScenes.length} habilidades · ${output}`);

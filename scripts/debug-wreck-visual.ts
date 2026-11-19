import { NullEngine, Scene } from '@babylonjs/core';
import { stormwreckBundle } from '../campaigns/stormwreck-isle/server.js';
import { buildTerrain3D } from '../engine/client/terrain3d.js';

const engine = new NullEngine();
const scene = new Scene(engine);
const sceneDef = stormwreckBundle.public.scenes.find((s: any) => s.id === 'wreck-ship');
if (!sceneDef) throw new Error('No se encontró wreck-ship');
const map = sceneDef.terrain;
if (!map) throw new Error('No hay terrain en wreck-ship');
console.log('Map baseSurfaceId:', map.baseSurfaceId);
console.log('Surfaces in map:', map.surfaces.map((s: any) => s.id));
const view = buildTerrain3D(scene, map, { shipDeck: true });
console.log('\nTotal meshes in scene:', scene.meshes.length);

for (const m of scene.meshes) {
  const mat = m.material;
  const name = m.name;
  if (name.includes('terrain') || name.includes('ocean') || name.includes('sea') || name.includes('scenic') || name.includes('hull') || name.includes('floor') || name.includes('deck') || name.includes('batch')) {
    console.log(`[Mesh] ${name}`);
    console.log(`       Material: ${mat?.name} (${mat?.getClassName()})`);
    console.log(`       Visible: ${m.isVisible}, AlphaIndex: ${m.alphaIndex}, isPickable: ${m.isPickable}`);
    console.log(`       Position: ${m.position.asArray().map(v => v.toFixed(2)).join(', ')}`);
    if (mat) {
      console.log(`       Mat diffuse: ${(mat as any).diffuseColor?.toHexString?.() ?? (mat as any).albedoColor?.toHexString?.() ?? 'none'}`);
      console.log(`       Mat emissive: ${(mat as any).emissiveColor?.toHexString?.() ?? 'none'}`);
    }
  }
}
engine.dispose();

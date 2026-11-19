import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { stormwreckBundle } from '../campaigns/stormwreck-isle/server.js';
import { buildTerrain3D } from '../engine/client/terrain3d.js';

const engine = new NullEngine();
const scene = new Scene(engine);
const sceneDef = stormwreckBundle.public.scenes.find((s: any) => s.id === 'wreck-ship');
const map = sceneDef.terrain;
const view = buildTerrain3D(scene, map, { shipDeck: true });

console.log('--- BUSCANDO MALLAS PLANAS CERCA DEL NIVEL DEL MAR (Y entre -1 y 1) ---');
for (const m of scene.meshes) {
  const bi = m.getBoundingInfo();
  const min = bi.boundingBox.minimumWorld;
  const max = bi.boundingBox.maximumWorld;
  const sizeX = max.x - min.x;
  const sizeZ = max.z - min.z;
  const sizeY = max.y - min.y;
  
  if (sizeX > 15 && sizeZ > 10 && sizeY < 3) {
    console.log(`\nMALLA GRANDE PLANA: ${m.name}`);
    console.log(`  Tamaño: ${sizeX.toFixed(1)} x ${sizeY.toFixed(2)} x ${sizeZ.toFixed(1)} m`);
    console.log(`  Centro: ${((min.x + max.x)/2).toFixed(1)}, ${((min.y + max.y)/2).toFixed(2)}, ${((min.z + max.z)/2).toFixed(1)}`);
    console.log(`  Material: ${m.material?.name} (${m.material?.getClassName()})`);
    console.log(`  Visible: ${m.isVisible}, isEnabled: ${m.isEnabled()}`);
    console.log(`  AlphaIndex: ${m.alphaIndex}, hasVertexAlpha: ${m.hasVertexAlpha}`);
    if (m.material) {
      console.log(`  Material diffuse: ${(m.material as any).diffuseColor?.toHexString?.()}`);
      console.log(`  Material emissive: ${(m.material as any).emissiveColor?.toHexString?.()}`);
      console.log(`  Material disableDepthWrite: ${(m.material as any).disableDepthWrite}`);
      console.log(`  Material needAlphaBlending: ${(m.material as any).needAlphaBlending?.()}`);
      console.log(`  Material alpha: ${(m.material as any).alpha}`);
    }
  }
}
engine.dispose();

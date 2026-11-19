import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { wreckRuntimeScenes } from '../campaigns/stormwreck-isle/public/wreck-runtime-v6.js';
import { buildTerrain3D } from '../engine/client/terrain3d.js';

const sceneDef = wreckRuntimeScenes.find(s => s.id === 'wreck-ship')!;
const engine = new NullEngine();
const scene = new Scene(engine);

const terrainView = buildTerrain3D(scene, sceneDef.terrain, {
  ambientIntensity: 1,
  shipDeck: true,
  renderTiles: true,
  batchTiles: true
});

const waterMeshes = scene.meshes.filter(m => {
  m.computeWorldMatrix(true);
  const bounds = m.getBoundingInfo();
  const min = bounds.boundingBox.minimumWorld;
  const max = bounds.boundingBox.maximumWorld;
  return min.y <= -2.5 && max.y >= -3.5;
});

console.log('Meshes intersecting y = -3.0:');
for (const m of waterMeshes) {
  const bounds = m.getBoundingInfo();
  const min = bounds.boundingBox.minimumWorld;
  const max = bounds.boundingBox.maximumWorld;
  console.log(`- ${m.name}`);
  console.log(`    pos: (${m.position.x}, ${m.position.y}, ${m.position.z})`);
  console.log(`    min: (${min.x.toFixed(2)}, ${min.y.toFixed(2)}, ${min.z.toFixed(2)}) max: (${max.x.toFixed(2)}, ${max.y.toFixed(2)}, ${max.z.toFixed(2)})`);
  console.log(`    mat: ${m.material?.name} (class: ${m.material?.getClassName()})`);
  console.log(`    visible: ${m.isVisible}`);
}

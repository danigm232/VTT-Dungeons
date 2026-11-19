import fs from 'node:fs';

let c = fs.readFileSync('engine/client/wreck-ocean.ts', 'utf8');

c = c.replace(
  'color+=vec3(.85,.95,.94)*pow(max(0.,swell),14.)*smoothstep(.40,.82,broken)*.48;',
  'color+=vec3(.88,.96,.95)*pow(max(0.,swell),7.)*smoothstep(.28,.76,broken)*.72;'
);

const driftwoodSnippet = `  const driftMat = new StandardMaterial('wreck-drifting-plank', scene);
  driftMat.diffuseColor = Color3.FromHexString('#504738');
  driftMat.specularColor = Color3.FromHexString('#101413');
  driftMat.specularPower = 16;
  const driftPlanks = [
    { x: S.origin.x + 14.5, z: S.origin.z + 18.2, l: 2.2, w: 0.24, seed: 0.9 },
    { x: S.origin.x + 2.5, z: S.origin.z + 16.5, l: 1.8, w: 0.22, seed: 1.7 },
    { x: S.origin.x - 12.0, z: S.origin.z + 17.8, l: 2.4, w: 0.26, seed: 2.4 },
    { x: S.origin.x - 22.5, z: S.origin.z + 15.2, l: 1.9, w: 0.21, seed: 3.1 },
    { x: S.origin.x - 28.0, z: S.origin.z + 12.8, l: 2.6, w: 0.28, seed: 4.0 },
    { x: S.origin.x + 24.0, z: S.origin.z + 20.5, l: 1.6, w: 0.20, seed: 5.2 },
    { x: S.origin.x + 32.5, z: S.origin.z + 9.5, l: 2.1, w: 0.25, seed: 6.1 },
    { x: S.origin.x + 28.0, z: S.origin.z - 11.2, l: 1.7, w: 0.22, seed: 7.3 },
    { x: S.origin.x + 11.5, z: S.origin.z - 17.5, l: 2.5, w: 0.27, seed: 8.0 },
    { x: S.origin.x - 6.5, z: S.origin.z - 18.0, l: 2.0, w: 0.23, seed: 9.2 },
    { x: S.origin.x - 21.0, z: S.origin.z - 16.5, l: 2.3, w: 0.25, seed: 1.5 },
    { x: S.origin.x - 33.5, z: S.origin.z - 6.8, l: 1.8, w: 0.21, seed: 2.9 }
  ];
  driftPlanks.forEach((dp, idx) => {
    const plank = MeshBuilder.CreateBox(\`wreck:ocean-drift-plank:\${idx}\`, { width: dp.l, height: 0.08, depth: dp.w }, scene);
    plank.position.set(dp.x, S.seaHeight + 0.03, dp.z);
    plank.rotation.y = dp.seed;
    plank.material = driftMat;
    plank.isPickable = false;
    plank.receiveShadows = true;
    plank.metadata = { visualOnly: true, kind: 'floating-drift-plank', deckSurfaceId: 'sea', originX: dp.x, originZ: dp.z, baseAngle: dp.seed };
    meshes.push(plank);
    scene.onBeforeRenderObservable.add(() => {
      if (!draws(plank)) return;
      const t = performance.now() / 1000;
      plank.position.x = dp.x + Math.sin(t * 0.18 + dp.seed) * 1.5;
      plank.position.z = dp.z + Math.cos(t * 0.14 + dp.seed * 1.2) * 1.1;
      plank.position.y = S.seaHeight + 0.03 + Math.sin(t * 1.15 + dp.seed) * 0.08 + Math.cos(t * 1.45 + dp.seed) * 0.04;
      plank.rotation.z = Math.sin(t * 1.05 + dp.seed) * 0.12;
      plank.rotation.x = Math.cos(t * 0.95 + dp.seed) * 0.09;
      plank.rotation.y = dp.seed + Math.sin(t * 0.12 + dp.seed) * 0.28;
    });
  });
`;

c = c.replace('meshes.push(...bones,...buildWreckScenicDepth(scene));', driftwoodSnippet + '  meshes.push(...bones,...buildWreckScenicDepth(scene));');

fs.writeFileSync('engine/client/wreck-ocean.ts', c, 'utf8');
console.log('Successfully updated wreck-ocean.ts');

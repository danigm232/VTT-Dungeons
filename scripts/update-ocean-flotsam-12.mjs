import fs from 'node:fs';

let txt = fs.readFileSync('engine/client/wreck-ocean.ts', 'utf8');

const oldBlock = `    if(id.startsWith('wreckage')){
      const drift=new StandardMaterial(\`wreck:flotsam:\${id}\`,scene);drift.diffuseColor=Color3.FromHexString('#4d4a37');drift.specularColor=Color3.Black();
      for(let i=0;i<3;i++){const p=MeshBuilder.CreateBox(\`wreck:flotsam:\${id}:\${i}\`,{width:.65,height:.09,depth:.18},scene);
        p.position.set((cells[0]!.col+.35+i*.25)*1.5,S.seaHeight+.02,(cells[0]!.row+.3+i*.18)*1.5);p.rotation.y=.35+i*.7;p.material=drift;p.isPickable=false;p.metadata={visualOnly:true,kind:'floating-wreckage',deckSurfaceId:'sea'};meshes.push(p);
        scene.onBeforeRenderObservable.add(()=>{
          if(!draws(p))return;
          const t=performance.now()/1000;p.position.y=S.seaHeight+.03+Math.sin(t*.8+i)*.035;p.rotation.z=Math.sin(t*.7+i)*.03;
        });}
      continue;
    }`;

txt = txt.replace(oldBlock, `    if(id.startsWith('wreckage')) continue;`);

const flotsamCode = `  // =========================================================================
  // 12 DRIFTWOOD FLOTSAM PLANKS BOBBING WITH WAVES AND CURRENT DRIFT
  // =========================================================================
  const driftMat = new StandardMaterial('wreck-ocean:driftwood-plank', scene);
  driftMat.diffuseColor = Color3.FromHexString('#4a4435');
  driftMat.specularColor = Color3.FromHexString('#161c1a');
  driftMat.specularPower = 32;

  const flotsamDefs = [
    { x: 30.5, z: 27.2, l: 1.35, w: 0.28, rot: 0.4, seed: 1.1 },
    { x: 34.2, z: 28.5, l: 0.95, w: 0.22, rot: -0.8, seed: 2.3 },
    { x: 37.8, z: 26.8, l: 1.50, w: 0.32, rot: 1.2, seed: 3.5 },
    { x: 19.2, z: 22.4, l: 1.20, w: 0.25, rot: -0.3, seed: 4.2 },
    { x: 16.5, z: 20.8, l: 0.85, w: 0.20, rot: 0.9, seed: 5.1 },
    { x: 21.8, z: 24.2, l: 1.40, w: 0.30, rot: 2.1, seed: 6.4 },
    { x: 58.2, z: 17.5, l: 1.10, w: 0.24, rot: -1.4, seed: 7.2 },
    { x: 62.0, z: 19.2, l: 1.60, w: 0.34, rot: 0.6, seed: 8.0 },
    { x: 55.4, z: 22.0, l: 0.90, w: 0.22, rot: 1.8, seed: 9.3 },
    { x: 42.0, z: 31.5, l: 1.45, w: 0.28, rot: -0.5, seed: 10.5 },
    { x: 46.5, z: 30.2, l: 1.25, w: 0.26, rot: 1.1, seed: 11.2 },
    { x: 49.8, z: 32.8, l: 1.05, w: 0.24, rot: -1.9, seed: 12.7 }
  ];

  flotsamDefs.forEach((fd, i) => {
    const p = MeshBuilder.CreateBox(\`wreck:flotsam-driftwood:\${i}\`, { width: fd.l, height: 0.08, depth: fd.w }, scene);
    p.position.set(fd.x, S.seaHeight + 0.02, fd.z);
    p.rotation.y = fd.rot;
    p.material = driftMat;
    p.isPickable = false;
    p.metadata = { visualOnly: true, kind: 'floating-driftwood', deckSurfaceId: 'sea' };
    meshes.push(p);

    scene.onBeforeRenderObservable.add(() => {
      if (!draws(p)) return;
      const t = performance.now() / 1000;
      const driftOffset = Math.sin((t * 0.08) + fd.seed) * 0.65;
      const driftZ = Math.cos((t * 0.06) + fd.seed * 1.2) * 0.45;
      p.position.x = fd.x + driftOffset;
      p.position.z = fd.z + driftZ;

      const wave = Math.sin(t * 1.5 + fd.seed * 2.0) * 0.055 + Math.cos(t * 0.8 + fd.seed) * 0.025;
      p.position.y = S.seaHeight + 0.025 + wave;

      p.rotation.z = Math.sin(t * 1.3 + fd.seed) * 0.08;
      p.rotation.x = Math.cos(t * 1.1 + fd.seed * 1.4) * 0.06;
      p.rotation.y = fd.rot + Math.sin(t * 0.4 + fd.seed) * 0.05;
    });
  });

  return meshes;`;

txt = txt.replace('  return meshes;', flotsamCode);
fs.writeFileSync('engine/client/wreck-ocean.ts', txt, 'utf8');
console.log('Successfully applied 12 driftwood planks in wreck-ocean.ts');

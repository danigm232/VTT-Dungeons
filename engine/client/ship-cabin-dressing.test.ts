import { expect,it } from 'vitest';
import { NullEngine,Scene,RawTexture,Vector3 } from '@babylonjs/core';
import { buildShipCabinDressing } from './ship-cabin-dressing.js';
import { WRECK_CABINS,wreckListHeight } from '../shared/wreck-structure.js';
it('seats canonical C6 portrait in the integrated cabin and points it into the room',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const tex=RawTexture.CreateRGBATexture(new Uint8Array([128,128,128,255]),1,1,scene);
    const meshes=buildShipCabinDressing(scene,1.5,tex),portrait=meshes.find(m=>m.metadata.kind==='canonical-portrait')!;
    const inscription=meshes.find(m=>m.metadata.kind==='canonical-inscription')!;
    expect(portrait.position.x).toBeGreaterThan(WRECK_CABINS.c6.minCol*1.5);
    expect(portrait.position.x).toBeLessThan((WRECK_CABINS.c6.maxCol+1)*1.5);
    expect(portrait.position.y).toBeCloseTo(1.57+wreckListHeight(portrait.position.z));
    for(const m of [portrait,inscription]){
      m.computeWorldMatrix(true);
      expect(Vector3.TransformNormal(new Vector3(0,0,-1),m.getWorldMatrix()).z).toBeGreaterThan(.99);
      expect(m.metadata.cabinId).toBe('c6');expect(m.isPickable).toBe(false);
    }
  }finally{scene.dispose();engine.dispose();}
});

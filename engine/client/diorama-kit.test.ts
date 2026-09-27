import { describe, it, expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { fracturedStone } from './diorama-kit.js';

describe('geología decorativa del diorama',()=>{
  it('mantiene caras exteriores visibles, UV finitas y un coste de geometría acotado',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try {
      for(const seed of [1,40,71,120,180]){
        const mesh=fracturedStone(scene,'test-rock',4,3,2,seed);
        const p=mesh.getVerticesData('position')!,n=mesh.getVerticesData('normal')!;
        expect(mesh.getTotalVertices()).toBeLessThan(200);
        expect(mesh.getVerticesData('uv')!.every(Number.isFinite)).toBe(true);
        for(let v=0;v<p.length;v+=9){
          const x=(p[v]!+p[v+3]!+p[v+6]!)/3,y=(p[v+1]!+p[v+4]!+p[v+7]!)/3,z=(p[v+2]!+p[v+5]!+p[v+8]!)/3;
          expect(x*n[v]!+y*n[v+1]!+z*n[v+2]!).toBeGreaterThan(0);
        }
      }
    } finally {scene.dispose();engine.dispose();}
  });
});

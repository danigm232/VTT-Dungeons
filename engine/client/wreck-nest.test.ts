import {describe,it,expect,vi} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {buildHarpyNest,nestWalkingCentres,nestWalkDistance,nestTreasureOffset} from './wreck-nest.js';
import {WRECK_STRUCTURE as S,wreckListHeight} from '../shared/wreck-structure.js';
import {wreckRuntimeScenes,wreckPorts} from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';

describe('cofa: canasta orgánica y accesos originales',()=>{
  it('retains exact clearance distances after removing temporary arrays from the construction hot path',()=>{
    const edges=nestWalkingCentres.flatMap((a,i)=>nestWalkingCentres.slice(i+1).filter(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<=1.501).map(b=>[a,b] as const));
    for(let x=-3;x<=3;x+=.17)for(let z=-3;z<=3;z+=.19){
      const expected=Math.min(...edges.map(([a,b])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));
      expect(nestWalkDistance(x,z)).toBeCloseTo(expected,12);
    }
  });
  it('tiene profundidad, materiales con relieve y siete lotes sin obstáculos nuevos',()=>{
    const e=new NullEngine(),scene=new Scene(e);try{
      const created=vi.spyOn(scene,'addMesh');
      const meshes=buildHarpyNest(scene);expect(meshes).toHaveLength(7);
      expect(created.mock.calls.length).toBeLessThan(500);
      expect(meshes.map(m=>m.getTotalVertices())).toEqual([6993,5616,22085,24780,440,2339,378]);
      expect(meshes[0]!.metadata.grassBladeCount).toBeGreaterThan(2000);
      const ivory=meshes.find(m=>m.material!.name.includes('old-bones'))!.material as StandardMaterial;
      expect(ivory.diffuseColor.r).toBeGreaterThan(.88);expect(ivory.diffuseColor.g).toBeGreaterThan(.86);expect(ivory.diffuseColor.b).toBeGreaterThan(.8);
      let min=Infinity,max=-Infinity,vertices=0,raised=0;
      for(const m of meshes){expect(m.isPickable||m.checkCollisions).toBe(false);expect(m.metadata.deckSurfaceId).toBe('crow');expect(m.receiveShadows).toBe(true);
        const mat=m.material as StandardMaterial;expect(mat.diffuseTexture&&mat.bumpTexture).toBeTruthy();
        const p=m.getVerticesData('position')!,n=m.getVerticesData('normal')!;vertices+=m.getTotalVertices();expect(p.every(Number.isFinite)&&n.every(Number.isFinite)).toBe(true);
        for(let i=0;i<p.length;i+=3){const x=p[i]!-S.origin.x,z=p[i+2]!-S.origin.z,h=p[i+1]!-S.crowHeight-wreckListHeight(p[i+2]!);
          min=Math.min(min,h);max=Math.max(max,h);if(h>.4)raised++;
          expect(Math.hypot(x,z)).toBeLessThanOrEqual(S.nestRadius+.001);
          expect(Math.hypot(x-S.crowHeight*.015,z+S.crowHeight*.021)).toBeGreaterThan(.379);
          if(nestWalkDistance(x,z)<.295)expect(h).toBeLessThanOrEqual(.131);
          if(x>1.7&&Math.abs(z)<.645)expect(h).toBeLessThanOrEqual(.121);
        }
      }
      const bowl=meshes.find(m=>m.material!.name.includes('packed-fibres'))!,normal=bowl.getVerticesData('normal')!;
      // First 19 × 97 vertices form the upward-facing bowl, not its skirt.
      expect(Array.from({length:19*97},(_,i)=>normal[i*3+1]!).reduce((a,b)=>a+b,0)/(19*97)).toBeGreaterThan(.7);
      expect(min).toBeLessThan(-.2);expect(max).toBeGreaterThan(.75);expect(max-min).toBeLessThan(1.5);expect(raised).toBeGreaterThan(500);expect(vertices).toBeLessThan(65000);
      // Test triangle surfaces too: low vertices alone could leave a broad
      // cloth triangle bridging a path and hiding the character's feet.
      for(const [x,z] of nestWalkingCentres)for(const [dx,dz] of [[0,0],[.2,0],[-.2,0],[0,.2],[0,-.2]]){
        const ray=new Ray(new Vector3(S.origin.x+x+dx!,S.crowHeight+3,S.origin.z+z+dz!),new Vector3(0,-1,0));
        for(const mesh of meshes){mesh.computeWorldMatrix(true);const hit=mesh.intersects(ray,false);if(hit.hit)expect(hit.pickedPoint!.y-S.crowHeight-wreckListHeight(hit.pickedPoint!.z)).toBeLessThanOrEqual(.145);}
      }
    }finally{scene.dispose();e.dispose();}
  });
  it('mantiene exactamente las casillas, los 15 m y el acceso P10',()=>{
    const scene=wreckRuntimeScenes[0]!,crow=scene.terrain!.surfaces.find(s=>s.id==='crow')!;
    expect(crow.tiles.map(t=>[(t.cell.col+.5)*1.5-S.origin.x,(t.cell.row+.5)*1.5-S.origin.z])).toEqual(nestWalkingCentres);
    const port=wreckPorts.find(p=>p.id==='P10')!;expect(port.mode).toBe('rope-ladder');expect(port.to.surfaceId).toBe('crow');expect(S.crowHeight).toBe(15);
  });
  it('solo oculta visualmente las cinco piezas canónicas dentro de sus casillas',()=>{
    const treasure=wreckRuntimeScenes[0]!.pickups!.filter(p=>p.id.startsWith('crow-'));
    expect(treasure).toHaveLength(5);expect(treasure.reduce((n,p)=>n+Number(p.item.match(/\((\d+) po\)/)![1]),0)).toBe(120);
    for(const p of treasure){const offset=nestTreasureOffset(p.id)!;expect(offset).toBeTruthy();expect(Math.abs(offset.x)).toBeLessThan(.4);expect(Math.abs(offset.z)).toBeLessThan(.4);expect(offset.y).toBeLessThan(.1);}
    expect(nestTreasureOffset('invented-treasure')).toBeUndefined();
  });
  it('reduce eslora y manga con el mismo factor sin reducir la cuadrícula ni la cofa',()=>{
    expect(S.length/63).toBeCloseTo(41/42,8);expect(S.stations.find(s=>s[0]===0)![1]/10.55).toBeCloseTo(S.length/63,8);
    expect(S.tileMeters).toBe(1.5);expect(S.crowHeight).toBe(15);expect(S.crowRadius).toBe(2.9);
  });
});

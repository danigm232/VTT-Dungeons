import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {bindRetreatWinchCargo} from '../../campaigns/stormwreck-isle/public/retreat-zone-finishes';
import {retreatWinchContextY,retreatPlayerCameraHalfHeight} from '../../campaigns/stormwreck-isle/public/retreat-camera-composition';

describe('Retreat winch finishing',()=>{
 it('keeps cargo world coordinates at rest and follows the pallet through 0/12/15 m under a mirrored glTF root',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);try{
   const root=new TransformNode('gltf-root',scene);root.scaling.z=-1;
   const pallet=new TransformNode('pallet',scene),cargo=new TransformNode('crate',scene),other=new TransformNode('house-crate',scene);pallet.parent=cargo.parent=other.parent=root;
   pallet.position.set(160.8,12,-70.17);cargo.position.set(160.56,12.215,-70.12);other.position.set(161,15.2,-66);
   const before=Array.from(cargo.computeWorldMatrix(true).asArray());expect(bindRetreatWinchCargo(pallet,[cargo,other])).toBe(1);const after=Array.from(cargo.getWorldMatrix().asArray());after.forEach((v,i)=>expect(v).toBeCloseTo(before[i]!,6));expect(other.parent).toBe(root);
   for(const y of [0,12,15]){pallet.position.y=y;pallet.computeWorldMatrix(true);cargo.computeWorldMatrix(true);expect(cargo.getAbsolutePosition().y).toBeCloseTo(y+.215,5);}
  }finally{scene.dispose();engine.dispose();}
 });
 it('keeps close inspection centered and preserves the player envelope',()=>{
  const beta=65*Math.PI/180;expect(retreatWinchContextY(15.8,15,1.8,.9,4,beta,0,1.92)).toBe(15.8);expect(retreatPlayerCameraHalfHeight(1280,720,720)).toBe(8);
 });
 it('brings low cargo into context without clipping the head at the permitted elevations',()=>{
  for(const tilt of [5,10,15,20,25])for(const height of [1.05,1.3,1.8]){
   const beta=(90-tilt)*Math.PI/180,vertical=Math.sin(beta),base=15+height*.4/vertical,y=retreatWinchContextY(base,15,height,.9,8,beta,0,1.92);
   expect(y).toBeLessThan(base);expect((15-y)*vertical+height*.9).toBeLessThanOrEqual(8);expect(Number.isFinite(y)).toBe(true);
  }
 });
});

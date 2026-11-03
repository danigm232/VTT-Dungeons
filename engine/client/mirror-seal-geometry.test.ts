import {expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {mirrorSealGeometry,mirrorSealArch} from '../../campaigns/one-shot/playground/mirror-art-direction';
import {MIRROR_GALLERY} from '../../campaigns/one-shot/playground/mirror-cave-layout';

it('closes every boundary edge, including the arch, both caps and the floor joint',()=>{
 const {positions,indices}=mirrorSealGeometry(),edges=new Map<string,number>();
 expect(positions.every(Number.isFinite)).toBe(true);
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j]!,b=indices[i+(j+1)%3]!,key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)??0)+1);}
 expect([...edges.values()].every(count=>count===2)).toBe(true);
 expect(Math.max(...positions.filter((_,i)=>i%3===2))-Math.min(...positions.filter((_,i)=>i%3===2))).toBeCloseTo(3.35);
});

it('blocks rays through the actual cave opening at all five yaws and continuous camera inclinations',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),mesh=new Mesh('seal',scene),data=new VertexData(),geometry=mirrorSealGeometry();
 Object.assign(data,geometry);data.applyToMesh(mesh);mesh.material=new StandardMaterial('ice',scene);mesh.computeWorldMatrix(true);let rays=0;
 for(const tilt of [5,7.35,10,12.6,15,20,25])for(const yaw of [-30,-15,0,15,30])for(let ix=0;ix<19;ix++)for(let iy=0;iy<9;iy++){
  const t=-.97+ix/18*1.94,top=mirrorSealArch(t,5.15),point=new Vector3(MIRROR_GALLERY.x+t*2.75,.04+(top-.08)*(iy/8),-10.8);
  const rad=Math.PI/180,dir=new Vector3(Math.sin(yaw*rad)*Math.cos(tilt*rad),Math.sin(tilt*rad),Math.cos(yaw*rad)),origin=point.add(dir.scale(40));
  const hit=mesh.intersects(new Ray(origin,dir.scale(-1),41),false,undefined,false);expect(hit.hit,`ray ${tilt}/${yaw}/${ix}/${iy}`).toBe(true);rays++;
 }
 expect(rays).toBe(5985);scene.dispose();engine.dispose();
});

it('keeps solid ice clear of the body footprints in adjacent legal boundary cells',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),mesh=new Mesh('seal',scene),data=new VertexData();Object.assign(data,mirrorSealGeometry());data.applyToMesh(mesh);mesh.material=new StandardMaterial('ice',scene);mesh.computeWorldMatrix(true);
 for(const x of [-9.75,-3.75])for(const z of [-9,-7.5])for(const radius of [0,.14,.28])for(let i=0;i<32;i++){
  const a=i/32*Math.PI*2,ray=new Ray(new Vector3(x+Math.cos(a)*radius,.025,z+Math.sin(a)*radius),Vector3.Up(),1.8);
  const hit=mesh.intersects(ray,false,undefined,false);expect(hit.hit,JSON.stringify({x,z,radius,i,distance:hit.distance,point:hit.pickedPoint})).toBe(false);
 }
 scene.dispose();engine.dispose();
});

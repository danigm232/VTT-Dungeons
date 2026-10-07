import { describe,it,expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';

describe('authored blue ice footprints',()=>{
  it('uses exactly the Babylon polygon and Y rotation for every fatal floe',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),map=D8NIGHT.maps.mirror.MAP;
    for(const o of map.objects.filter((o:any)=>o.asset==='ice_floe')){
      const mesh=MeshBuilder.CreateCylinder('floe',{diameter:o.diameter,height:o.height??.10,tessellation:o.tessellation??7},scene);
      mesh.position.set(o.position[0],0,o.position[1]);mesh.scaling.z=o.depthScale??.72;mesh.rotation.y=o.rotation??0;
      const matrix=mesh.computeWorldMatrix(true),vertices=mesh.getVerticesData('position')!;
      const zone=map.navigation.zones.find((z:any)=>z.label==='placa de hielo azul fino'&&z.position===o.position)!;
      const perimeter:Vector3[]=[];
      for(let i=0;i<vertices.length;i+=3)if(Math.hypot(vertices[i]!,vertices[i+2]!)>.01)perimeter.push(Vector3.TransformCoordinates(new Vector3(vertices[i]!,vertices[i+1]!,vertices[i+2]!),matrix));
      for(const [x,z] of zone.outline)expect(perimeter.some(p=>Math.hypot(p.x-o.position[0]-x,p.z-o.position[1]-z)<.00001)).toBe(true);
      mesh.dispose();
    }
    scene.dispose();engine.dispose();
  });
});

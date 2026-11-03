import {expect,it} from 'vitest';
import {mirrorSegmentHitsBounds,mirrorMeshBlocksSegment} from '../../campaigns/one-shot/playground/mirror-environment';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {Ray} from '@babylonjs/core/Culling/ray';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {WorldBillboards,type BillboardFrame} from './world-billboards';
import {MirrorSequenceGate} from './mirror-sequence';
import {mirrorSealTransition} from '../../campaigns/one-shot/playground/mirror-art-direction';
it('does not replay a broken seal when preview frames precede the first restored snapshot',()=>{
 const preview=mirrorSealTransition(undefined,undefined);expect(preview.next).toBeUndefined();
 expect(mirrorSealTransition(preview.next,'destroyed')).toEqual({next:true,burst:false});
 expect(mirrorSealTransition(false,'destroyed')).toEqual({next:true,burst:true});
 expect(mirrorSealTransition(true,'destroyed')).toEqual({next:true,burst:false});
 expect(mirrorSealTransition(true,undefined)).toEqual({next:true,burst:false});
});
it('deduplicates one event, rejects expired reconnect events and resumes at authoritative age',()=>{
 const gate=new MirrorSequenceGate(),event={eventId:'epoch:one',serverTime:1000};
 expect(gate.accept(event,1300,1600)).toBe(300);expect(gate.accept(event,1400,1600)).toBeNull();
 expect(gate.accept({eventId:'old',serverTime:100},3000,1600)).toBeNull();
 expect(gate.accept({eventId:'new-runtime',serverTime:3100},3200,1600)).toBe(100);
});
it('cuts only the bounded orthographic sight segment, including parallel edge rays',()=>{
 const d={x:0,y:0,z:-1},box={min:{x:4,y:0,z:3},max:{x:6,y:3,z:4}};
 expect(mirrorSegmentHitsBounds({x:5,y:1,z:10},d,10,box.min,box.max)).toBe(true);
 expect(mirrorSegmentHitsBounds({x:0,y:1,z:10},d,10,box.min,box.max)).toBe(false);
 expect(mirrorSegmentHitsBounds({x:5,y:1,z:10},d,5,box.min,box.max)).toBe(false);
 expect(mirrorSegmentHitsBounds({x:5,y:1,z:10},d,10,{x:4,y:0,z:-4},{x:6,y:3,z:-3})).toBe(false);
});
it('local painted light preserves state tint, opacity and feet and does not affect other scenes',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),camera=new ArcRotateCamera('camera',1,1,20,Vector3.Zero(),scene);
 const f:BillboardFrame={url:'/atlas',sourceWidth:64,sourceHeight:64,x:0,y:0,width:64,height:64,worldWidth:1,worldHeight:1.7,anchorX:.5,anchorY:1,offsetX:0,offsetY:0,flipX:false,alpha:.4,tint:0xff8080};
 const factory=()=>new Texture(null,scene),point=new Vector3(3,0,4),plain=new WorldBillboards(scene,factory),lit=new WorldBillboards(scene,factory,false,()=>({r:.72,g:.9,b:1}));
 plain.sync('plain',point,camera,f,null,true,false);lit.sync('lit',point,camera,f,null,true,false);
 const a=scene.getMeshByName('actor:plain:body')!,b=scene.getMeshByName('actor:lit:body')!;
 expect(b.position.equals(a.position)).toBe(true);expect(b.scaling.equals(a.scaling)).toBe(true);
 expect(b.material!.alpha).toBe(.4);expect((b.material as any).emissiveColor.r).toBeCloseTo(.72);expect((b.material as any).emissiveColor.g).toBeCloseTo(128/255*.9);
 expect((a.material as any).emissiveColor.r).toBe(1);
 lit.dispose();plain.dispose();expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
});
it('keeps a wall opaque when only its bounding box overlaps the body sightline',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),mesh=new Mesh('sloping-wall',scene),data=new VertexData();
 data.positions=[0,0,0,4,0,0,0,4,0];data.indices=[0,1,2];data.applyToMesh(mesh);
 const miss=new Ray(new Vector3(3,3,8),new Vector3(0,0,-1),10),hit=new Ray(new Vector3(1,1,8),new Vector3(0,0,-1),10);
 expect(mirrorMeshBlocksSegment(mesh,miss)).toBe(false);expect(mirrorMeshBlocksSegment(mesh,hit)).toBe(true);
 expect(mirrorMeshBlocksSegment(mesh,new Ray(hit.origin,hit.direction,5))).toBe(false);
 scene.dispose();engine.dispose();
});

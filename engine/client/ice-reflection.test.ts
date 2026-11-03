import {expect,it} from 'vitest';
import {iceReflectionGeometry} from './ice-reflection';
import {WorldBillboards,billboardUVs,type BillboardFrame} from './world-billboards';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {Scene} from '@babylonjs/core/scene';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Texture} from '@babylonjs/core/Materials/Textures/texture';
const frame:BillboardFrame={url:'/atlas',sourceWidth:64,sourceHeight:128,x:0,y:0,width:64,height:128,worldWidth:.8,worldHeight:1.6,anchorX:.5,anchorY:1,offsetX:0,offsetY:0,flipX:false,alpha:.7,tint:0xffffff};
it('reflects feet first, fades out and clips each strip to a nearby ice patch',()=>{
 const uv=billboardUVs(frame),g=iceReflectionGeometry(frame,{x:0,y:0,z:0},{x:1,z:0},{x:0,z:1},Math.PI/12,p=>({height:.02,strength:p.z>.4?.2:0}),uv);
 expect(g.uvs[1]).toBe(uv[1]);expect(g.uvs.at(-1)).toBe(uv[5]);
 expect(g.colors[3]).toBe(0);expect(g.colors[12*4+3]).toBeGreaterThan(0);expect(g.colors.at(-1)).toBe(0);
 expect(Math.max(...g.positions.filter((_,i)=>i%3===2))).toBeLessThanOrEqual(2.2);
});
it('shares the visible pose atlas, cannot be picked, cleans up and is opt-in per scene',()=>{
 const e=new NullEngine(),s=new Scene(e),c=new ArcRotateCamera('camera',1,1,20,Vector3.Zero(),s);let created=0;
 const factory=()=>{created++;return new Texture(null,s);};
 const ordinary=new WorldBillboards(s,factory),ice=new WorldBillboards(s,factory,false,undefined,()=>({height:0,strength:.2}));
 ordinary.sync('other',Vector3.Zero(),c,frame,null,true,false);ice.sync('icy',Vector3.Zero(),c,frame,null,true,false);
 const reflection=s.getMeshByName('actor:icy:ice-reflection:blend')!,body=s.getMeshByName('actor:icy:body')!;
 expect(reflection).toBeTruthy();expect(s.getMeshByName('actor:other:ice-reflection:blend')).toBeNull();
 expect(reflection.isPickable).toBe(false);expect((reflection.material as any).diffuseTexture).toBe((body.material as any).diffuseTexture);
 expect(created).toBe(4); // One atlas and one contact mask per billboard manager.
 ice.sync('icy',Vector3.Zero(),c,null,null,false,false);expect(reflection.isEnabled()).toBe(false);
 ice.dispose();ordinary.dispose();expect(s.meshes).toHaveLength(0);s.dispose();e.dispose();
});

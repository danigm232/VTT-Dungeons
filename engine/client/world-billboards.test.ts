import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Viewport } from '@babylonjs/core/Maths/math.viewport.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { WorldBillboards, billboardUVs, billboardCenter, type BillboardFrame } from './world-billboards';

const frame: BillboardFrame = { url: '/atlas.png', sourceWidth: 1024, sourceHeight: 512, x: 256, y: 128, width: 128, height: 256,
  worldWidth: .8, worldHeight: 1.6, anchorX: .45, anchorY: .95, offsetX: 0, offsetY: 0, flipX: false, alpha: 1, tint: 0xffffff };
describe('painted characters inside the 3D scenery', () => {
  it('crops the correct atlas cell without touching adjacent poses and mirrors its UVs', () => {
    const uv = billboardUVs(frame), flipped = billboardUVs({ ...frame, flipX: true });
    expect(uv[0]).toBeGreaterThan(.25); expect(uv[2]).toBeLessThan(.375);
    expect(uv[1]).toBeGreaterThan(.25); expect(uv[5]).toBeLessThan(.75);
    expect(flipped[0]).toBe(uv[2]); expect(flipped[2]).toBe(uv[0]); expect(flipped[1]).toBe(uv[1]);
  });
  it('keeps the feet pivot on the same ground coordinate through every orbit and allowed tilt', () => {
    const engine = new NullEngine(), scene = new Scene(engine), ground = new Vector3(3, 1.2, -4);
    const camera = new ArcRotateCamera('camera', 0, Math.PI / 4, 80, ground, scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA; camera.orthoLeft = -12; camera.orthoRight = 12; camera.orthoTop = 8; camera.orthoBottom = -8;
    const billboards=new WorldBillboards(scene,()=>new Texture(null,scene));
    for (const tilt of [25,35,45,50]) for (let step = 0; step < 8; step++) {
      camera.alpha = step * Math.PI / 4; camera.beta = (90 - tilt) * Math.PI / 180; camera.getViewMatrix(true);
      const right = camera.getDirection(Vector3.Right()), up = camera.getDirection(Vector3.Up());
      const center = billboardCenter(ground, right, up, frame);
      const anchor = center.add(right.scale((frame.anchorX - .5) * frame.worldWidth)).add(up.scale((.5 - frame.anchorY) * frame.worldHeight));
      expect(Vector3.Distance(anchor, ground)).toBeLessThan(.00001);
      billboards.sync('player',ground,camera,frame,null,true,true);
      const body=scene.getMeshByName('actor:player:body')!,matrix=body.computeWorldMatrix(true);
      const feet=Vector3.TransformCoordinates(new Vector3(frame.anchorX-.5,.5-frame.anchorY,0),matrix);
      expect(Vector3.Distance(feet,ground)).toBeLessThan(.00001);
      const upright=Vector3.TransformNormal(Vector3.Up(),matrix);expect(Math.abs(upright.x)+Math.abs(upright.z)).toBeLessThan(.00001);
    }
    billboards.dispose();
    scene.dispose(); engine.dispose();
  });
  it('retains the last visible pose while the next texture loads without stopping world movement',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),camera=new ArcRotateCamera('camera',-.8,.8,80,Vector3.Zero(),scene);
    let ready=false;const images=new Map<string,Texture>();
    const billboards=new WorldBillboards(scene,url=>{const texture=new Texture(null,scene);texture.isReady=()=>url!== '/next.png'||ready;images.set(url,texture);return texture;});
    billboards.sync('player',Vector3.Zero(),camera,frame,null,true,false);
    const body=scene.getMeshByName('actor:player:body')!,material=body.material as any;
    billboards.sync('player',new Vector3(3,0,2),camera,{...frame,url:'/next.png'},null,true,false);
    expect(material.diffuseTexture).toBe(images.get(frame.url));expect(body.position.x).toBeGreaterThan(2.9);expect(body.position.z).toBeGreaterThan(1.9);
    ready=true;billboards.sync('player',new Vector3(3,0,2),camera,{...frame,url:'/next.png'},null,true,false);
    expect(material.diffuseTexture).toBe(images.get('/next.png'));billboards.dispose();scene.dispose();engine.dispose();
  });
  it('uses shared textures, selects the actual projected actor and releases scene resources', () => {
    const engine = new NullEngine(), scene = new Scene(engine), ground = new Vector3(2, 0, -3);
    const camera = new ArcRotateCamera('camera', -.8, .8, 80, ground, scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA; camera.orthoLeft = -12; camera.orthoRight = 12; camera.orthoTop = 8; camera.orthoBottom = -8;
    camera.getViewMatrix(true); camera.getProjectionMatrix(true);
    const created: string[] = [], billboards = new WorldBillboards(scene, url => { created.push(url); return new Texture(null, scene); });
    void scene.defaultMaterial;
    const originalMeshes = scene.meshes.length, originalMaterials = scene.materials.length;
    billboards.sync('player', ground, camera, frame, null, true, true);
    billboards.sync('npc', new Vector3(-2,0,-3), camera, frame, { ...frame, alpha: .3 }, true, false);
    const bodyMaterial = scene.getMeshByName('actor:player:body')!.material!;
    expect(bodyMaterial.forceDepthWrite).toBe(true);
    expect(bodyMaterial.needDepthPrePass).toBe(false);
    expect((bodyMaterial as any).useAlphaFromDiffuseTexture).toBe(true);
    expect((bodyMaterial as any).opacityTexture).toBeNull();
    expect((bodyMaterial as any).emissiveTexture).toBe((bodyMaterial as any).diffuseTexture);
    const upright = Vector3.TransformNormal(Vector3.Up(), scene.getMeshByName('actor:player:body')!.computeWorldMatrix(true));
    expect(Math.abs(upright.x) + Math.abs(upright.z)).toBeLessThan(.00001);
    expect(new Set(bodyMaterial.getActiveTextures()).size).toBe(1);
    expect(scene.getMeshByName('actor:npc:blend')!.material!.forceDepthWrite).toBe(false);
    expect(created.filter(url => url === frame.url)).toHaveLength(1);
    const center = billboardCenter(ground, camera.getDirection(Vector3.Right()), camera.getDirection(Vector3.Up()), frame);
    const pixel = Vector3.Project(center, Matrix.Identity(), camera.getViewMatrix().multiply(camera.getProjectionMatrix()), new Viewport(0,0,1200,800));
    const ray = Ray.CreateNew(pixel.x,pixel.y,1200,800,Matrix.Identity(),camera.getViewMatrix(),camera.getProjectionMatrix());
    expect(billboards.pick(ray)).toBe('player');
    billboards.sync('player', ground, camera, frame, null, false, false);
    expect(billboards.pick(ray)).toBeUndefined();
    billboards.dispose();
    expect(scene.meshes).toHaveLength(originalMeshes); expect(scene.materials).toHaveLength(originalMaterials);
    scene.dispose(); engine.dispose();
  });
});

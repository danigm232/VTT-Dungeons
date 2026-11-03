import { describe, it, expect, vi } from 'vitest';
import { NullEngine, Scene, ArcRotateCamera, Camera, Vector3, Matrix, Frustum } from '@babylonjs/core';
import { buildWreckScenicDepth, wreckScenicFrame } from './wreck-scenic-depth.js';
import { WRECK_STRUCTURE as S } from '../shared/wreck-structure.js';
import { WRECK_CAMERA_BASE_ALPHA } from '../shared/wreck-camera-profile.js';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine);
  const camera = new ArcRotateCamera('scenic-test', WRECK_CAMERA_BASE_ALPHA, Math.PI * 65 / 180, 121, new Vector3(S.origin.x, 1, S.origin.z), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA; camera.minZ = -100; camera.maxZ = 4200;
  camera.orthoTop = 24; camera.orthoBottom = -24; camera.orthoLeft = -40; camera.orthoRight = 40;
  scene.activeCamera = camera;
  const meshes = buildWreckScenicDepth(scene);
  const update = () => { scene.onBeforeRenderObservable.notifyObservers(scene); camera.getViewMatrix(true); camera.getProjectionMatrix(true); scene.updateTransformMatrix(); };
  return { engine, scene, camera, meshes, update };
}

describe('Pecio: profundidad escénica en la cámara ortográfica real', () => {
  it('no bloquea navegación, selección ni oclusión; mantiene un coste pequeño', () => {
    const {engine, meshes} = fixture();
    try {
      expect(meshes).toHaveLength(6);
      expect(meshes.reduce((sum, m) => sum + m.getTotalVertices(), 0)).toBeLessThan(1500);
      for (const m of meshes) {
        expect(m.isPickable).toBe(false); expect(m.checkCollisions).toBe(false);
        expect(m.metadata.tokenOccluder).toBe(false); expect(m.metadata.visualOnly).toBe(true);
      }
      const mist = meshes.find(m => m.metadata.kind === 'horizon-mist')!;
      expect(mist.hasVertexAlpha).toBe(true);
      const alpha = mist.getVerticesData('color')!.filter((_, i) => i % 4 === 3);
      expect(Math.min(...alpha)).toBe(0); expect(Math.max(...alpha)).toBeGreaterThan(.1);
      expect(mist.material!.disableDepthWrite).toBe(true);
    } finally { engine.dispose(); }
  });

  it('conserva el paisaje en la franja superior al girar, inclinar y cambiar zona o pantalla', () => {
    const {engine, scene, camera, meshes, update} = fixture();
    try {
      const ridges = meshes.filter(m => m.metadata.kind === 'distant-island-ridge');
      for (const aspect of [.56, 1.78, 2.4]) for (const tilt of [5,10,15,20,25]) for (const yaw of [-30,-15,0,15,30]) {
        for (const target of [new Vector3(42,1,20.25),new Vector3(18,4,20),new Vector3(67,4,20),new Vector3(42,16,20)]) {
          camera.setTarget(target); camera.alpha = WRECK_CAMERA_BASE_ALPHA+yaw*Math.PI/180; camera.beta = (90-tilt)*Math.PI/180;
          camera.orthoTop=18; camera.orthoBottom=-18; camera.orthoRight=18*aspect; camera.orthoLeft=-18*aspect;
          update(); const frame=wreckScenicFrame(camera);
          for (const m of ridges) {
            const vertices=m.getVerticesData('position')!;
            const world=m.computeWorldMatrix(true);
            let minimum=Infinity,maximum=-Infinity;
            for (let i=0;i<vertices.length;i+=3) {
              const offset=Vector3.TransformCoordinates(Vector3.FromArray(vertices,i),world).subtract(target);
              const projectedHeight=Vector3.Dot(offset,frame.up)/frame.halfHeight;
              minimum=Math.min(minimum,projectedHeight);maximum=Math.max(maximum,projectedHeight);
              // Ridges remain distant scenery, outside the traversable grid.
            }
            expect(minimum).toBeGreaterThan(.339);expect(maximum).toBeLessThan(1.03);
          }
          const planes=Frustum.GetPlanes(scene.getTransformMatrix());
          const mist=meshes.find(m=>m.metadata.kind==='horizon-mist')!;
          mist.computeWorldMatrix(true); expect(mist.isInFrustum(planes)).toBe(true);
          // Foreground tips occupy only the bottom strip, never the actor centre.
          for (const m of meshes.filter(m=>m.metadata.scenicLayer===1)) {
            const centre=Vector3.Dot(m.position.subtract(target),frame.up)/frame.halfHeight;
            expect(centre + m.scaling.y/frame.halfHeight/2, JSON.stringify({aspect,tilt,yaw,target,alpha:camera.alpha,beta:camera.beta,p:m.position.asArray(),scale:m.scaling.asArray()})).toBeLessThan(-.80);
          }
        }
      }
    } finally { engine.dispose(); }
  });

  it('moves the same projected backdrop without rewriting its static vertex buffers', () => {
    const {engine,camera,meshes,update}=fixture();
    try {
      const ridges=meshes.filter(m=>m.metadata.scenicLayer===5||m.metadata.scenicLayer===6);
      const original=ridges.map(m=>Array.from(m.getVerticesData('position')!));
      const uploads=ridges.map(m=>vi.spyOn(m,'updateVerticesData'));
      update();const view=ridges[0]!.computeWorldMatrix(true).clone();
      for(let i=0;i<30;i++){camera.alpha+=.003;camera.orthoTop!+=.05;update();}
      expect(ridges[0]!.computeWorldMatrix(true).equals(view)).toBe(false);
      for(let i=0;i<ridges.length;i++){
        expect(uploads[i]).not.toHaveBeenCalled();
        expect(Array.from(ridges[i]!.getVerticesData('position')!)).toEqual(original[i]);
      }
    } finally {engine.dispose();}
  });

  it('hides all layers in cabins/C8/C9 and restores them after leaving, without changing camera', () => {
    const {engine, scene, camera, meshes, update} = fixture();
    try {
      update(); expect(meshes.every(m=>m.isVisible)).toBe(true);
      const alpha=camera.alpha, beta=camera.beta, halfHeight=camera.orthoTop;
      scene.metadata={wreckInterior:true}; update(); expect(meshes.every(m=>!m.isVisible)).toBe(true);
      camera.alpha += Math.PI; update(); expect(meshes.every(m=>!m.isVisible)).toBe(true);
      scene.metadata.wreckInterior=false; update(); expect(meshes.every(m=>!m.isVisible)).toBe(true);
      camera.alpha=alpha; update(); expect(meshes.every(m=>m.isVisible)).toBe(true);
      expect(camera.beta).toBe(beta); expect(camera.orthoTop).toBe(halfHeight);
      camera.mode=Camera.PERSPECTIVE_CAMERA; update(); expect(meshes.every(m=>!m.isVisible)).toBe(true);
    } finally { engine.dispose(); }
  });
});

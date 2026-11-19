import { ArcRotateCamera, Camera, Vector3, Matrix, Frustum } from '@babylonjs/core';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { buildWreckScenicDepth, wreckScenicFrame } from '../engine/client/wreck-scenic-depth.js';
import { WRECK_STRUCTURE as S } from '../engine/shared/wreck-structure.js';
import { WRECK_CAMERA_BASE_ALPHA } from '../engine/shared/wreck-camera-profile.js';
import { wreckOverviewFrame } from '../engine/client/wreck-camera.js';

const engine = new NullEngine();
const scene = new Scene(engine);

const overview = wreckOverviewFrame(WRECK_CAMERA_BASE_ALPHA, (90 - 25) * Math.PI / 180, 1600 / 900);
console.log('Overview frame:', overview);

const camera = new ArcRotateCamera('cam', WRECK_CAMERA_BASE_ALPHA, (90 - 25) * Math.PI / 180, 800, new Vector3(overview.target.x, overview.target.y, overview.target.z), scene);
camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
camera.orthoTop = overview.halfHeight;
camera.orthoBottom = -overview.halfHeight;
camera.orthoLeft = -overview.halfHeight * (1600 / 900);
camera.orthoRight = overview.halfHeight * (1600 / 900);
scene.activeCamera = camera;

const meshes = buildWreckScenicDepth(scene);
scene.onBeforeRenderObservable.notifyObservers(scene);

const far = meshes.find(m => m.name === 'wreck:scenic:far-volcanic-crest');
console.log('far.isVisible:', far.isVisible);

const wm = far.computeWorldMatrix(true);
const positions = far.getVerticesData('position');
const planes = Frustum.GetPlanes(scene.getTransformMatrix());
console.log('isInFrustum:', far.isInFrustum(planes));

const worldPoints = [];
for (let i = 0; i < positions.length; i += 3) {
  const local = Vector3.FromArray(positions, i);
  const world = Vector3.TransformCoordinates(local, wm);
  worldPoints.push(world);
}

const ys = worldPoints.map(p => p.y);
console.log('World Y min:', Math.min(...ys), 'max:', Math.max(...ys));

const frame = wreckScenicFrame(camera);
const projectedHeights = worldPoints.map(p => Vector3.Dot(p.subtract(camera.target), frame.up) / frame.halfHeight);
console.log('Projected height min:', Math.min(...projectedHeights), 'max:', Math.max(...projectedHeights));

engine.dispose();

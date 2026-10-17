import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import * as B from '@babylonjs/core';
import { createD8Scene } from '../campaigns/one-shot/playground/renderer';
import { D8NIGHT, D8_VERSION } from '../campaigns/one-shot/playground/d8night.config';
import { TEMPLE_ENVIRONMENT_LAYERS } from '../campaigns/one-shot/playground/temple-environment';
import { d8BabylonRuntime } from '../apps/web/d8-babylon-runtime';
import { d8PublicRendererConfig } from '../campaigns/one-shot/renderer-config';

const require = createRequire(import.meta.url);
const { createCanvas } = require(process.env.D8_AUDIT_CANVAS_MODULE ?? '@napi-rs/canvas');
(globalThis as any).OffscreenCanvas = function (w: number, h: number) { return createCanvas(w, h); };
const previous = JSON.parse(JSON.parse(readFileSync('campaigns/one-shot/playground/historico/playground_v57.json', 'utf8')).payload);
const previousSource = JSON.parse(previous.code).files['d8night.config.ts'];
const exports: any = {};
new Function('exports', ts.transpileModule(previousSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const failures: string[] = [], requestedPhase = Number(process.env.D8_ENVIRONMENT_PHASE ?? 5);
for (const [id, map] of Object.entries<any>(D8NIGHT.maps)) {
  const old = exports.D8NIGHT.maps[id];
  for (const key of ['MAP', 'CANON', 'spawn', 'camera']) if (JSON.stringify(map[key]) !== JSON.stringify(old[key])) failures.push(`${id}: playable ${key} changed`);
  if (id !== 'temple' && JSON.stringify(map) !== JSON.stringify(old)) failures.push(`${id}: unrelated map changed`);
}
const config = structuredClone(d8PublicRendererConfig());
config.maps.temple.VTT_AMBIENCE.templeEnvironment.phase = requestedPhase;
const engine = new B.NullEngine({ renderWidth: 1280, renderHeight: 720, textureSize: 512 });
const started = performance.now(), scene = createD8Scene(engine, createCanvas(1280, 720), { babylon: d8BabylonRuntime, config, version: D8_VERSION, integrated: true, mapId: 'temple' });
try {
  const environment = scene.metadata.d8Vtt.templeEnvironment;
  if (!environment) throw new Error('Missing independent temple environment');
  for (const mesh of environment.meshes.filter((mesh: any) => !mesh.isDisposed())) {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    if (mesh.isPickable || mesh.checkCollisions || mesh.metadata?.tokenOccluder !== false || mesh.metadata?.content !== 'VTT_AMBIENCE') failures.push(`${mesh.name}: interactive/occluding decoration`);
    if (mesh.metadata?.radialSeparation) {
      const positions = mesh.getVerticesData('position');
      for (let i = 0; i < positions.length; i += 3) if (Math.hypot(positions[i], positions[i + 2]) < 200) failures.push(`${mesh.name}: horizon intrudes into the board`);
    } else if (box.minimumWorld.x < 26.25 - .001 && box.maximumWorld.x > -26.25 + .001 && box.minimumWorld.z < 42.75 - .001 && box.maximumWorld.z > -33.75 + .001) failures.push(`${mesh.name}: new scenery invades the playable grid`);
    if ([...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()].some(value => !Number.isFinite(value))) failures.push(`${mesh.name}: invalid geometry`);
  }
  for (const id of TEMPLE_ENVIRONMENT_LAYERS) {
    environment.setLayer(id, false);
    if (environment.roots[id].getChildMeshes().some((mesh: any) => mesh.isEnabled())) failures.push(`${id}: layer cannot be disabled`);
    environment.setLayer(id, true);
  }
  const houses = environment.roots.village.getChildTransformNodes().filter((node: any) => node.metadata?.roofEnvelope);
  if (requestedPhase >= 2 && houses.length !== 8) failures.push('village: missing neighbourhood houses');
  for (const node of houses) {
    node.computeWorldMatrix(true); const roof = node.metadata.roofEnvelope;
    for (const end of [-1, 1]) {
      const start = B.Vector3.TransformCoordinates(new B.Vector3(0, roof.eaveY + (roof.ridgeY - roof.eaveY) * .5, end * (roof.depth / 2 + .4)), node.getWorldMatrix());
      const direction = B.Vector3.TransformNormal(new B.Vector3(0, 0, -end), node.getWorldMatrix()).normalize();
      if (!new B.Ray(start, direction, .6).intersectsMeshes(environment.roots.village.getChildMeshes()).length) failures.push('village: an open roof end');
    }
  }
  if (requestedPhase >= 4) {
    if (scene.getMeshByName('templeVillageBackdrop')) failures.push('panorama: old rectangle still present');
    const panorama = environment.roots.panorama.getChildMeshes();
    for (const yaw of [-30, 0, 30]) for (const offset of [-25, 0, 25]) for (const y of [-10, 5, 50, 180]) {
      const angle = (yaw + offset) * Math.PI / 180;
      if (!new B.Ray(new B.Vector3(0, y, 0), new B.Vector3(Math.sin(angle), 0, -Math.cos(angle)), 450).intersectsMeshes(panorama).length) failures.push(`panorama: gap at yaw ${yaw}, offset ${offset}, height ${y}`);
    }
  }
  const camera = scene.activeCamera as B.ArcRotateCamera, cameraChecks: any[] = [];
  const scenery = environment.meshes.filter((mesh: any) => !mesh.isDisposed());
  for (const aspect of [16 / 9, 9 / 16]) for (const tilt of [20, 30, 40]) for (const yaw of [-30, 0, 30]) {
    camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA; camera.alpha = Math.PI / 2 + yaw * Math.PI / 180; camera.beta = (90 - tilt) * Math.PI / 180; camera.radius = 100;
    camera.setTarget(new B.Vector3(0, .65, 4.5), false, true, true); camera.orthoTop = 36; camera.orthoBottom = -36; camera.orthoLeft = -36 * aspect; camera.orthoRight = 36 * aspect;
    if (Math.abs(camera.beta - (90 - tilt) * Math.PI / 180) > .001 || Math.abs(camera.alpha - Math.PI / 2 - yaw * Math.PI / 180) > .001) failures.push('audit camera did not retain requested tilt/yaw');
    camera.getViewMatrix(true); camera.getProjectionMatrix(true);
    for (const [x, z] of [[-24, -30], [24, -30], [0, 0], [-24, 40], [24, 40], [0, 29]]) for (const height of [.05, 1.7]) {
      const end = new B.Vector3(x, height, z), delta = end.subtract(camera.position), length = delta.length();
      if (new B.Ray(camera.position, delta.normalize(), length - .05).intersectsMeshes(scenery).length) failures.push(`scenery obscures grid/token at ${x},${z}: ${tilt}/${yaw}`);
    }
    const planes = B.Frustum.GetPlanes(camera.getTransformationMatrix());
    for (const sx of [0, 640, 1280]) for (const sy of [0, 360, 720]) {
      const ray = B.Ray.CreateNew(sx, sy, 1280, 720, B.Matrix.Identity(), camera.getViewMatrix(), camera.getProjectionMatrix());
      if (!ray.intersectsMeshes(scene.meshes.filter(mesh => mesh.isEnabled() && mesh.isVisible && mesh.getTotalVertices() > 0)).length) failures.push(`viewport gap at ${sx},${sy}: ${aspect}/${tilt}/${yaw}`);
    }
    cameraChecks.push({ aspect, tilt, yaw, mode: tilt === 40 ? 'exploration/combat' : 'exploration', visibleScenicMeshes: scenery.filter((m: any) => m.isEnabled() && m.isInFrustum(planes)).length });
  }
  if (requestedPhase >= 5) {
    const context = scene.metadata.d8Vtt, view = { focus: { x: 0, y: 0, z: 29 }, environment: { timeOfDay: 'auto' }, naturalLight: { phase: 'night', ambient: .13, direct: 0, warmth: .08 } };
    context.setViewContext(view); if (context.presentationDiagnostic.time !== 'night') failures.push('atmosphere: automatic clock overridden');
    context.setViewContext({ ...view, story: { d8TimeLoopBroken: true } }); if (context.presentationDiagnostic.time !== 'night') failures.push('atmosphere: narrative release ignored');
    context.setViewContext({ ...view, environment: { timeOfDay: 'night' } }); if (context.presentationDiagnostic.time !== 'night') failures.push('atmosphere: explicit night ignored');
  }
  if (scenery.length > 160) failures.push(`scenery budget exceeded: ${scenery.length} meshes`);
  const metrics = { version: D8_VERSION, phase: requestedPhase, source: 'Babylon NullEngine; no GPU or FPS measurement', buildMs: Math.round(performance.now() - started), totalMeshes: scene.meshes.length, layers: environment.diagnostics, vertices: scenery.reduce((n: number, m: any) => n + m.getTotalVertices(), 0), geometryBytes: scenery.reduce((n: number, m: any) => n + m.getTotalVertices() * 32 + m.getTotalIndices() * 4 + (m.thinInstanceCount ?? 0) * 64, 0), cameraChecks, failures };
  writeFileSync(`runtime/d8-v58-environment-phase${requestedPhase}.json`, JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics));
} finally { scene.dispose(); engine.dispose(); }
if (failures.length) process.exitCode = 1;

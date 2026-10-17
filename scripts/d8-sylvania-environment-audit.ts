import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import * as B from '@babylonjs/core';
import { createD8Scene } from '../campaigns/one-shot/playground/renderer';
import { D8NIGHT, D8_VERSION } from '../campaigns/one-shot/playground/d8night.config';
import { SYLVANIA_LAYERS, SYLVANIA_STYLE, sylvaniaLightStyle } from '../campaigns/one-shot/playground/sylvania-environment';
import { d8PublicRendererConfig } from '../campaigns/one-shot/renderer-config';
import { d8BabylonRuntime } from '../apps/web/d8-babylon-runtime';
import { oneShotCampaignDefinition } from '../campaigns/one-shot/public/pack';
import { d8CameraHalfHeight, d8CameraNearPlane } from '../engine/client/d8-camera';

const require = createRequire(import.meta.url), { createCanvas } = require(process.env.D8_AUDIT_CANVAS_MODULE ?? '@napi-rs/canvas');
(globalThis as any).OffscreenCanvas = function (w: number, h: number) { return createCanvas(w, h); };
const baselineManifest = JSON.parse(JSON.parse(JSON.parse(readFileSync('campaigns/one-shot/playground/historico/playground_v59.json', 'utf8')).payload).code);
const baseline: any = {};
new Function('exports', ts.transpileModule(baselineManifest.files['d8night.config.ts'], { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(baseline);
const failures: string[] = [], requested = process.env.D8_AUDIT_MAP ?? 'cafe';
const ids = requested === 'all' ? ['cafe', 'market', 'garden', 'dinner', 'temple'] : [requested];
for (const [id, map] of Object.entries<any>(D8NIGHT.maps)) for (const key of ['MAP', 'CANON', 'spawn', 'camera']) {
  if (JSON.stringify(map[key]) !== JSON.stringify(baseline.D8NIGHT.maps[id][key])) failures.push(`${id}: playable ${key} changed from V59`);
}
const signature = (scene: any) => {
  const context = scene.metadata.d8Vtt;
  return { ...context.geometryDiagnostic, geometry: scene.meshes.filter((m: any) =>
    !m.metadata?.environmentLayer && !m.material?.metadata?.d8Backdrop &&
    (m.metadata?.interiorRoof || m.metadata?.nativeDoorLeaf || m.metadata?.windowId || m.metadata?.furnitureCutaway || m.metadata?.buildingEnvelope)
  ).map((m: any) => { m.computeWorldMatrix(true); const box = m.getBoundingInfo().boundingBox; return [m.name, m.getTotalVertices(), m.getTotalIndices(), ...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()].map(v => typeof v === 'number' ? +v.toFixed(5) : v); }).sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
};
let sharedSky: string | null = null;
const sharedPhaseSkies = new Map<string, string>();
for (const id of ids) {
  const engine = new B.NullEngine({ renderWidth: 1280, renderHeight: 720, textureSize: 512 });
  const config = structuredClone(d8PublicRendererConfig()), sceneOptions = { babylon: d8BabylonRuntime, version: D8_VERSION, integrated: true, mapId: id };
  let scene: any;
  try {
    if (id !== 'temple') {
      config.maps[id].VTT_AMBIENCE.sylvaniaEnvironment.enabled = false;
      scene = createD8Scene(engine, createCanvas(1280, 720), { ...sceneOptions, config });
    } else scene = createD8Scene(engine, createCanvas(1280, 720), { ...sceneOptions, config });
    const before = signature(scene), lightCount = scene.lights.length, shadowCount = scene.lights.filter((l: any) => l.getShadowGenerator()).length;
    scene.dispose(); config.maps[id].VTT_AMBIENCE.sylvaniaEnvironment && (config.maps[id].VTT_AMBIENCE.sylvaniaEnvironment.enabled = true);
    scene = createD8Scene(engine, createCanvas(1280, 720), { ...sceneOptions, config });
    const context = scene.metadata.d8Vtt, environment = context.scenicEnvironment;
    if (!environment) throw new Error(`${id}: independent scenic layers missing`);
    const gameplayUnchanged=JSON.stringify(signature(scene))===JSON.stringify(before);
    if (!gameplayUnchanged) failures.push(`${id}: collisions, interactions or playable building geometry changed`);
    if (scene.lights.length !== lightCount || scene.lights.filter((l: any) => l.getShadowGenerator()).length !== shadowCount) failures.push(`${id}: scenery added a light/shadow map`);
    const scenery = environment.meshes.filter((m: any) => !m.isDisposed()), bounds = environment.protectedBounds ?? [-26.25, 26.25, -33.75, 42.75];
    for (const mesh of scenery) {
      mesh.computeWorldMatrix(true); const box = mesh.getBoundingInfo().boundingBox;
      if (mesh.isPickable || mesh.checkCollisions || mesh.metadata.tokenOccluder !== false || mesh.metadata.content !== 'VTT_AMBIENCE') failures.push(`${id}/${mesh.name}: interactive scenery`);
      if ([...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()].some(v => !Number.isFinite(v))) failures.push(`${id}/${mesh.name}: invalid bounds`);
      if (mesh.metadata.radialSeparation) {
        const p = mesh.getVerticesData('position'); for (let i = 0; i < p.length; i += 3) if (Math.hypot(p[i], p[i + 2]) < 200) failures.push(`${id}/${mesh.name}: horizon intrudes`);
      } else if (mesh.metadata.atmosphereParticle) {
        if ((mesh.material?.alpha ?? 1) > .4) failures.push(`${id}/${mesh.name}: opaque atmospheric particle`);
      } else if (box.minimumWorld.x < bounds[1] - .001 && box.maximumWorld.x > bounds[0] + .001 && box.minimumWorld.z < bounds[3] - .001 && box.maximumWorld.z > bounds[2] + .001) failures.push(`${id}/${mesh.name}: scenery invades the playable rectangle`);
    }
    for (const layer of SYLVANIA_LAYERS) { environment.setLayer(layer, false); if (environment.roots[layer].getChildMeshes().some((m: any) => m.isEnabled())) failures.push(`${id}/${layer}: disable failed`); environment.setLayer(layer, true); }
    if(id!=='temple')for(const mesh of scenery.filter((m:any)=>m.metadata.continuousGround)){
      const source=scene.getMeshByName(mesh.metadata.groundUvSource);
      if(!source||mesh.material?.diffuseTexture!==source.material?.diffuseTexture){failures.push(`${id}: ground surface does not continue its source`);continue;}
      const original=source.getVerticesData('position'),originalUv=source.getVerticesData('uv'),normals=source.getVerticesData('normal'),p=mesh.getVerticesData('position'),uv=mesh.getVerticesData('uv');
      if(Array.from(uv).some(v=>!Number.isFinite(v)))failures.push(`${id}: invalid terrain UV`);
      for(let i=0;i<p.length;i+=3){const point=B.Vector3.TransformCoordinates(new B.Vector3(p[i],p[i+1],p[i+2]),mesh.getWorldMatrix());
        for(let j=0;j<original.length;j+=3){if(normals&&normals[j+1]<.5)continue;const reference=B.Vector3.TransformCoordinates(new B.Vector3(original[j],original[j+1],original[j+2]),source.getWorldMatrix());
          if(Math.hypot(point.x-reference.x,point.z-reference.z)<.001&&(Math.abs(uv[i/3*2]-originalUv[j/3*2])>.00001||Math.abs(uv[i/3*2+1]-originalUv[j/3*2+1])>.00001))failures.push(`${id}: texture seam at the tactical edge`);
        }
      }
    }
    if(id==='market'){
      const cloth=scenery.filter((m:any)=>m.name.includes('stall-striped-canopy'));
      environment.adjustView({environment:{windIntensity:0}});environment.updateMotion(3);const rotations=cloth.map((m:any)=>m.rotation.x);
      environment.adjustView({environment:{windIntensity:1}});environment.updateMotion(3);
      if(!cloth.length||cloth.every((m:any,i:number)=>m.rotation.x===rotations[i]))failures.push('market: decorative cloth does not respond to wind');
    }
    if (scenery.some((m:any)=>m.metadata.finalExclusive&&m.isEnabled())) failures.push(`${id}: ending effect active before confirmation`);
    const skyMesh = environment.roots.panorama.getChildMeshes()[0], sky = JSON.stringify([skyMesh.getVerticesData('position'), skyMesh.getVerticesData('color')]);
    if (sharedSky && sharedSky !== sky) failures.push(`${id}: sky differs from Sylvania`); sharedSky = sky;
    if (skyMesh.metadata.arcDegrees !== 200) failures.push(`${id}: excessive/incorrect panorama sector`);
    for (const yaw of [-55, -30, 0, 30, 55]) for (const y of [-10, 5, 50, 180, 400]) {
      const a = yaw * Math.PI / 180; if (!new B.Ray(new B.Vector3(0, y, 0), new B.Vector3(Math.sin(a), 0, -Math.cos(a)), 450).intersectsMeshes([skyMesh]).length) failures.push(`${id}: horizon gap ${yaw}/${y}`);
    }
    const camera = scene.activeCamera as B.ArcRotateCamera, cameraChecks: any[] = [];
    const profile = oneShotCampaignDefinition.scenes.find(s => s.id === id)!, props = profile.props.map(p => ({ ...p, state: p.initialState, structure: 'intact' }));
    for (const aspect of [16 / 9, 9 / 16]) for (const tilt of [15, 20, 25, 30, 35, 40]) for (const yaw of [-30, 0, 30]) {
      const width = bounds[1] - bounds[0], depth = bounds[3] - bounds[2], z = (bounds[2] + bounds[3]) / 2;
      camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA; camera.alpha = Math.PI / 2 + yaw * Math.PI / 180; camera.beta = (90 - tilt) * Math.PI / 180; camera.radius = Math.hypot(...D8NIGHT.maps[id].MAP.size) + 24; camera.maxZ = 1800;
      camera.setTarget(new B.Vector3(0, 4, z), false, true, true); const half = d8CameraHalfHeight({ width, depth, height: 7 }, camera.beta, aspect);
      camera.minZ = d8CameraNearPlane(camera.radius, camera.beta, half, 4);
      camera.orthoTop = half; camera.orthoBottom = -half; camera.orthoLeft = -half * aspect; camera.orthoRight = half * aspect;
      camera.getViewMatrix(true); camera.getProjectionMatrix(true);
      context.setViewContext({ focus: { x: 0, y: 0, z }, cameraPosition: camera.position, props, entities: [], seats: [], environment: { timeOfDay: 'auto', precipitation: 'none' } });
      const solid = scenery.filter((m: any) => m.isEnabled() && (m.material?.alpha ?? 1) > .4 && !m.hasVertexAlpha);
      for (const [x, zz] of [[bounds[0] + 1, bounds[2] + 1], [bounds[1] - 1, bounds[2] + 1], [0, z], [bounds[0] + 1, bounds[3] - 1], [bounds[1] - 1, bounds[3] - 1]]) for (const h of [.05, 1.7]) {
        const delta = new B.Vector3(x, h, zz).subtract(camera.position), length = delta.length();
        if (new B.Ray(camera.position, delta.normalize(), length - .05).intersectsMeshes(solid).length) failures.push(`${id}: new scenery obscures grid/token ${tilt}/${yaw}/${x}/${zz}`);
      }
      for (const sx of [0, 640, 1280]) for (const sy of [0, 360, 720]) {
        const ray = B.Ray.CreateNew(sx, sy, 1280, 720, B.Matrix.Identity(), camera.getViewMatrix(), camera.getProjectionMatrix());
        if (!ray.intersectsMeshes(scene.meshes.filter((m: any) => m.isEnabled() && m.isVisible && m.getTotalVertices() > 0)).length) failures.push(`${id}: viewport gap ${aspect}/${tilt}/${yaw}/${sx}/${sy}`);
      }
      cameraChecks.push({ aspect, tilt, yaw, visible: scenery.filter((m: any) => m.isInFrustum(B.Frustum.GetPlanes(camera.getTransformationMatrix()))).length });
    }
    const view = { focus: { x: 0, y: 0, z: 100 }, environment: { timeOfDay: 'auto' }, naturalLight: { phase: 'night', ambient: .13, direct: 0, warmth: .08 } };
    context.setViewContext(view); if (context.presentationDiagnostic.time !== 'night') failures.push(`${id}: automatic clock overridden`);
    context.setViewContext({ ...view, story: { d8TimeLoopBroken: true } }); if (context.presentationDiagnostic.time !== 'night') failures.push(`${id}: loop release ignored`);
    context.setViewContext({ ...view, environment: { timeOfDay: 'night' } }); if (context.presentationDiagnostic.time !== 'night') failures.push(`${id}: manual night ignored`);
    const lightingChecks: any[] = [];
    for (const [selection, naturalLight] of Object.entries({
      day: { phase: 'midday', ambient: 1, direct: 1, warmth: .08 },
      sunset: { phase: 'sunset', ambient: .43, direct: .18, warmth: .95 },
      night: { phase: 'night', ambient: .13, direct: 0, warmth: .08 },
      dawn: { phase: 'dawn', ambient: .23, direct: .04, warmth: .38 }
    })) {
      context.setViewContext({ ...view, environment: { timeOfDay: selection }, naturalLight });
      const key = scene.getLightByName(`v19_key_${id}`), fill = scene.getLightByName('global'), expected = sylvaniaLightStyle(naturalLight);
      const actualSky = Array.from(skyMesh.getVerticesData('color')) as number[], skySignature = JSON.stringify(actualSky);
      if (context.presentationDiagnostic.time !== naturalLight.phase) failures.push(`${id}: manual ${selection} ignored`);
      if (sharedPhaseSkies.has(selection) && sharedPhaseSkies.get(selection) !== skySignature) failures.push(`${id}: ${selection} sky differs from Sylvania`);
      sharedPhaseSkies.set(selection, skySignature);
      for (const [row, color] of expected.sky.entries()) for (let channel = 0; channel < 3; channel++) if (Math.abs(actualSky[row * 81 * 4 + channel] - color[channel]) > .000001) failures.push(`${id}: stale panorama for ${selection}`);
      const elevation = Math.atan2(-key.direction.y, Math.hypot(key.direction.x, key.direction.z)) * 180 / Math.PI;
      if (Math.abs(elevation - expected.sunElevation) > .001) failures.push(`${id}: incorrect ${selection} sun elevation`);
      if (selection === 'sunset' && (key.diffuse.r < key.diffuse.b * 2 || fill.diffuse.b <= fill.diffuse.r)) failures.push(`${id}: golden sun/cool shadow separation missing`);
      if (selection === 'night' && key.intensity !== 0) failures.push(`${id}: sun remains lit at night`);
      lightingChecks.push({ selection, phase: context.presentationDiagnostic.time, sunElevation: elevation, sun: key.diffuse.asArray(), fill: fill.diffuse.asArray(), intensity: key.intensity });
    }
    if(id==='dinner')for(const ending of ['celebration','solitude','darkness']){
      context.setViewContext({...view,story:{d8TimeLoopBroken:true,d8EndingVisual:ending}});
      scene.onBeforeRenderObservable.notifyObservers(scene);
      if(scenery.some((m:any)=>m.metadata.finalExclusive==='celebration'&&m.isEnabled()!==(ending==='celebration')))failures.push('dinner: incorrect exclusive ending effect');
      if(scenery.some((m:any)=>m.name==='sylvania-dinner-suspended-crystals'&&m.isEnabled()))failures.push('dinner: suspended snow did not release with ending');
      if(ending==='darkness'&&scene.lights.some((l:any)=>['PointLight','SpotLight'].includes(l.getClassName())&&!l.metadata?.sunlight&&l.intensity>.001))failures.push('dinner: local candle lights remain on in the dark ending');
    }
    if (scenery.length > 160) failures.push(`${id}: mesh budget exceeded`);
    const metrics = { version: D8_VERSION, map: id, source: 'Babylon NullEngine; no GPU screenshots, FPS or real draw calls', style: SYLVANIA_STYLE.id, layers: environment.diagnostics, gameplayUnchanged, totalMeshes: scene.meshes.length, localLights: lightCount, shadowMaps: shadowCount, vertices: scenery.reduce((n: number, m: any) => n + m.getTotalVertices(), 0), geometryBytes: scenery.reduce((n: number, m: any) => n + m.getTotalVertices() * 32 + m.getTotalIndices() * 4 + (m.thinInstanceCount ?? 0) * 64, 0), cameraChecks, lightingChecks, failures: failures.filter(f => f.startsWith(id + ':') || f.startsWith(id + '/')) };
    writeFileSync(`runtime/d8-${D8_VERSION.toLowerCase()}-sylvania-${id}.json`, JSON.stringify(metrics, null, 2)); console.log(JSON.stringify({ ...metrics, cameraChecks: cameraChecks.length }));
  } finally { scene?.dispose(); engine.dispose(); }
}
if (failures.length) { console.error(JSON.stringify(failures)); process.exitCode = 1; }

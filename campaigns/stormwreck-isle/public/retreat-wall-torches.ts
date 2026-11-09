import type { Scene } from '@babylonjs/core/scene.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Light } from '@babylonjs/core/Lights/light.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { createTorchFlame, torchMotion } from '../../../engine/client/torch-flame.js';

// The old garden-end fixture at X 82.5 had no wall behind it. Mount its
// replacement on the first solid span of the library facade.
const anchors = [88.5, 94.5, 105, 121.5, 130.2];

/** Refit the five authored sconces to the finished facade. The bracket, flame
 * and light share the wall hit in Babylon world coordinates (Y is up). */
export function installRetreatWallTorches(scene: Scene) {
  const source = scene.meshes.slice();
  const mountingSurfaces = new Set(source.filter(mesh =>
    mesh.isEnabled() && mesh.getTotalVertices() > 0 && !mesh.metadata?.retreatFloor &&
    !mesh.metadata?.retreatDynamic && /stone|cliff|rock|wall|carved|basalt|_South_Upper/i.test(mesh.name)));
  const receivers = source.filter(mesh => mesh.metadata?.retreatFloor || /^R3_Upper_(Bench|Planter)/.test(mesh.name));

  const iron = new StandardMaterial('retreat:torch:wrought-iron', scene);
  iron.diffuseColor = Color3.FromHexString('#494441');
  iron.specularColor = Color3.FromHexString('#604936').scale(.28);
  const oak = scene.getMaterialByName('a1:dark-oak-v5') ?? iron;
  const fixtures = anchors.flatMap((x, index) => {
    const authored = source.filter(mesh => mesh.name.startsWith(`R3_Upper_Torch_${index}_`));
    if (!authored.length) return [];
    const ray = new Ray(new Vector3(x, 19.72, 67.3), new Vector3(0, 0, -1), 5.5);
    const hit = scene.pickWithRay(ray, mesh => mountingSurfaces.has(mesh));
    const wall = hit?.pickedMesh;
    const mount = hit?.pickedPoint;
    if (!mount || !wall) return [];

    const name = `retreat:torch:${index}`;
    const plate = MeshBuilder.CreateBox(name + ':plate', { width: .19, height: .33, depth: .10 }, scene);
    plate.position.copyFrom(mount);
    const arm = MeshBuilder.CreateBox(name + ':arm', { width: .065, height: .075, depth: .32 }, scene);
    arm.position.copyFrom(mount).addInPlaceFromFloats(0, 0, .16);
    const ring = MeshBuilder.CreateCylinder(name + ':collar', {
      diameterTop: .19, diameterBottom: .11, height: .13, tessellation: 8,
    }, scene);
    ring.position.copyFrom(mount).addInPlaceFromFloats(0, .28, .39);
    const handle = MeshBuilder.CreateCylinder(name + ':handle', {
      diameterTop: .105, diameterBottom: .07, height: .68, tessellation: 8,
    }, scene);
    handle.position.copyFrom(mount).addInPlaceFromFloats(0, .05, .31);
    handle.rotation.x = .27;
    for (const part of [plate, arm, ring]) part.material = iron;
    handle.material = oak;
    const bracket = Mesh.MergeMeshes([plate, arm, ring, handle], true, true, undefined, false, true)!;
    bracket.name = name + ':bracket';

    const wick = mount.add(new Vector3(0, .34, .39));
    const flame = createTorchFlame(scene, name + ':flame');
    flame.position.copyFrom(wick);
    flame.scaling.set(.148, .36, .148);
    for (const mesh of [bracket, flame]) {
      mesh.isPickable = false;
      mesh.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, tokenOccluder: false, retreatFixtureOwner: wall.name };
    }

    const light = new PointLight(`retreat:r3-wall-lamp-${index}`, wick.add(new Vector3(0, .12, .045)), scene);
    light.diffuse = Color3.FromHexString('#ffbe78');
    light.specular = Color3.FromHexString('#3d2817');
    light.falloffType = Light.FALLOFF_STANDARD;
    light.range = 5.6;
    light.intensity = 0;
    light.setEnabled(false);
    light.renderPriority = -1;
    light.metadata = { actorLightRegion: 'exterior', minReceiverZ: mount.z };
    light.includedOnlyMeshes = [wall, ...receivers.filter(mesh => {
      const bounds = mesh.getBoundingInfo().boundingBox;
      return bounds.minimumWorld.z >= 63.3 && bounds.maximumWorld.z >= mount.z &&
        bounds.minimumWorld.y >= 17.35 && bounds.minimumWorld.y <= 18.4 &&
        bounds.minimumWorld.x <= x + light.range && bounds.maximumWorld.x >= x - light.range;
    })];
    for (const mesh of authored) mesh.setEnabled(false);
    flame.isVisible = false;
    return [{ index, wall, bracket, flame, light }];
  });
  for (const mesh of receivers) {
    // Long combined walkway meshes can receive more lamps than a normal
    // material's four slots, even though the light ranges barely overlap.
    const count = fixtures.filter(({ light }) => light.includedOnlyMeshes.includes(mesh)).length;
    if (count > 2) mesh.metadata = { ...mesh.metadata, retreatTorchLightSlots: count + 2 };
  }
  const motionPreference = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  return {
    meshes: fixtures.flatMap(({ bracket, flame }) => [bracket, flame]),
    update(time: number, darkness: number) {
      const strength = Math.max(0, Math.min(1, (darkness - .2) / .55));
      for (const { index, wall, bracket, flame, light } of fixtures) {
        const visible = wall.isEnabled() && wall.isVisible && wall.visibility > .2;
        bracket.isVisible = visible;
        flame.isVisible = visible && strength > .02;
        if (light.isEnabled() !== flame.isVisible) light.setEnabled(flame.isVisible);
        const motion = torchMotion(time, index, Boolean(motionPreference?.matches));
        flame.scaling.y = .36 * motion.height;
        flame.scaling.x = .148 * motion.width;
        flame.scaling.z = .148 * motion.width;
        flame.rotation.z = motion.sway;
        light.intensity = flame.isVisible ? strength * (.92 + motion.pulse * 1.1) : 0;
      }
    },
  };
}

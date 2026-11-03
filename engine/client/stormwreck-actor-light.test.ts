import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { sampleStormwreckActorLight as sample, stormwreckActorLightRegion as region } from '../../campaigns/stormwreck-isle/public/actor-light';
import { A1_ROOMS } from '../../campaigns/camp-rests/public/a1-layout';
import { wreckCabins } from './wreck-cabins';

const outdoor = { surfaceId: 'main', cell: { col: 28, row: 14 } };
const cabin = { surfaceId: 'main', cell: { col: wreckCabins.c4.minCol, row: wreckCabins.c4.minRow } };
function fixture(run: (scene: Scene) => void) {
  const engine = new NullEngine(), scene = new Scene(engine);
  try { run(scene); } finally { scene.dispose(); engine.dispose(); }
}
function torch(scene: Scene, sourceRegion: string) {
  const light = new PointLight('carried-light:mike', new Vector3(0, 1, 0), scene);
  light.range = 6; light.intensity = 1.5; light.diffuse = Color3.FromHexString('#ffd49a');
  light.metadata = { actorLightRegion: sourceRegion }; return light;
}
describe('Stormwreck painted actors reuse their own scene light', () => {
  it('separates cabins, exposed decks above them, lower deck and hold independently of cutaway', () => {
    expect(region('wreck-ship', cabin)).toBe('c4');
    expect(region('wreck-ship', { ...cabin, surfaceId: 'c3' })).toBe('exterior');
    expect(region('wreck-ship', { ...cabin, surfaceId: 'lower-deck' })).toBe('lower-deck');
    expect(region('wreck-ship', { ...cabin, surfaceId: 'hold-air' })).toBe('hold-air');
  });
  it('uses the six current translated cells without colouring the courtyard as an interior', () => {
    for (const room of A1_ROOMS) {
      const cell = room.cells[0]!;
      expect(region('dragon-rest', { surfaceId: 'a1', cell: { col: cell.col + 48, row: cell.row + 48 } })).toBe(`room-${room.id}`);
    }
    expect(region('dragon-rest', { surfaceId: 'a3', cell: { col: 82, row: 38 } })).toBe('a3');
    expect(region('dragon-rest', { surfaceId: 'beach', cell: cabin.cell })).toBe('exterior');
  });
  it('responds reversibly to live sun/sky changes and keeps an unlit player readable', () => fixture(scene => {
    const sky = new HemisphericLight('terrain-ambient', Vector3.Up(), scene);
    const sun = new DirectionalLight('ship-key-light', Vector3.Down(), scene);
    sky.intensity = .7; sun.intensity = .92;
    const day = sample(scene, 'wreck-ship', Vector3.Zero(), outdoor);
    sky.intensity = .04; sun.intensity = .02;
    const night = sample(scene, 'wreck-ship', Vector3.Zero(), outdoor);
    expect(day.r).toBeGreaterThan(night.r + .5);
    expect(night.b).toBeGreaterThan(night.r);
    sky.intensity = .7; sun.intensity = .92;
    expect(sample(scene, 'wreck-ship', Vector3.Zero(), outdoor)).toEqual(day);
    expect(sample(scene, 'wreck-ship', Vector3.Zero(), cabin).r).toBeLessThan(day.r);
  }));
  it('follows carried-light switching, distance and room ownership; does not invent depth glow', () => fixture(scene => {
    const unlit = sample(scene, 'wreck-ship', Vector3.Zero(), cabin), light = torch(scene, 'c4');
    const lit = sample(scene, 'wreck-ship', Vector3.Zero(), cabin);
    expect(lit.r - unlit.r).toBeGreaterThan(lit.b - unlit.b);
    expect(sample(scene, 'wreck-ship', new Vector3(12, 0, 0), cabin)).toEqual(unlit);
    light.setEnabled(false); expect(sample(scene, 'wreck-ship', Vector3.Zero(), cabin)).toEqual(unlit);
    light.setEnabled(true); light.metadata.actorLightRegion = 'c5';
    expect(sample(scene, 'wreck-ship', Vector3.Zero(), cabin)).toEqual(unlit);
    const fake = new PointLight('light:c9-depth-glimmer', Vector3.Zero(), scene); fake.intensity = 50;
    expect(sample(scene, 'wreck-ship', Vector3.Zero(), cabin)).toEqual(unlit);
  }));
  it('warms the occupied Retiro room from its existing fill without bleeding into its neighbour', () => fixture(scene => {
    const actor = { ...outdoor, surfaceId: 'a3' }, unlit = sample(scene, 'dragon-rest', Vector3.Zero(), actor);
    const fill = new PointLight('retreat:existing-interior-fill:a3', new Vector3(0, 1, 0), scene);
    fill.range = 11; fill.diffuse = Color3.FromHexString('#ffd2a4'); fill.intensity = .9;
    const lit = sample(scene, 'dragon-rest', Vector3.Zero(), actor);
    expect(lit.r).toBeGreaterThan(unlit.r + .4);
    expect(sample(scene, 'dragon-rest', Vector3.Zero(), { ...actor, surfaceId: 'a4' })).toEqual(unlit);
    fill.intensity = 0; expect(sample(scene, 'dragon-rest', Vector3.Zero(), actor)).toEqual(unlit);
  }));
  it('allocates no graphics resources and remains bounded with several nearby sources', () => fixture(scene => {
    for (let i = 0; i < 4; i++) torch(scene, 'c4');
    const before = [scene.meshes.length, scene.lights.length, scene.materials.length, scene.textures.length];
    for (let i = 0; i < 100; i++) for (const value of Object.values(sample(scene, 'wreck-ship', Vector3.Zero(), cabin))) {
      expect(value).toBeGreaterThanOrEqual(.18); expect(value).toBeLessThanOrEqual(1.04);
    }
    expect([scene.meshes.length, scene.lights.length, scene.materials.length, scene.textures.length]).toEqual(before);
  }));
});

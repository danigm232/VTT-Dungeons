import '@babylonjs/loaders/glTF/index.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { Scene } from '@babylonjs/core/scene.js';

type Point2 = { x: number; z: number };
type AnimalSpec = {
  id: 'deer' | 'stag';
  file: string;
  scale: number;
  arrival: Point2[];
  departure: Point2[];
};
type PathSample = Point2 & { distance: number; heading: number };
type Path = { samples: PathSample[]; length: number };

type Animal = {
  spec: AnimalSpec;
  pivot: TransformNode;
  meshes: Array<{ visibility: number }>;
  animations: Map<string, AnimationGroup>;
  startClip: (name: string, speed?: number, loop?: boolean) => void;
  walkSpeedRatio: number;
  gallopSpeedRatio: number;
  arrival: Path;
  departure: Path;
};

const ANIMATIONS_TO_KEEP = new Set(['idle', 'idle_2', 'idle_headlow', 'eating', 'walk', 'gallop']);
const WALK_SPEED_METERS_PER_SECOND = 1.05;
// Approximate full-stride distance in the source rig's units, tuned to its Walk loop.
const SOURCE_WALK_STRIDE = 3.1;
const GALLOP_SPEED_METERS_PER_SECOND = 2.4;
const SOURCE_GALLOP_STRIDE = 4.5;
const EMERGE_DISTANCE = .72;
const DISAPPEAR_DISTANCE = 2.8;
const GRID_EDGE_CLEARANCE = 1.25;
const ANIMAL_SPECS: AnimalSpec[] = [
  {
    id: 'deer', file: 'quaternius_cc0-deer-908.glb', scale: .4,
    arrival: [{ x: -7.2, z: -6.4 }, { x: -4.8, z: -2.3 }, { x: -2.9, z: 4.2 }, { x: -1.65, z: 11.4 }, { x: -1.65, z: 17.0 }],
    departure: [{ x: -1.65, z: 17.0 }, { x: -1.9, z: 22.1 }, { x: -3.5, z: 28.2 }, { x: -6.1, z: 34.1 }, { x: -8.2, z: 38.0 }]
  },
  {
    id: 'stag', file: 'quaternius_cc0-stag-1373.glb', scale: .39,
    arrival: [{ x: 43.3, z: -6.2 }, { x: 41.2, z: -2.1 }, { x: 39.0, z: 4.0 }, { x: 37.6, z: 10.8 }, { x: 37.6, z: 17.0 }],
    departure: [{ x: 37.6, z: 17.0 }, { x: 38.0, z: 22.0 }, { x: 39.6, z: 28.0 }, { x: 42.0, z: 34.0 }, { x: 44.0, z: 38.0 }]
  }
];

export type ForestFaunaController = { update: (elapsedSeconds: number) => void; dispose: () => void };

function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Smooth, constant-distance sampling keeps the animal's gait from sliding at path corners. */
function makePath(points: Point2[]): Path {
  const samples: PathSample[] = [];
  let distance = 0;
  const addSample = (point: Point2) => {
    const previous = samples.at(-1);
    if (previous) distance += Math.hypot(point.x - previous.x, point.z - previous.z);
    samples.push({ ...point, distance, heading: 0 });
  };
  addSample(points[0]!);
  const subdivisions = 18;
  for (let segment = 0; segment < points.length - 1; segment++) {
    const p0 = points[Math.max(0, segment - 1)]!;
    const p1 = points[segment]!;
    const p2 = points[segment + 1]!;
    const p3 = points[Math.min(points.length - 1, segment + 2)]!;
    for (let step = 1; step <= subdivisions; step++) {
      const t = step / subdivisions, t2 = t * t, t3 = t2 * t;
      const catmull = (a: number, b: number, c: number, d: number) =>
        .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      addSample({ x: catmull(p0.x, p1.x, p2.x, p3.x), z: catmull(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  for (let index = 0; index < samples.length; index++) {
    const previous = samples[Math.max(0, index - 1)]!;
    const next = samples[Math.min(samples.length - 1, index + 1)]!;
    samples[index]!.heading = Math.atan2(next.x - previous.x, next.z - previous.z);
  }
  return { samples, length: distance };
}

function pointOnPath(path: Path, travelled: number): PathSample {
  const distance = Math.max(0, Math.min(path.length, travelled));
  let low = 0, high = path.samples.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (path.samples[middle]!.distance < distance) low = middle + 1;
    else high = middle;
  }
  const nextIndex = Math.max(1, low);
  const before = path.samples[nextIndex - 1]!;
  const after = path.samples[nextIndex]!;
  const span = Math.max(.0001, after.distance - before.distance);
  const t = Math.max(0, Math.min(1, (distance - before.distance) / span));
  const headingDelta = Math.atan2(Math.sin(after.heading - before.heading), Math.cos(after.heading - before.heading));
  return {
    x: before.x + (after.x - before.x) * t,
    z: before.z + (after.z - before.z) * t,
    distance,
    heading: before.heading + headingDelta * t
  };
}

/** Loads the two CC0 animals only in the forest camp, keeping their routes at its outer edges. */
export async function createForestFauna(
  scene: Scene,
  campRoot: TransformNode,
  gridSize = { width: 36, depth: 33 }
): Promise<ForestFaunaController> {
  let disposed = false;
  const root = new TransformNode('forest:occasional-fauna', scene);
  root.parent = campRoot;
  const loadedContainers: Array<Awaited<ReturnType<typeof LoadAssetContainerAsync>>> = [];
  const animals: Animal[] = [];

  const stopAndDispose = () => {
    if (disposed) return;
    disposed = true;
    animals.forEach(animal => { animal.animations.forEach(group => group.stop()); animal.pivot.dispose(true, false); });
    loadedContainers.forEach(container => container.dispose());
    if (!scene.isDisposed) root.dispose(true, false);
  };
  scene.onDisposeObservable.addOnce(stopAndDispose);

  for (const spec of ANIMAL_SPECS) {
    let container: Awaited<ReturnType<typeof LoadAssetContainerAsync>>;
    try {
      container = await LoadAssetContainerAsync(`/art/forest-fauna-v1/${spec.file}`, scene);
    } catch (error) {
      console.warn(`No se pudo cargar la fauna del bosque (${spec.id})`, error);
      continue;
    }
    if (disposed || scene.isDisposed) { container.dispose(); continue; }
    loadedContainers.push(container);
    const pivot = new TransformNode(`forest:fauna:${spec.id}`, scene);
    pivot.parent = root;
    pivot.scaling.setAll(spec.scale);
    pivot.setEnabled(false);
    container.rootNodes.forEach(node => { node.parent = pivot; });
    container.addAllToScene();

    container.meshes.forEach(mesh => {
      mesh.isPickable = false;
      mesh.receiveShadows = false;
      mesh.visibility = 0;
    });
    for (const material of container.materials) if (material instanceof PBRMaterial) {
      material.albedoColor = material.albedoColor.multiply(new Color3(.91, .94, .84));
      material.roughness = Math.max(.88, material.roughness ?? .88);
      material.metallic = 0;
      material.environmentIntensity = Math.min(.32, material.environmentIntensity ?? .32);
    }

    const animations = new Map<string, AnimationGroup>();
    for (const group of container.animationGroups) {
      const key = group.name.trim().toLowerCase();
      if (ANIMATIONS_TO_KEEP.has(key)) {
        group.enableBlending = true;
        group.blendingSpeed = .035;
        animations.set(key, group);
      } else group.dispose();
    }
    const walkCycleSeconds = animations.get('walk')?.getLength() || 1.1667;
    const gallopCycleSeconds = animations.get('gallop')?.getLength() || .5333;
    const walkSpeedRatio = WALK_SPEED_METERS_PER_SECOND * walkCycleSeconds / (spec.scale * SOURCE_WALK_STRIDE);
    const gallopSpeedRatio = GALLOP_SPEED_METERS_PER_SECOND * gallopCycleSeconds / (spec.scale * SOURCE_GALLOP_STRIDE);
    const startClip = (name: string, speed = 1, loop = true) => {
      const requested = animations.get(name.toLowerCase())
        ?? (name.toLowerCase().includes('low') ? animations.get('idle') : undefined);
      if (!requested) return;
      // These GLB clips animate the same skeleton. Stop the previous state so
      // a stationary animal cannot retain the Walk leg cycle.
      animations.forEach(group => group.stop());
      requested.start(loop, speed);
    };
    animals.push({
      spec, pivot, meshes: container.meshes, animations, startClip, walkSpeedRatio, gallopSpeedRatio,
      arrival: makePath(spec.arrival), departure: makePath(spec.departure)
    });
    const animal = animals.at(-1)!;
    for (const [routeName, path] of [['arrival', animal.arrival], ['departure', animal.departure]] as const) {
      const remainsOffGrid = path.samples.every(point =>
        point.x <= -GRID_EDGE_CLEARANCE || point.x >= gridSize.width + GRID_EDGE_CLEARANCE
        || point.z <= -GRID_EDGE_CLEARANCE || point.z >= gridSize.depth + GRID_EDGE_CLEARANCE);
      if (!remainsOffGrid) throw new Error(`El recorrido ${routeName} de ${spec.id} pisa la cuadrícula del bosque.`);
    }
  }

  if (disposed || scene.isDisposed) {
    if (!disposed) stopAndDispose();
    return { update: () => undefined, dispose: () => undefined };
  }
  if (animals.length === 0) return { update: () => undefined, dispose: stopAndDispose };

  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  type SightingPhase = 'hidden' | 'approach' | 'idle' | 'graze' | 'turn' | 'depart' | 'reduced-show';
  let phase: SightingPhase = 'hidden';
  let current: Animal | null = null;
  let currentPath: Path | null = null;
  let phaseStarted = 0;
  let nextAppearance = Number.NaN;
  let nextIndex = Math.random() < .5 ? 0 : Math.min(1, animals.length - 1);
  let idleDuration = 0, grazeDuration = 0, turnFrom = 0, turnDelta = 0;
  let currentMovementSpeed = WALK_SPEED_METERS_PER_SECOND;

  const setVisibility = (animal: Animal, alpha: number) => animal.meshes.forEach(mesh => { mesh.visibility = alpha; });
  const orientAlongPath = (animal: Animal, path: Path, distance = 0) => {
    animal.pivot.rotation.y = pointOnPath(path, distance).heading;
  };
  const startWalking = (animal: Animal, path: Path, time: number, phaseName: 'approach' | 'depart') => {
    currentPath = path;
    phase = phaseName;
    phaseStarted = time;
    currentMovementSpeed = WALK_SPEED_METERS_PER_SECOND;
    animal.startClip('Walk', animal.walkSpeedRatio);
    orientAlongPath(animal, path);
  };
  const enter = (animal: Animal, time: number) => {
    current = animal;
    animal.pivot.position.set(animal.spec.arrival[0]!.x, 0, animal.spec.arrival[0]!.z);
    animal.pivot.setEnabled(true);
    setVisibility(animal, 0);
    idleDuration = 5 + Math.random() * 4;
    const eatingLength = animal.animations.get('eating')?.getLength() || 6;
    grazeDuration = Math.max(6, eatingLength * (.72 + Math.random() * .28));
    if (reducedMotion) {
      animal.pivot.position.set(animal.spec.arrival.at(-1)!.x, 0, animal.spec.arrival.at(-1)!.z);
      phase = 'reduced-show';
      phaseStarted = time;
      animal.startClip(Math.random() < .32 ? 'Idle_2' : 'Idle', .9 + Math.random() * .2);
      return;
    }
    startWalking(animal, animal.arrival, time, 'approach');
  };
  const arrive = (animal: Animal, time: number) => {
    const destination = animal.spec.arrival.at(-1)!;
    animal.pivot.position.set(destination.x, 0, destination.z);
    setVisibility(animal, 1);
    phase = 'idle';
    phaseStarted = time;
    currentPath = null;
    animal.startClip(Math.random() < .5 ? 'Idle_2' : 'Idle', .9 + Math.random() * .2);
  };
  const beginTurn = (animal: Animal, time: number) => {
    phase = 'turn';
    phaseStarted = time;
    turnFrom = animal.pivot.rotation.y;
    const nextHeading = pointOnPath(animal.departure, 0).heading;
    turnDelta = Math.atan2(Math.sin(nextHeading - turnFrom), Math.cos(nextHeading - turnFrom));
    animal.startClip('Idle', .92);
  };
  const depart = (animal: Animal, time: number) => {
    currentPath = animal.departure;
    phase = 'depart';
    phaseStarted = time;
    if (animal.animations.has('gallop') && Math.random() < .28) {
      currentMovementSpeed = GALLOP_SPEED_METERS_PER_SECOND;
      animal.startClip('Gallop', animal.gallopSpeedRatio);
    } else {
      currentMovementSpeed = WALK_SPEED_METERS_PER_SECOND;
      animal.startClip('Walk', animal.walkSpeedRatio);
    }
    orientAlongPath(animal, animal.departure);
  };
  const finish = (time: number) => {
    if (current) {
      current.animations.forEach(group => group.stop());
      current.pivot.setEnabled(false);
      setVisibility(current, 0);
    }
    current = null;
    currentPath = null;
    phase = 'hidden';
    phaseStarted = time;
    nextIndex = animals.length > 1 ? (nextIndex + 1) % animals.length : 0;
    nextAppearance = time + 62 + Math.random() * 45;
  };
  const updatePath = (animal: Animal, time: number, isDeparture: boolean) => {
    const path = currentPath;
    if (!path) return;
    const motionElapsed = Math.max(0, time - phaseStarted);
    const travelled = Math.min(path.length, motionElapsed * currentMovementSpeed);
    const sample = pointOnPath(path, travelled);
    animal.pivot.position.x = sample.x;
    animal.pivot.position.z = sample.z;
    animal.pivot.rotation.y = sample.heading;
    if (!isDeparture) setVisibility(animal, travelled === 0 ? 0 : Math.min(1, travelled / EMERGE_DISTANCE));
    else setVisibility(animal, Math.min(1, Math.max(0, (path.length - travelled) / DISAPPEAR_DISTANCE)));
    if (travelled >= path.length) {
      if (isDeparture) finish(time);
      else arrive(animal, time);
    }
  };

  return {
    update: elapsedSeconds => {
      if (disposed || animals.length === 0) return;
      if (Number.isNaN(nextAppearance)) nextAppearance = elapsedSeconds + 7 + Math.random() * 6;
      if (!current) {
        if (elapsedSeconds >= nextAppearance) enter(animals[nextIndex]!, elapsedSeconds);
        return;
      }
      const elapsed = elapsedSeconds - phaseStarted;
      if (phase === 'approach') updatePath(current, elapsedSeconds, false);
      else if (phase === 'idle') {
        if (elapsed >= idleDuration) {
          phase = 'graze'; phaseStarted = elapsedSeconds;
          if (!reducedMotion) {
            const grazeClip = current.animations.has('eating') && Math.random() < .76 ? 'Eating' : 'Idle_Headlow';
            current.startClip(grazeClip, .92 + Math.random() * .12);
          }
        }
      } else if (phase === 'graze') {
        if (elapsed >= grazeDuration) {
          if (reducedMotion) finish(elapsedSeconds);
          else beginTurn(current, elapsedSeconds);
        }
      } else if (phase === 'turn') {
        const t = Math.min(1, elapsed / .72);
        current.pivot.rotation.y = turnFrom + turnDelta * smoothstep(t);
        if (t >= 1) depart(current, elapsedSeconds);
      } else if (phase === 'depart') updatePath(current, elapsedSeconds, true);
      else if (phase === 'reduced-show') {
        setVisibility(current, Math.min(1, elapsed / 2.4));
        if (elapsed >= 5.4) finish(elapsedSeconds);
      }
    },
    dispose: stopAndDispose
  };
}

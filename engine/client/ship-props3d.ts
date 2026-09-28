import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { PublicProp } from '../shared/protocol.js';

// Decorative geometry only. Walkability, barriers and interactions remain
// entirely server-authoritative; none of these meshes can be picked or collide.
const palette = {
  timber: '#73583e', dark: '#342b27', edge: '#a48358', canvas: '#59483a', blanket: '#544d3e',
  iron: '#485354', rust: '#985d3d', bone: '#998d74', gold: '#b99955',
  glass: '#5b9c9d', rope: '#b7a47b', shadow: '#242c2d'
} as const;
type MaterialName = keyof typeof palette;
const materialCache = new WeakMap<Scene, Map<string, StandardMaterial>>();
function material(scene: Scene, name: MaterialName, woodTexture?: BaseTexture) {
  let cache = materialCache.get(scene);
  if (!cache) { cache = new Map(); materialCache.set(scene, cache); }
  const key = `${name}:${name === 'timber' || name === 'edge' ? woodTexture?.uniqueId ?? 'plain' : 'shared'}`;
  let result = cache.get(key);
  if (!result) {
    result = new StandardMaterial(`ship-prop:${name}`, scene);
    result.diffuseColor = Color3.FromHexString(palette[name]);
    if ((name === 'timber' || name === 'edge') && woodTexture) {
      result.diffuseTexture = woodTexture;
      result.diffuseColor = Color3.FromHexString(name === 'timber' ? '#c4b395' : '#b69a71');
    }
    result.specularColor = name === 'iron' || name === 'gold' || name === 'glass'
      ? Color3.FromHexString('#4e5251') : Color3.FromHexString('#111614');
    cache.set(key, result);
  }
  return result;
}

export function shipPropVisualKey(prop: PublicProp) {
  return [prop.id, prop.kind, prop.rotation, prop.structure,
    prop.kind === 'door' ? prop.state : prop.kind === 'wheel' ? `${prop.state}:${prop.attachment}` : '',
    prop.kind !== 'wheel' && prop.interaction ? JSON.stringify(prop.interaction) : ''].join(':');
}

export function buildShipPropVisual(scene: Scene, prop: PublicProp, width: number, depth: number, woodTexture?: BaseTexture): TransformNode {
  const root = new TransformNode(`ship-prop:${prop.id}`, scene);
  root.metadata = { visualKey: shipPropVisualKey(prop) };
  let serial = 0;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, color: MaterialName) => {
    const mesh = MeshBuilder.CreateBox(`${prop.id}:${name}:${serial++}`, { width: w, height: h, depth: d }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(scene, color, woodTexture); mesh.isPickable = false;
    return mesh;
  };
  const cylinder = (name: string, x: number, y: number, z: number, diameter: number, height: number, color: MaterialName, tessellation = 12) => {
    const mesh = MeshBuilder.CreateCylinder(`${prop.id}:${name}:${serial++}`, { diameter, height, tessellation }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(scene, color, woodTexture); mesh.isPickable = false;
    return mesh;
  };
  const torus = (name: string, x: number, y: number, z: number, diameter: number, thickness: number, color: MaterialName) => {
    const mesh = MeshBuilder.CreateTorus(`${prop.id}:${name}:${serial++}`, { diameter, thickness, tessellation: 20 }, scene);
    mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(scene, color, woodTexture); mesh.isPickable = false;
    return mesh;
  };
  const plank = (name: string, x: number, y: number, z: number, w: number, d: number) => {
    box(name, x, y, z, w, .12, d, 'timber');
    box(`${name}-rim`, x, y + .065, z, w, .025, d, 'edge');
  };
  const leg = (x: number, z: number, h: number) => box('leg', x, h / 2, z, .12, h, .12, 'dark');
  const id = prop.id;

  if (prop.kind === 'door') {
    // Hinged panel, iron straps, latch, and C4's removable transverse bar.
    box('frame-left', -.53, 1.03, 0, .13, 2.06, .20, 'dark');
    box('frame-right', .53, 1.03, 0, .13, 2.06, .20, 'dark');
    box('lintel', 0, 2.05, 0, 1.2, .14, .25, 'edge');
    const open = prop.state === 'open';
    const panel = box('hinged-leaf', open ? -.54 : 0, 1.0, open ? -.48 : 0, open ? .16 : 1.02, 1.92, open ? 1.02 : .13, 'timber');
    panel.rotation.y = open ? -.08 : 0;
    for (const y of [.32, 1.6]) box('iron-strap', open ? -.54 : 0, y, open ? -.48 : -.09,
      open ? .17 : .96, .075, open ? .92 : .055, 'iron');
    cylinder('latch', open ? -.54 : .32, 1, open ? -.14 : -.16, .12, .08, 'gold');
    if (prop.interaction?.kind === 'barred-door' && prop.interaction.barrier === 'barred')
      box('wooden-bar', 0, 1.18, -.22, 1.34, .17, .17, 'edge');
  } else if (prop.kind === 'wheel') {
    plank('wheel-plinth', 0, .09, 0, .82, .72);
    box('pedestal', 0, .51, 0, .28, 1.02, .28, 'dark');
    for (const y of [.25, .8]) box('pedestal-band', 0, y, -.015, .32, .065, .31, 'iron');
    const ring = torus('wheel-rim', 0, 1.3, 0, .97, .09, 'edge');
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const spoke = box('spoke', Math.sin(a) * .28, 1.3 + Math.cos(a) * .28, 0, .065, .64, .07, 'timber');
      spoke.rotation.z = -a;
      const handle = cylinder('handle', Math.sin(a) * .58, 1.3 + Math.cos(a) * .58, 0, .09, .2, 'edge');
      handle.rotation.z = -a;
      const rivet = cylinder('rim-rivet', Math.sin(a) * .475, 1.3 + Math.cos(a) * .475, -.055, .045, .035, 'iron', 8);
      rivet.rotation.x = Math.PI / 2;
    }
    cylinder('hub', 0, 1.3, 0, .23, .20, 'iron').rotation.x = Math.PI / 2;
    root.rotation.z = prop.state === 'fallen' ? 1.1 : prop.state === 'caught' ? .24 : 0;
  } else if (id.includes('ballista')) {
    for (const side of [-1, 1]) {
      plank('carriage-foot', 0, .12, side * .42, 1.65, .2);
      const brace = box('carriage-brace', side * .39, .5, 0, .16, .94, .2, 'timber');
      brace.rotation.z = side * -.5;
      cylinder('torsion-drum', side * .87, 1.08, 0, .28, .52, 'dark');
      for (let turn = 0; turn < 5; turn++) torus('torsion-binding', side * .87, .88 + turn * .075, 0, .3, .035, 'rope');
      box('stock-band', side * .58, 1.13, 0, .075, .28, .42, 'iron');
    }
    box('stand', 0, .55, 0, .4, 1.1, .4, 'dark');
    box('stock', 0, 1.12, 0, Math.min(width, 2.9), .24, .38, 'timber');
    box('bolt', 0, 1.3, 0, Math.min(width, 2.8), .07, .07, 'iron');
    for (const side of [-1, 1]) {
      const arm = box('spring-arm', side * .73, 1.17, side * .45, 1.45, .16, .12, 'edge');
      arm.rotation.y = side * .48;
    }
    box('bowstring', 0, 1.18, -.7, 2.7, .025, .025, 'rope');
    torus('winch', -.5, 1.12, .32, .38, .07, 'rust');
  } else if (id.includes('bowsprit') || id.includes('flotsam') || id.includes('debris')) {
    for (let i = 0; i < (id.includes('bowsprit') ? 3 : 5); i++) {
      const beam = box('splinter', (i - 2) * .15, .16 + i * .045, (i % 2 - .5) * .35,
        Math.max(.48, width * (.5 + (i % 3) * .13)), .13, .17, i % 3 === 0 ? 'edge' : 'timber');
      beam.rotation.y = (i - 2) * .26;
    }
    if (id.includes('flotsam')) torus('loose-rope', 0, .29, .25, .55, .06, 'rope');
  } else if (id.includes('bookshelf')) {
    box('back', 0, 1.05, .28, Math.min(width, 1.35), 2.1, .13, 'dark');
    for (const y of [.12, .8, 1.48, 2.06]) plank('shelf', 0, y, 0, Math.min(width, 1.35), .53);
    for (const x of [-.58, .58]) box('upright', x, 1.05, 0, .12, 2.1, .56, 'timber');
    for (let i = 0; i < 14; i++) box('waterlogged-book', -.5 + (i % 7) * .155, i < 7 ? .49 : 1.17,
      -.09, .11, .48 + (i % 3) * .03, .28, i % 4 === 0 ? 'canvas' : i % 3 === 0 ? 'rust' : 'dark');
  } else if (id.includes('desk') || id.includes('counter') || id.includes('table')) {
    const w = Math.min(width * .82, 3.8), d = Math.min(depth * .76, 1.5);
    plank('worktop', 0, .84, 0, w, d);
    for (const x of [-w / 2 + .16, w / 2 - .16]) for (const z of [-d / 2 + .13, d / 2 - .13]) {
      // The captain's polished desk barely stands on three legs in C4.
      if (id.includes('c4-desk') && x > 0 && z > 0) continue;
      leg(x, z, .8);
    }
    if (id.includes('desk')) {
      cylinder('compass', .28, .95, 0, .24, .035, 'gold');
      box('chart', -.35, .925, 0, .55, .008, .4, 'canvas');
    } else if (id.includes('counter')) {
      cylinder('cooking-pot', .35, .98, 0, .4, .26, 'iron');
      torus('pot-rim', .35, 1.13, 0, .41, .05, 'rust');
      for (let i = 0; i < 3; i++) box('crockery', -.75 + i * .22, .94, -.2, .12, .08, .12, 'bone');
    } else {
      for (let i = 0; i < 3; i++) cylinder('dish', -.55 + i * .52, .93, 0, .28, .035, 'iron');
    }
  } else if (id.includes('bed') || id.includes('bunk')) {
    const w = Math.min(width * .8, 2.6), d = Math.min(depth * .76, 1.1);
    plank('bed-frame', 0, .43, 0, w, d);
    box('mattress', 0, .53, 0, w - .14, .12, d - .12, 'canvas');
    box('salt-stained-blanket', w * .12, .605, 0, w * .58, .045, d - .17, 'blanket');
    box('pillow', -w * .3, .62, 0, .37, .10, d - .24, 'bone');
    for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-d / 2 + .1, d / 2 - .1]) leg(x, z, .43);
    if (id.includes('bunk')) {
      plank('upper-frame', 0, 1.55, 0, w, d);
      box('upper-mattress', 0, 1.66, 0, w - .14, .11, d - .12, 'canvas');
      box('upper-blanket', w * .12, 1.735, 0, w * .58, .045, d - .17, 'blanket');
      for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-d / 2 + .1, d / 2 - .1])
        box('bunk-post', x, 1, z, .08, 1.85, .08, 'dark');
    }
  } else if (id.includes('chair')) {
    plank('seat', 0, .48, 0, .62, .61);
    for (const x of [-.24, .24]) for (const z of [-.24, .24]) leg(x, z, .47);
    box('backrest', 0, .94, .28, .62, .9, .11, 'timber');
  } else if (id.includes('skeleton')) {
    const skull = MeshBuilder.CreateSphere(`${id}:ribcage`, { diameter: .36, segments: 8 }, scene);
    skull.parent = root; skull.position.set(0, .2, 0); skull.scaling.set(1.1, .5, .7);
    skull.material = material(scene, 'bone'); skull.isPickable = false;
    for (let i = 0; i < 4; i++) {
      const rib = torus('rib', i * .13 - .2, .22, 0, .3, .035, 'bone');
      rib.rotation.z = Math.PI / 2;
    }
    for (const side of [-1, 1]) box('arm-bone', side * .3, .13, -.1, .44, .05, .05, 'bone');
  } else if (id.includes('barrel')) {
    cylinder('staves', 0, .49, 0, .69, .98, 'timber', 10);
    for (const y of [.17, .76]) torus('iron-hoop', 0, y, 0, .68, .075, 'rust');
    cylinder('barrel-head', 0, .99, 0, .65, .04, 'dark', 10);
  } else if (id.includes('chest')) {
    const open = prop.kind === 'crate' && prop.interaction?.kind === 'chest' && prop.interaction.open;
    box('iron-chest', 0, .38, 0, 1.12, .67, .77, 'dark');
    for (const x of [-.44, .44]) box('iron-band', x, .39, -.4, .1, .73, .07, 'iron');
    const lid = box('chest-lid', 0, open ? .83 : .76, open ? .4 : 0, 1.18, .17, .81, 'iron');
    if (open) lid.rotation.x = .9;
    box('lock', 0, .38, -.43, .19, .23, .06, 'gold');
  } else if (id.includes('stash')) {
    plank('loose-floorboard', 0, .11, 0, Math.min(width * .8, 1.25), .5);
    for (const x of [-.35, .35]) cylinder('nail', x, .19, 0, .035, .02, 'iron');
  } else {
    const open = prop.kind === 'crate' && prop.interaction?.kind === 'container' && prop.interaction.open;
    const w = Math.min(width * .78, 1.25), d = Math.min(depth * .78, 1.25);
    box('crate-body', 0, .35, 0, w, .69, d, 'timber');
    for (const x of [-w * .38, w * .38]) box('crate-band', x, .35, -d / 2 - .01, .08, .67, .06, 'dark');
    if (!open) plank('lid', 0, .75, 0, w + .07, d + .07);
    else box('open-lid', 0, 1.12, d / 2, w + .07, .1, d + .07, 'edge').rotation.x = .95;
  }
  // C4-C7 doors fill a north-south opening (the adjoining bulkheads have
  // axis z). Rotate the whole hinged frame, not only the leaf: otherwise the
  // panel cuts across the passage instead of sitting in its wall.
  root.rotation.y += prop.rotation * Math.PI / 180 + (prop.kind === 'door' && /^c[4-7]-/.test(prop.id) ? Math.PI / 2 : 0);
  return root;
}

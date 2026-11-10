import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import { WRECK_STRUCTURE as S, wreckBeamAt, wreckListHeight } from '../shared/wreck-structure.js';
import { wreckCabinAt } from './wreck-cabins.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { weatheredBoneMaterial } from './wreck-bone-material.js';

/**
 * 50-year-old stranded shipwreck deck dressing:
 * - Rotting, splintered deck planks and rotted deck holes revealing the flooded hold below.
 * - Smashed cargo crates, overturned split barrels with rusted iron hoops and moss.
 * - Marine fauna: shore crabs near puddles and sea shells/barnacles along scuppers.
 * - Weathered sailor skeletons and ancient drowned remains.
 * - Hanging loose planks swaying gently in the sea breeze.
 * - Perching seagulls on railings with lifelike idle animations.
 * - Inoperable / collapsed secondary stairs and broken railings.
 */
export function buildWreckDeckDressing(scene: Scene, terrain: TerrainDefinition, wood?: BaseTexture) {
  const groups = new Map<string, Mesh[]>();
  const animatedMeshes: Mesh[] = [];
  const materials = new Map<string, StandardMaterial>();

  const paint = (id: string, hex: string, roughness = 0.8) => {
    const m = new StandardMaterial(`wreck-dressing:${id}`, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = Color3.FromHexString('#141816');
    m.specularPower = Math.round((1 - roughness) * 64) + 4;
    m.backFaceCulling = false;
    materials.set(id, m);
    return m;
  };

  const moss = paint('wet-algae', '#3e5940', 0.95);
  const rot = paint('split-black-wood', '#574d39', 0.85);
  const rope = paint('abandoned-rope', '#746b4f', 0.9);
  const leather = paint('old-boots', '#423a2a', 0.8);
  const blood = paint('recent-blood', '#462321', 0.6);
  const iron = paint('rusted-iron', '#282a27', 0.7);
  const crabMat = paint('crab-chitin', '#6d3c26', 0.5);
  const shellMat = paint('sea-shell', '#cdc7b8', 0.6);
  const voidMat = paint('hold-void', '#080c0d', 1.0);
  const gullBody = paint('gull-body', '#e0e4e6', 0.75);
  const gullWing = paint('gull-wing', '#505a60', 0.75);
  const gullBeak = paint('gull-beak', '#d18617', 0.5);
  const bone = weatheredBoneMaterial(scene, 'wreck-dressing:prey-bone', '#969080');

  rot.diffuseTexture = wood ?? null;

  // Procedural algae colony texture
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + .5) / size * 2 - 1, dz = (y + .5) / size * 2 - 1, r = Math.hypot(dx, dz);
    const grain = Math.sin(x * 1.8 + y * 2.3) * Math.cos(y * .91 - x * .83), i = (y * size + x) * 4;
    pixels[i] = 39 + Math.round((grain + 1) * 5);
    pixels[i + 1] = 52 + Math.round((grain + 1) * 8);
    pixels[i + 2] = 35 + Math.round((grain + 1) * 6);
    pixels[i + 3] = Math.round(Math.max(0, Math.min(1, (1 - r + grain * .14) * 3.2)) * (.5 + grain * .18) * 255);
  }
  const colony = RawTexture.CreateRGBATexture(pixels, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  colony.name = 'wreck:algae-colony';
  colony.hasAlpha = true;
  colony.wrapU = colony.wrapV = Texture.CLAMP_ADDRESSMODE;
  moss.diffuseTexture = colony;
  moss.diffuseColor = Color3.White();
  moss.useAlphaFromDiffuseTexture = true;
  moss.transparencyMode = Material.MATERIAL_ALPHABLEND;
  moss.alpha = .9;
  moss.zOffset = -1;

  const add = (mesh: Mesh, surface: string, kind: string, mat: StandardMaterial) => {
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, deckSurfaceId: surface, kind, canonicalDressing: true };
    const key = `${surface}:${kind}:${mat.name}`;
    const g = groups.get(key) ?? [];
    g.push(mesh);
    groups.set(key, g);
    return mesh;
  };

  const addSolo = (mesh: Mesh, surface: string, kind: string, mat: StandardMaterial) => {
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, deckSurfaceId: surface, kind, canonicalDressing: true };
    animatedMeshes.push(mesh);
    return mesh;
  };

  const patch = (p: Vector3, rx: number, rz: number, surface: string, kind: string, mat: StandardMaterial, seed: number) => {
    const m = new Mesh(`wreck-dressing:${kind}`, scene);
    const d = new VertexData(), positions = [p.x, p.y + .012, p.z], indices: number[] = [], normals: number[] = [], colours = [.84, 1, .82, 1];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2, r = .80 + .14 * Math.sin(a * 5 + seed) + .06 * Math.cos(a * 9);
      positions.push(p.x + Math.cos(a) * rx * r, p.y + .012 + Math.sin(a * 3 + seed) * .008, p.z + Math.sin(a) * rz * r);
      colours.push(.70 + (i % 3) * .1, .82 + (i % 2) * .1, .65, 1);
      if (i > 0) indices.push(0, i, i + 1);
    }
    d.uvs = [.5, .5];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2;
      d.uvs.push(.5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5);
    }
    Object.assign(d, { positions, indices, colors: colours });
    VertexData.ComputeNormals(positions, indices, normals);
    d.normals = normals.map((n, i) => i % 3 === 1 ? Math.abs(n) : n);
    d.applyToMesh(m);
    return add(m, surface, kind, mat);
  };

  // 1. Existing moss, algae, split wood and ropes across deck tiles
  for (const surface of ['main', 'c2', 'c3']) {
    const tiles = terrain.surfaces.find(s => s.id === surface)?.tiles ?? [];
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]!;
      const x = (t.cell.col + .5) * 1.5, z = (t.cell.row + .5) * 1.5, lx = x - S.origin.x, lz = z - S.origin.z;
      if (t.kind === 'stair' || (surface === 'main' && wreckCabinAt(t.cell, 'main'))) continue;
      const edgeDistance = wreckBeamAt(lx) - Math.abs(lz), rail = edgeDistance < 2.2;
      if ((rail && i % 2 === 0) || i % 17 === 0) {
        const side = lz < 0 ? -1 : 1, p = new Vector3(x, (surface === 'main' ? 0 : 3) + wreckListHeight(z), z + side * .43);
        patch(p, .62 + (i % 4) * .18, .24 + (i % 3) * .07, surface, 'deck-algae', moss, i);
        if (i % 2 === 0) {
          const plank = MeshBuilder.CreateBox('wreck-dressing:raised-splinter', { width: .58 + (i % 4) * .16, height: .038, depth: .075 }, scene);
          plank.position.copyFrom(p).addInPlace(new Vector3(.08, .055, -side * .04));
          plank.rotation.y = .17 + Math.sin(i) * .32;
          plank.rotation.z = .07 * Math.sin(i);
          worldSurfaceUV(plank, 4.5);
          add(plank, surface, 'broken-deck-plank', rot);
        }
        if (rail && i % 7 === 0) {
          for (let k = 0; k < 4; k++) {
            const split = MeshBuilder.CreateTube('wreck-dressing:rotted-end-grain', {
              path: [p.add(new Vector3(-.32, k * .006, -.07 + k * .037)), p.add(new Vector3(.02, k * .006, .02 + k * .025)), p.add(new Vector3(.24 + .035 * k, k * .006, .01 + k * .027))],
              radius: .006, tessellation: 4
            }, scene);
            add(split, surface, 'weather-splits', leather);
          }
          const end = MeshBuilder.CreateCylinder('wreck-dressing:corroded-fastener', { height: .025, diameter: .047, tessellation: 6 }, scene);
          end.position.copyFrom(p).addInPlace(new Vector3(.22, .037, .055));
          add(end, surface, 'corroded-deck-iron', leather);
        }
      }
      if (rail && i % 29 === 0) {
        const p = new Vector3(x, (surface === 'main' ? 0 : 3) + wreckListHeight(z) + .03, z + (lz < 0 ? -.37 : .37));
        const path = Array.from({ length: 29 }, (_, n) => p.add(new Vector3(Math.cos(n * .44) * (.14 + n * .003), .006 * n / 29, Math.sin(n * .44) * (.14 + n * .003))));
        add(MeshBuilder.CreateTube('wreck-dressing:frayed-coil', { path, radius: .015, tessellation: 5 }, scene), surface, 'rope-coil', rope);
      }
    }
  }

  // 2. Canonical prey remains & boots
  const c = new Vector3(41.25, 0, 27.75);
  for (let i = 0; i < 3; i++) {
    const p = c.add(new Vector3((i - 1) * .48, wreckListHeight(c.z) + .045, (i % 2) * .30));
    const sole = MeshBuilder.CreateBox('wreck-dressing:boot-sole', { width: .31, height: .035, depth: .12 }, scene);
    sole.position.copyFrom(p);
    sole.rotation.y = i * .67;
    add(sole, 'main', 'canonical-boot', leather);
    const upper = MeshBuilder.CreateIcoSphere('wreck-dressing:boot-upper', { radius: 1, subdivisions: 1 }, scene);
    upper.scaling.set(.14, .075, .055);
    upper.position.copyFrom(p).addInPlace(new Vector3(-.025, .06, 0));
    add(upper, 'main', 'canonical-boot', leather);
    patch(p.add(new Vector3(.14, -.035, -.21)), .28, .095, 'main', 'canonical-blood', blood, i);
  }
  for (let i = 0; i < 9; i++) {
    const p = c.add(new Vector3(-.9 + (i % 3) * .45, wreckListHeight(c.z) + .045, .55 + Math.floor(i / 3) * .18));
    const path = [p, p.add(new Vector3(.20 + Math.sin(i) * .06, .018, .11))];
    add(MeshBuilder.CreateTube('wreck-dressing:prey-bone', { path, radius: .021, tessellation: 6, cap: Mesh.CAP_ALL }, scene), 'main', 'canonical-prey-remains', bone);
    for (const end of path) {
      const joint = MeshBuilder.CreateIcoSphere('wreck-dressing:prey-joint', { radius: .035, subdivisions: 1 }, scene);
      joint.position.copyFrom(end);
      add(joint, 'main', 'canonical-prey-remains', bone);
    }
  }

  // =========================================================================
  // 3. ROTTED DECK HOLES REVEALING LOWER DECK / HOLD (C8) BELOW
  // =========================================================================
  // Hole 1: Midship-starboard on C1 (col 24-25, row 14) showing down to flooded lower hold
  const holeCenter = new Vector3(37.5, wreckListHeight(21.0), 21.0);
  const voidHole = MeshBuilder.CreateGround('wreck-dressing:deck-hole-void', { width: 1.85, height: 1.35 }, scene);
  voidHole.position.set(holeCenter.x, holeCenter.y - 0.02, holeCenter.z);
  add(voidHole, 'main', 'deck-hole-opening', voidMat);

  // Lower hold water surface visible down through the hole (depth approx -3.2m)
  const holdWater = MeshBuilder.CreateGround('wreck-dressing:hole-flooded-hold', { width: 2.1, height: 1.6 }, scene);
  holdWater.position.set(holeCenter.x, -3.15, holeCenter.z);
  const holdWaterMat = paint('hold-flooded-water', '#0d2b33', 0.2);
  add(holdWater, 'main', 'deck-hole-water', holdWaterMat);

  // Exposed structural oak deck beams crossing the hole
  for (let b = -1; b <= 1; b++) {
    const beam = MeshBuilder.CreateBox(`wreck-dressing:hole-joist:${b}`, { width: 0.16, height: 0.24, depth: 1.6 }, scene);
    beam.position.set(holeCenter.x + b * 0.65, holeCenter.y - 0.12, holeCenter.z);
    worldSurfaceUV(beam, 4.5);
    add(beam, 'main', 'deck-hole-framing', rot);
  }

  // Splintered jagged plank ends curling down around the perimeter
  for (let s = 0; s < 14; s++) {
    const angle = (s / 14) * Math.PI * 2;
    const px = holeCenter.x + Math.cos(angle) * (0.85 + (s % 3) * 0.08);
    const pz = holeCenter.z + Math.sin(angle) * (0.60 + (s % 2) * 0.07);
    const splinter = MeshBuilder.CreateBox(`wreck-dressing:hole-splinter:${s}`, { width: 0.28, height: 0.045, depth: 0.085 }, scene);
    splinter.position.set(px, holeCenter.y - 0.04 - (s % 3) * 0.03, pz);
    splinter.rotation.y = angle + 1.57;
    splinter.rotation.z = Math.sin(angle) * 0.28;
    splinter.rotation.x = Math.cos(angle) * 0.22;
    worldSurfaceUV(splinter, 4.5);
    add(splinter, 'main', 'deck-hole-splinters', rot);
  }

  // Hole 2: Fore-transition area on C1 (col 30, row 11)
  const hole2Center = new Vector3(46.2, wreckListHeight(17.2), 17.2);
  const voidHole2 = MeshBuilder.CreateGround('wreck-dressing:deck-hole-void2', { width: 1.3, height: 0.95 }, scene);
  voidHole2.position.set(hole2Center.x, hole2Center.y - 0.02, hole2Center.z);
  add(voidHole2, 'main', 'deck-hole-opening', voidMat);
  for (let s = 0; s < 8; s++) {
    const angle = (s / 8) * Math.PI * 2;
    const px = hole2Center.x + Math.cos(angle) * 0.55;
    const pz = hole2Center.z + Math.sin(angle) * 0.42;
    const splinter = MeshBuilder.CreateBox(`wreck-dressing:hole2-splinter:${s}`, { width: 0.22, height: 0.04, depth: 0.07 }, scene);
    splinter.position.set(px, hole2Center.y - 0.03, pz);
    splinter.rotation.y = angle;
    splinter.rotation.z = Math.sin(angle) * 0.25;
    worldSurfaceUV(splinter, 4.5);
    add(splinter, 'main', 'deck-hole-splinters', rot);
  }

  // =========================================================================
  // 4. OVERTURNED, BROKEN & SPLIT BARRELS WITH RUSTED HOOPS
  // =========================================================================
  const barrelPositions = [
    { p: new Vector3(43.5, wreckListHeight(23.2), 23.2), rot: 0.2, type: 'upright-rotted', surf: 'main' },
    { p: new Vector3(38.8, wreckListHeight(16.5), 16.5), rot: 1.4, type: 'toppled-split', surf: 'main' },
    { p: new Vector3(45.2, wreckListHeight(22.8), 22.8), rot: -0.6, type: 'shattered', surf: 'main' },
    { p: new Vector3(50.8, 3 + wreckListHeight(18.5), 18.5), rot: 0.8, type: 'toppled-split', surf: 'c2' },
    { p: new Vector3(32.2, 3 + wreckListHeight(21.8), 21.8), rot: 0.1, type: 'upright-rotted', surf: 'c3' },
    { p: new Vector3(34.8, wreckListHeight(17.0), 17.0), rot: 2.1, type: 'shattered', surf: 'main' }
  ];

  barrelPositions.forEach((b, idx) => {
    if (b.type === 'upright-rotted') {
      // Half-decayed upright barrel
      for (let s = 0; s < 10; s++) {
        if (s % 3 === 1) continue; // missing rotted staves
        const a = (s / 10) * Math.PI * 2;
        const stave = MeshBuilder.CreateBox(`wreck-dressing:barrel-stave:${idx}:${s}`, { width: 0.14, height: 0.78 - (s % 2) * 0.18, depth: 0.035 }, scene);
        stave.position.set(b.p.x + Math.cos(a) * 0.36, b.p.y + 0.39, b.p.z + Math.sin(a) * 0.36);
        stave.rotation.y = -a + 1.57;
        worldSurfaceUV(stave, 4.5);
        add(stave, b.surf, 'decayed-barrel', rot);
      }
      // Rusted iron hoops
      for (const h of [0.15, 0.65]) {
        const hoop = MeshBuilder.CreateTorus(`wreck-dressing:barrel-hoop:${idx}:${h}`, { diameter: 0.74, thickness: 0.022, tessellation: 12 }, scene);
        hoop.position.set(b.p.x, b.p.y + h, b.p.z);
        add(hoop, b.surf, 'corroded-barrel-iron', iron);
      }
    } else if (b.type === 'toppled-split') {
      // Overturned barrel resting on deck, split open with spilled rot
      for (let s = 0; s < 10; s++) {
        const a = (s / 10) * Math.PI * 2;
        if (s > 6) continue; // top open
        const stave = MeshBuilder.CreateBox(`wreck-dressing:toppled-stave:${idx}:${s}`, { width: 0.13, height: 0.82, depth: 0.032 }, scene);
        stave.position.set(b.p.x + Math.sin(a) * 0.35, b.p.y + 0.25 + Math.cos(a) * 0.28, b.p.z);
        stave.rotation.x = 1.57;
        stave.rotation.z = a;
        worldSurfaceUV(stave, 4.5);
        add(stave, b.surf, 'decayed-barrel', rot);
      }
      const hoop = MeshBuilder.CreateTorus(`wreck-dressing:toppled-hoop:${idx}`, { diameter: 0.72, thickness: 0.02, tessellation: 12 }, scene);
      hoop.position.set(b.p.x, b.p.y + 0.24, b.p.z + 0.3);
      hoop.rotation.x = 1.57;
      add(hoop, b.surf, 'corroded-barrel-iron', iron);
    } else {
      // Shattered barrel: loose curved staves and broken hoop flat on deck
      for (let s = 0; s < 5; s++) {
        const stave = MeshBuilder.CreateBox(`wreck-dressing:shattered-stave:${idx}:${s}`, { width: 0.12, height: 0.03, depth: 0.75 }, scene);
        stave.position.set(b.p.x + (s - 2) * 0.14, b.p.y + 0.03, b.p.z + (s % 2) * 0.08);
        stave.rotation.y = b.rot + s * 0.22;
        stave.rotation.z = (s % 2 === 0 ? 0.08 : -0.06);
        worldSurfaceUV(stave, 4.5);
        add(stave, b.surf, 'decayed-barrel', rot);
      }
      const hoopPiece = MeshBuilder.CreateTube(`wreck-dressing:broken-hoop:${idx}`, {
        path: [b.p.add(new Vector3(-0.35, 0.02, -0.2)), b.p.add(new Vector3(0, 0.04, 0.28)), b.p.add(new Vector3(0.38, 0.02, -0.15))],
        radius: 0.012, tessellation: 5
      }, scene);
      add(hoopPiece, b.surf, 'corroded-barrel-iron', iron);
    }
  });

  // =========================================================================
  // 5. SMASHED CARGO CRATES WITH SPLINTERED PLANKS
  // =========================================================================
  const cratePositions = [
    { p: new Vector3(40.2, wreckListHeight(22.6), 22.6), s: 0.85, surf: 'main' },
    { p: new Vector3(48.5, wreckListHeight(21.2), 21.2), s: 0.75, surf: 'main' },
    { p: new Vector3(33.0, wreckListHeight(18.2), 18.2), s: 0.90, surf: 'main' },
    { p: new Vector3(52.2, 3 + wreckListHeight(19.2), 19.2), s: 0.70, surf: 'c2' }
  ];

  cratePositions.forEach((cr, idx) => {
    // 4 vertical corner posts
    const half = cr.s * 0.5;
    for (const cx of [-half, half]) for (const cz of [-half, half]) {
      const post = MeshBuilder.CreateBox(`wreck-dressing:crate-post:${idx}:${cx}:${cz}`, { width: 0.08, height: cr.s, depth: 0.08 }, scene);
      post.position.set(cr.p.x + cx, cr.p.y + half, cr.p.z + cz);
      worldSurfaceUV(post, 4.5);
      add(post, cr.surf, 'smashed-crate', rot);
    }
    // Splintered slats across sides (some missing or broken outward)
    for (let side = 0; side < 4; side++) {
      if (side === idx % 4) continue; // broken gaping hole on one side
      for (let sl = 0; sl < 3; sl++) {
        const slat = MeshBuilder.CreateBox(`wreck-dressing:crate-slat:${idx}:${side}:${sl}`, { width: cr.s * 0.92, height: 0.14, depth: 0.028 }, scene);
        const y = cr.p.y + 0.12 + sl * (cr.s * 0.32);
        if (side === 0) slat.position.set(cr.p.x, y, cr.p.z + half);
        else if (side === 1) slat.position.set(cr.p.x, y, cr.p.z - half);
        else if (side === 2) { slat.position.set(cr.p.x + half, y, cr.p.z); slat.rotation.y = 1.57; }
        else { slat.position.set(cr.p.x - half, y, cr.p.z); slat.rotation.y = 1.57; }
        slat.rotation.z = (sl % 2 === 0 ? 0.05 : -0.04);
        worldSurfaceUV(slat, 4.5);
        add(slat, cr.surf, 'smashed-crate', rot);
      }
    }
    // Broken loose crate lid leaning against the side
    const lid = MeshBuilder.CreateBox(`wreck-dressing:crate-lid:${idx}`, { width: cr.s * 0.95, height: 0.035, depth: cr.s * 0.7 }, scene);
    lid.position.set(cr.p.x + half + 0.18, cr.p.y + 0.28, cr.p.z);
    lid.rotation.z = -0.65;
    lid.rotation.y = 0.22;
    worldSurfaceUV(lid, 4.5);
    add(lid, cr.surf, 'smashed-crate', rot);
  });

  // =========================================================================
  // 6. MARINE FAUNA: SHORE CRABS & SEA SHELLS
  // =========================================================================
  // Shore crabs scuttling on wet deck planks
  const crabLocs = [
    new Vector3(36.8, wreckListHeight(22.2) + 0.02, 22.2),
    new Vector3(44.2, wreckListHeight(23.6) + 0.02, 23.6),
    new Vector3(39.5, wreckListHeight(15.8) + 0.02, 15.8),
    new Vector3(47.8, wreckListHeight(16.5) + 0.02, 16.5),
    new Vector3(31.5, 3 + wreckListHeight(22.4) + 0.02, 22.4)
  ];
  crabLocs.forEach((pos, idx) => {
    // Carapace
    const shell = MeshBuilder.CreateIcoSphere(`wreck-dressing:crab-shell:${idx}`, { radius: 0.075, subdivisions: 1 }, scene);
    shell.scaling.set(1.2, 0.42, 0.95);
    shell.position.copyFrom(pos).addInPlace(new Vector3(0, 0.032, 0));
    add(shell, 'main', 'marine-fauna', crabMat);
    // Pincers / Claws
    for (const side of [-1, 1]) {
      const claw = MeshBuilder.CreateBox(`wreck-dressing:crab-claw:${idx}:${side}`, { width: 0.055, height: 0.024, depth: 0.035 }, scene);
      claw.position.set(pos.x + 0.09, pos.y + 0.028, pos.z + side * 0.075);
      claw.rotation.y = side * 0.45;
      add(claw, 'main', 'marine-fauna', crabMat);
      // 3 legs on each side
      for (let leg = 0; leg < 3; leg++) {
        const legTube = MeshBuilder.CreateTube(`wreck-dressing:crab-leg:${idx}:${side}:${leg}`, {
          path: [pos.add(new Vector3((leg - 1) * 0.035, 0.025, side * 0.06)), pos.add(new Vector3((leg - 1) * 0.045, 0.035, side * 0.11)), pos.add(new Vector3((leg - 1) * 0.05, 0.005, side * 0.14))],
          radius: 0.007, tessellation: 4
        }, scene);
        add(legTube, 'main', 'marine-fauna', crabMat);
      }
    }
  });

  // Sea shells & limpets encrusted along deck scuppers and bulwarks
  for (let s = 0; s < 36; s++) {
    const x = 32.0 + (s % 18) * 1.35 + (s % 3) * 0.15;
    const side = s < 18 ? 1 : -1;
    const z = S.origin.z + side * (wreckBeamAt(x - S.origin.x) - 0.35 - (s % 4) * 0.08);
    const p = new Vector3(x, wreckListHeight(z) + 0.015, z);
    const shell = MeshBuilder.CreateCylinder(`wreck-dressing:deck-limpet:${s}`, { diameterTop: 0.01, diameterBottom: 0.055 + (s % 3) * 0.018, height: 0.032, tessellation: 6 }, scene);
    shell.position.copyFrom(p);
    shell.rotation.z = (s % 2 === 0 ? 0.15 : -0.12);
    shell.rotation.y = s * 0.7;
    add(shell, 'main', 'sea-shells', shellMat);
  }

  // =========================================================================
  // 7. WEATHERED 50-YEAR-OLD SAILOR SKELETONS
  // =========================================================================
  // Skeleton 1: Pinned near port bulwark (x=39.5, z=16.2)
  const skel1Pos = new Vector3(39.5, wreckListHeight(16.2) + 0.03, 16.2);
  // Skull
  const skull1 = MeshBuilder.CreateIcoSphere('wreck-dressing:sailor-skull:1', { radius: 0.105, subdivisions: 2 }, scene);
  skull1.scaling.set(0.85, 0.95, 1.15);
  skull1.position.set(skel1Pos.x - 0.65, skel1Pos.y + 0.09, skel1Pos.z);
  skull1.rotation.y = 0.55;
  skull1.rotation.z = 0.25;
  add(skull1, 'main', 'sailor-skeleton', bone);
  // Eye sockets
  for (const ey of [-0.035, 0.035]) {
    const eye = MeshBuilder.CreateBox(`wreck-dressing:skull-orbit:1:${ey}`, { width: 0.035, height: 0.035, depth: 0.035 }, scene);
    eye.position.set(skull1.position.x + 0.07, skull1.position.y + 0.015, skull1.position.z + ey);
    add(eye, 'main', 'sailor-skeleton', voidMat);
  }
  // Spine & Ribcage
  for (let r = 0; r < 6; r++) {
    const rx = skel1Pos.x - 0.45 + r * 0.12;
    for (const side of [-1, 1]) {
      const rib = MeshBuilder.CreateTube(`wreck-dressing:skeleton-rib:1:${r}:${side}`, {
        path: [new Vector3(rx, skel1Pos.y + 0.06, skel1Pos.z), new Vector3(rx, skel1Pos.y + 0.12, skel1Pos.z + side * 0.14), new Vector3(rx + 0.03, skel1Pos.y + 0.02, skel1Pos.z + side * 0.11)],
        radius: 0.011, tessellation: 5
      }, scene);
      add(rib, 'main', 'sailor-skeleton', bone);
    }
  }
  // Pelvis and limb bones
  const pelvis1 = MeshBuilder.CreateBox('wreck-dressing:skeleton-pelvis:1', { width: 0.14, height: 0.06, depth: 0.24 }, scene);
  pelvis1.position.set(skel1Pos.x + 0.32, skel1Pos.y + 0.04, skel1Pos.z);
  add(pelvis1, 'main', 'sailor-skeleton', bone);
  // Femurs & arm bones
  for (const side of [-1, 1]) {
    const femur = MeshBuilder.CreateTube(`wreck-dressing:skeleton-femur:1:${side}`, {
      path: [pelvis1.position.add(new Vector3(0, 0, side * 0.09)), pelvis1.position.add(new Vector3(0.42, -0.01, side * 0.16))],
      radius: 0.016, tessellation: 5
    }, scene);
    add(femur, 'main', 'sailor-skeleton', bone);
    const arm = MeshBuilder.CreateTube(`wreck-dressing:skeleton-arm:1:${side}`, {
      path: [new Vector3(skel1Pos.x - 0.4, skel1Pos.y + 0.07, skel1Pos.z + side * 0.12), new Vector3(skel1Pos.x - 0.15, skel1Pos.y + 0.02, skel1Pos.z + side * 0.28)],
      radius: 0.013, tessellation: 5
    }, scene);
    add(arm, 'main', 'sailor-skeleton', bone);
  }

  // Skeleton 2: Under broken companionway spar near quarterdeck (x=33.5, z=20.5)
  const skel2Pos = new Vector3(33.5, wreckListHeight(20.5) + 0.03, 20.5);
  const skull2 = MeshBuilder.CreateIcoSphere('wreck-dressing:sailor-skull:2', { radius: 0.10, subdivisions: 2 }, scene);
  skull2.position.set(skel2Pos.x, skel2Pos.y + 0.08, skel2Pos.z + 0.45);
  skull2.rotation.z = 0.45;
  add(skull2, 'main', 'sailor-skeleton', bone);
  for (let r = 0; r < 5; r++) {
    const rx = skel2Pos.x + (r - 2) * 0.11;
    const rib = MeshBuilder.CreateTube(`wreck-dressing:skeleton-rib:2:${r}`, {
      path: [new Vector3(rx, skel2Pos.y + 0.05, skel2Pos.z + 0.25), new Vector3(rx, skel2Pos.y + 0.11, skel2Pos.z + 0.12), new Vector3(rx, skel2Pos.y + 0.02, skel2Pos.z)],
      radius: 0.012, tessellation: 5
    }, scene);
    add(rib, 'main', 'sailor-skeleton', bone);
  }

  // =========================================================================
  // 8. SWAYING WOODEN PLANKS HANGING IN THE WIND (ANIMATED)
  // =========================================================================
  const swayingPlankDefs = [
    { p: new Vector3(43.8, wreckListHeight(24.5) + 0.95, 24.5), l: 1.4, w: 0.18, seed: 1.2, axis: 'z' },
    { p: new Vector3(48.8, wreckListHeight(23.2) + 0.85, 23.2), l: 1.1, w: 0.16, seed: 2.7, axis: 'z' },
    { p: new Vector3(34.2, 3 + wreckListHeight(23.6) + 0.75, 23.6), l: 1.25, w: 0.17, seed: 0.8, axis: 'z' },
    { p: new Vector3(39.2, wreckListHeight(15.2) + 0.90, 15.2), l: 1.35, w: 0.18, seed: 3.4, axis: 'z' }
  ];

  swayingPlankDefs.forEach((sp, idx) => {
    // Hanging cord/rope
    const cord = MeshBuilder.CreateTube(`wreck-dressing:plank-rope:${idx}`, {
      path: [sp.p, sp.p.add(new Vector3(0, -0.35, 0))],
      radius: 0.012, tessellation: 4
    }, scene);
    add(cord, 'main', 'swaying-plank-rope', rope);

    // Swaying plank itself
    const plank = MeshBuilder.CreateBox(`wreck-dressing:swaying-plank:${idx}`, { width: 0.045, height: sp.l, depth: sp.w }, scene);
    plank.position.set(sp.p.x, sp.p.y - 0.35 - sp.l * 0.5, sp.p.z);
    worldSurfaceUV(plank, 4.5);
    addSolo(plank, 'main', 'swaying-plank', rot);

    scene.onBeforeRenderObservable.add(() => {
      if (!plank.isEnabled() || !plank.isVisible) return;
      const t = performance.now() / 1000;
      const sway = Math.sin(t * 1.6 + sp.seed) * 0.13;
      const swayRoll = Math.cos(t * 1.1 + sp.seed * 1.5) * 0.05;
      plank.rotation.z = sway;
      plank.rotation.x = swayRoll;
    });
  });

  // =========================================================================
  // 9. PERCHING SEAGULLS ON RAILINGS (ANIMATED IDLE GLANCE)
  // =========================================================================
  const seagullPositions = [
    { p: new Vector3(54.2, 3 + wreckListHeight(19.2) + 1.15, 19.2), yaw: 0.4, seed: 1.1, surf: 'c2' },
    { p: new Vector3(46.2, wreckListHeight(24.2) + 1.12, 24.2), yaw: -1.2, seed: 2.5, surf: 'main' },
    { p: new Vector3(28.2, 3 + wreckListHeight(20.8) + 1.14, 20.8), yaw: 2.1, seed: 4.2, surf: 'c3' },
    { p: new Vector3(41.2, wreckListHeight(15.2) + 1.12, 15.2), yaw: 1.7, seed: 3.1, surf: 'main' }
  ];

  seagullPositions.forEach((gull, idx) => {
    // Body (streamlined oval)
    const body = MeshBuilder.CreateIcoSphere(`wreck-dressing:gull-body:${idx}`, { radius: 0.12, subdivisions: 2 }, scene);
    body.scaling.set(0.7, 0.8, 1.4);
    body.position.copyFrom(gull.p).addInPlace(new Vector3(0, 0.12, 0));
    body.rotation.y = gull.yaw;
    addSolo(body, gull.surf, 'seagull', gullBody);

    // Folded wings
    for (const side of [-1, 1]) {
      const wing = MeshBuilder.CreateBox(`wreck-dressing:gull-wing:${idx}:${side}`, { width: 0.04, height: 0.10, depth: 0.28 }, scene);
      wing.position.set(body.position.x + Math.sin(gull.yaw + 1.57) * side * 0.08, body.position.y + 0.02, body.position.z + Math.cos(gull.yaw + 1.57) * side * 0.08);
      wing.rotation.y = gull.yaw + side * 0.08;
      wing.rotation.x = 0.25;
      addSolo(wing, gull.surf, 'seagull', gullWing);
    }

    // Head and beak
    const head = MeshBuilder.CreateIcoSphere(`wreck-dressing:gull-head:${idx}`, { radius: 0.065, subdivisions: 2 }, scene);
    head.position.set(body.position.x + Math.sin(gull.yaw) * 0.16, body.position.y + 0.09, body.position.z + Math.cos(gull.yaw) * 0.16);
    addSolo(head, gull.surf, 'seagull', gullBody);

    const beak = MeshBuilder.CreateCylinder(`wreck-dressing:gull-beak:${idx}`, { diameterTop: 0.002, diameterBottom: 0.035, height: 0.09, tessellation: 6 }, scene);
    beak.position.set(head.position.x + Math.sin(gull.yaw) * 0.07, head.position.y, head.position.z + Math.cos(gull.yaw) * 0.07);
    beak.rotation.x = 1.57;
    beak.rotation.y = gull.yaw;
    addSolo(beak, gull.surf, 'seagull', gullBeak);

    // Idle animation: periodic head twitch / glance around
    scene.onBeforeRenderObservable.add(() => {
      if (!body.isEnabled() || !body.isVisible) return;
      const t = performance.now() / 1000;
      const cycle = Math.sin(t * 0.8 + gull.seed);
      const twitch = cycle > 0.65 ? Math.sin(t * 5.0) * 0.35 : 0;
      head.rotation.y = gull.yaw + twitch;
      beak.rotation.y = gull.yaw + twitch;
      body.position.y = gull.p.y + 0.12 + Math.sin(t * 2.2 + gull.seed) * 0.005;
    });
  });

  // =========================================================================
  // 10. INOPERABLE / COLLAPSED COMPANIONWAY SECONDARY STAIR SECTION
  // =========================================================================
  // A secondary damaged stair flight with collapsed displaced treads
  const stairPos = new Vector3(34.2, wreckListHeight(17.8), 17.8);
  for (let step = 0; step < 4; step++) {
    const tread = MeshBuilder.CreateBox(`wreck-dressing:broken-step:${step}`, { width: 0.38, height: 0.07, depth: 1.1 }, scene);
    tread.position.set(stairPos.x + step * 0.32, stairPos.y + step * 0.28 - (step === 2 ? 0.18 : 0), stairPos.z);
    tread.rotation.z = (step === 2 ? 0.38 : step === 1 ? -0.18 : 0.05);
    tread.rotation.y = 0.12 * step;
    worldSurfaceUV(tread, 4.5);
    add(tread, 'main', 'broken-stairs', rot);
  }
  // Blocking splintered crossbeam showing collapsed stair
  const beamBlock = MeshBuilder.CreateBox('wreck-dressing:stair-block-beam', { width: 0.14, height: 0.14, depth: 1.35 }, scene);
  beamBlock.position.set(stairPos.x + 0.65, stairPos.y + 0.85, stairPos.z);
  beamBlock.rotation.x = 0.18;
  beamBlock.rotation.z = -0.32;
  worldSurfaceUV(beamBlock, 4.5);
  add(beamBlock, 'main', 'broken-stairs', rot);

  // =========================================================================
  // 11. BATCH STATIC MESHES & RETURN
  // =========================================================================
  const batched = [...groups].flatMap(([key, parts]) => {
    const meta = { ...parts[0]!.metadata };
    const m = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!m) return [];
    m.name = `wreck-dressing:batch:${key}`;
    m.metadata = meta;
    m.isPickable = false;
    m.receiveShadows = true;
    return [m];
  });

  return [...batched, ...animatedMeshes];
}

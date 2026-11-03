import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S } from '../shared/wreck-structure.js';
import { weatheredBoneMaterial } from './wreck-bone-material.js';

/** Anatomical remains of Clyssavar, the ancient Gold Dragon (Dragón de Oro).
 * Modeled in strict accordance with the adventure lore (Capítulo 3, pp. 22–27):
 * - The shipwreck is impaled and held above water on dragon bones ("sostenido en los huesos antiguos que rompieron el casco").
 * - Long natural reef of jagged rocks and dragon bones emerging from the waves ("espigón de rocas puntiagudas y huesos de dragón").
 * - Bow rigging and torn sails drape down towards dragon bones in the water (C2).
 * - Authentic Gold Dragon cranial anatomy: long swept backward horns, crown crest, regal rostrum,
 *   deep eye orbits with hollow cavities, predatory fangs, mandibular chin-spurs, and titanic rib arches.
 * - Fits within authored obstacle footprints with clean mathematical curves without box-clamping. */
export function buildDragonRemains(scene: Scene, terrain: TerrainDefinition) {
  const groups = new Map<StandardMaterial, Mesh[]>();
  const mat = (id: string, c: string) => {
    const m = new StandardMaterial(`dragon-remains:${id}`, scene);
    m.diffuseColor = Color3.FromHexString(c);
    m.specularColor = Color3.FromHexString('#182120');
    m.backFaceCulling = false;
    return m;
  };

  // Clyssavar was an ancient Gold Dragon (Dragón de Oro).
  // Bones bear warm fossilised-gold tones, deep sea-moss cracks, and dark hollow cavities.
  const ivory = weatheredBoneMaterial(scene, 'dragon-remains:eroded-ivory', '#c8a85e');  // dorado cálido mineral
  const worn  = weatheredBoneMaterial(scene, 'dragon-remains:salt-cracks',   '#7a6b3e');  // oro envejecido/oscurecido
  const socket = mat('cavities', '#1c221e');

  const add = (m: Mesh, material = ivory) => {
    m.material = material;
    m.receiveShadows = true;
    m.isPickable = false;
    const g = groups.get(material) ?? [];
    g.push(m);
    groups.set(material, g);
    return m;
  };

  const tube = (id: string, path: Vector3[], radius: number | ((i: number) => number), material = ivory, tess = 8) => {
    const rf = typeof radius === 'function' ? radius : (i: number) => radius * (0.85 + 0.25 * Math.sin(i / Math.max(1, path.length - 1) * Math.PI));
    return add(MeshBuilder.CreateTube(`dragon-remains:${id}`, {
      path,
      radiusFunction: rf,
      tessellation: tess,
      cap: Mesh.CAP_ALL
    }, scene), material);
  };

  const cone = (id: string, a: Vector3, b: Vector3, r: number, material = ivory) => {
    const v = b.subtract(a);
    const m = MeshBuilder.CreateCylinder(`dragon-remains:${id}`, {
      height: v.length(),
      diameterBottom: r * 2,
      diameterTop: 0.015,
      tessellation: 8
    }, scene);
    m.position.copyFrom(a.add(b).scale(0.5));
    m.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), v.normalize(), new Quaternion());
    return add(m, material);
  };

  const ellipsoid = (id: string, p: Vector3, x: number, y: number, z: number, material = ivory) => {
    const m = MeshBuilder.CreateIcoSphere(`dragon-remains:${id}`, { radius: 1, subdivisions: 2 }, scene);
    m.position.copyFrom(p);
    m.scaling.set(x, y, z);
    return add(m, material);
  };

  const cellsFor = (id: string) => (terrain.obstacles ?? []).filter(o => o.surfaceId === 'sea' && o.obstacleId === id).map(o => o.cell);

  // 1. ANCIENT GOLD DRAGON SKULL (Clyssavar) at reef-south-west
  // Footprint: Cols 14..16 (width 4.5m), Rows 28..29 (depth 3.0m)
  const skullCells = cellsFor('reef-south-west');
  if (skullCells.length) {
    const cX = (Math.min(...skullCells.map(c => c.col)) + Math.max(...skullCells.map(c => c.col)) + 1) * 0.75;
    const cZ = (Math.min(...skullCells.map(c => c.row)) + Math.max(...skullCells.map(c => c.row)) + 1) * 0.75;
    // Keep the complete jaw above the mean waterline. The previous root at
    // +.35 put its lower half under water, hiding the unfinished articulation.
    const baseH = S.seaHeight + 0.80;

    // Preserve Antigravity's elongated head, paired swept horns and crest.
    // The old 1.35 multiplier affected only the vault, not the eyes/jaw/horns:
    // the nose escaped its blocked footprint and the sockets sat inside it.
    const skullScale = 1;

    // A. Main Cranial Vault & Nasal Bridge (parametric lofted bone plates)
    // Snout points East (+X), swept horns curve West (-X).
    // All parts share one profile scale. Horn tips stay inside the existing
    // 4.5 × 3 m obstacle; no navigation/collider changes or vertex box-clamping.
    const authoredProfiles: Array<{ dx: number; y: number; wZ: number; archH: number }> = [
      { dx: -1.35*skullScale, y: baseH + 0.42*skullScale, wZ: 0.35*skullScale, archH: 0.30*skullScale },
      { dx: -0.95*skullScale, y: baseH + 0.70*skullScale, wZ: 0.68*skullScale, archH: 0.56*skullScale },
      { dx: -0.50*skullScale, y: baseH + 0.95*skullScale, wZ: 0.82*skullScale, archH: 0.72*skullScale },
      { dx:  0.05*skullScale, y: baseH + 0.80*skullScale, wZ: 0.72*skullScale, archH: 0.58*skullScale },
      { dx:  0.65*skullScale, y: baseH + 0.52*skullScale, wZ: 0.50*skullScale, archH: 0.42*skullScale },
      { dx:  1.25*skullScale, y: baseH + 0.30*skullScale, wZ: 0.36*skullScale, archH: 0.30*skullScale },
      { dx:  1.85*skullScale, y: baseH + 0.12*skullScale, wZ: 0.22*skullScale, archH: 0.20*skullScale }
    ];

    // Smooth the authored anatomical stations, preserving their endpoints.
    // The unfinished seven-section shell read as a triangular roof rather
    // than a rounded cranial vault from low tactical cameras.
    const cranialProfiles: typeof authoredProfiles = [];
    const cubic=(a:number,b:number,c:number,d:number,t:number)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    for(let i=0;i<authoredProfiles.length-1;i++)for(let step=0;step<4;step++){
      const a=authoredProfiles[Math.max(0,i-1)]!,b=authoredProfiles[i]!,c=authoredProfiles[i+1]!,d=authoredProfiles[Math.min(authoredProfiles.length-1,i+2)]!;
      const value=(key:keyof typeof b)=>cubic(a[key],b[key],c[key],d[key],step/4);
      cranialProfiles.push({dx:value('dx'),y:value('y'),wZ:Math.max(.1,value('wZ')),archH:Math.max(.1,value('archH'))});
    }
    cranialProfiles.push(authoredProfiles.at(-1)!);

    // A socket is an inset bowl, not the dark convex sphere protruding from
    // the old head. Bone brows frame its open front; depth stays inside it.
    const hollowSocket=(id:string,center:Vector3,side:number,rx:number,ry:number,depth:number)=>{
      const positions:number[]=[],indices:number[]=[],segments=16,rings=3;
      for(let ring=0;ring<rings;ring++)for(let j=0;j<segments;j++){
        const f=ring/rings,a=j/segments*Math.PI*2,scale=1-f;
        positions.push(center.x+Math.cos(a)*rx*scale,center.y+Math.sin(a)*ry*scale,center.z+side*(.09-f*depth));
      }
      const triangle=(a:number,b:number,c:number)=>indices.push(...(side>0?[a,c,b]:[a,b,c]));
      for(let ring=0;ring<rings-1;ring++)for(let j=0;j<segments;j++){
        const a=ring*segments+j,b=(ring+1)*segments+j,c=ring*segments+(j+1)%segments,d=(ring+1)*segments+(j+1)%segments;
        triangle(a,b,c);triangle(c,b,d);
      }
      const end=positions.length/3;positions.push(center.x,center.y,center.z+side*(.09-depth));
      for(let j=0;j<segments;j++)triangle((rings-1)*segments+j,end,(rings-1)*segments+(j+1)%segments);
      const mesh=new Mesh('dragon-remains:'+id,scene),data=new VertexData(),normals:number[]=[];
      VertexData.ComputeNormals(positions,indices,normals);data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(mesh);add(mesh,socket);
    };

    const pos: number[] = [];
    const ind: number[] = [];
    const uvs: number[] = [];
    const segs = 16;

    for (let i = 0; i < cranialProfiles.length; i++) {
      const p = cranialProfiles[i]!;
      for (let j = 0; j <= segs; j++) {
        const u = j / segs;
        const ang = (u - 0.5) * Math.PI; // -PI/2 to +PI/2
        const vx = cX + p.dx;
        const vy = p.y + Math.cos(ang) * p.archH;
        const vz = cZ + Math.sin(ang) * p.wZ;
        pos.push(vx, vy, vz);
        uvs.push((p.dx + 2.25) / 4.5, (vz - cZ + 1.5) / 3.0);
      }
    }

    const rowStride = segs + 1;
    for (let i = 0; i < cranialProfiles.length - 1; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * rowStride + j;
        const b = a + 1;
        const c = (i + 1) * rowStride + j;
        const d = c + 1;
        ind.push(a, c, b, b, c, d);
      }
    }

    const skullVault = new Mesh('dragon-remains:cranial-vault', scene);
    const vaultData = new VertexData();
    vaultData.positions = pos;
    vaultData.indices = ind;
    vaultData.uvs = uvs;
    const normals: number[] = [];
    VertexData.ComputeNormals(pos, ind, normals);
    vaultData.normals = normals;
    vaultData.applyToMesh(skullVault);
    add(skullVault, ivory);

    // B. Sagittal Crest & Dorsal Spines (runs along skull roof midline)
    const crestPath = [
      new Vector3(cX - 1.45, baseH + 0.42, cZ),
      new Vector3(cX - 1.05, baseH + 0.82, cZ),
      new Vector3(cX - 0.55, baseH + 1.12, cZ),
      new Vector3(cX + 0.00, baseH + 0.95, cZ),
      new Vector3(cX + 0.60, baseH + 0.65, cZ),
      new Vector3(cX + 1.20, baseH + 0.38, cZ),
      new Vector3(cX + 1.85, baseH + 0.18, cZ)
    ];
    tube('sagittal-crest', crestPath, (i) => 0.05 + 0.045 * Math.sin(i / 6 * Math.PI), ivory, 6);

    for (let s = 1; s <= 4; s++) {
      const cp = crestPath[s]!;
      cone(`dorsal-spine:${s}`, cp, cp.add(new Vector3(-0.08, 0.28 + s * 0.04, 0)), 0.065, worn);
    }

    // C. Deep Eye Sockets (Cavities) & Supraorbital Brow Arches
    for (const side of [-1, 1]) {
      const eyeCenter = new Vector3(cX - 0.28, baseH + 0.76, cZ + side * 0.78);
      // Dark internal eye cavity
      hollowSocket(`orbital-cavity:${side}`,eyeCenter,side,.27,.18,.24);

      // Prominent bony orbital brow ridge circling the eye
      const orbitPath = Array.from({ length: 16 }, (_, k) => {
        const a = (k / 15) * Math.PI * 2;
        return eyeCenter.add(new Vector3(Math.cos(a) * 0.32, Math.sin(a) * 0.25 + 0.03, side * (Math.sin(a) * 0.05 + 0.07)));
      });
      tube(`orbital-brow:${side}`, orbitPath, i=>.055+Math.max(0,Math.sin(i/15*Math.PI*2))*.045, ivory, 8);

      // Supraorbital spines — bony protrusions above the eye socket (more terrifying)
      cone(`supraorbital-spine:${side}`, eyeCenter.add(new Vector3(-0.10, 0.22, side*0.04)), eyeCenter.add(new Vector3(-0.18, 0.52, side*0.06)), 0.06, worn);
      cone(`supraorbital-spine2:${side}`, eyeCenter.add(new Vector3( 0.12, 0.20, side*0.04)), eyeCenter.add(new Vector3( 0.16, 0.46, side*0.06)), 0.05, worn);

      // Temporal fenestra cavity (behind eye socket, lateral opening)
      hollowSocket(`temporal-fenestra:${side}`,new Vector3(cX-.88,baseH+.58,cZ+side*.68),side,.25,.17,.18);

      // Zygomatic / cheekbone arch framing the temporal opening
      tube(`zygomatic-arch:${side}`, [
        new Vector3(cX - 1.20, baseH + 0.52, cZ + side * 0.42),
        new Vector3(cX - 0.75, baseH + 0.40, cZ + side * 0.75),
        new Vector3(cX - 0.05, baseH + 0.48, cZ + side * 0.68),
        new Vector3(cX + 0.55, baseH + 0.30, cZ + side * 0.45)
      ], 0.085, ivory, 7);

      // Continuous maxilla connects the cheek to the nasal bone. It frames
      // the open mouth instead of leaving teeth floating under the vault.
      tube(`maxillary-bar:${side}`, [
        new Vector3(cX - 0.35, baseH + 0.48, cZ + side * 0.66),
        new Vector3(cX + 0.55, baseH + 0.28, cZ + side * 0.46),
        new Vector3(cX + 1.20, baseH + 0.16, cZ + side * 0.34),
        new Vector3(cX + 1.80, baseH + 0.08, cZ + side * 0.16)
      ], 0.075, ivory, 7);

      // D. Clyssavar's Sweeping Gold Dragon Horns (The iconic hallmark of the Gold Dragon)
      // Massive horns scaled ×1.35: wider sweep, taller arc, thicker base — truly terrifying.
      const mainHornPath: Vector3[] = [];
      const hornPts = 18; // more points → smoother massive curve
      for (let k = 0; k < hornPts; k++) {
        const t = k / (hornPts - 1);
        // Horns sweep backward in -X, outward in Z, arch higher in Y
        const hX = cX - 0.65 - t * 1.55 - Math.sin(t * Math.PI) * 0.10;
        const hY = baseH + 1.05 + Math.sin(t * Math.PI * 0.75) * 1.05 + t * 0.30; // peaks 2.1m above sea
        const hZ = cZ + side * (0.50 + t * 0.78 + Math.sin(t * Math.PI) * 0.10);
        mainHornPath.push(new Vector3(hX, hY, hZ));
      }
      // Thicker base (0.22) tapering sharply — the gold is oxidised but unmistakeable
      tube(`gold-horn-primary:${side}`, mainHornPath, (i) => 0.22 * (1 - i / (hornPts - 1) * 0.88) * (1 + 0.08 * Math.sin(i * 3.2)), ivory, 10);

      // Secondary crown horns (smaller pair curving below the primary horns)
      const secHornPath: Vector3[] = [];
      for (let k = 0; k < 12; k++) {
        const t = k / 11;
        const hX = cX - 0.85 - t * 0.90;
        const hY = baseH + 0.65 + Math.sin(t * Math.PI * 0.8) * 0.45;
        const hZ = cZ + side * (0.54 + t * 0.45);
        secHornPath.push(new Vector3(hX, hY, hZ));
      }
      tube(`gold-horn-secondary:${side}`, secHornPath, (i) => 0.10 * (1 - i / 11 * 0.85), worn, 7);

      // Bony facial barbels / mandibular horn-spurs (chin whiskers unique to Gold Dragons)
      tube(`gold-barbel-spur-upper:${side}`, [
        new Vector3(cX + 0.45, baseH + 0.16, cZ + side * 0.45),
        new Vector3(cX + 0.05, baseH - 0.02, cZ + side * 0.62),
        new Vector3(cX - 0.42, baseH - 0.18, cZ + side * 0.70)
      ], 0.06, worn, 6);

      tube(`gold-barbel-spur-lower:${side}`, [
        new Vector3(cX + 0.95, baseH + 0.06, cZ + side * 0.35),
        new Vector3(cX + 0.55, baseH - 0.12, cZ + side * 0.48),
        new Vector3(cX + 0.08, baseH - 0.26, cZ + side * 0.55)
      ], 0.045, worn, 6);

      // E. Massive Lower Jaw (Mandible) — Wide open in fossilised death roar
      const jawPath = [
        new Vector3(cX - 1.15, baseH + 0.16, cZ + side * 0.40), // jaw joint (retroarticular)
        new Vector3(cX - 0.68, baseH - 0.38, cZ + side * 0.52), // jaw angle — deeply dropped
        new Vector3(cX + 0.15, baseH - 0.52, cZ + side * 0.46), // mandibular body — gaping open
        new Vector3(cX + 1.05, baseH - 0.44, cZ + side * 0.34), // anterior mandible
        new Vector3(cX + 1.75, baseH - 0.22, cZ + side * 0.15)  // mandibular symphysis (chin)
      ];
      tube(`mandible:${side}`, jawPath, 0.10, ivory, 7);
      ellipsoid(`jaw-hinge:${side}`, new Vector3(cX - 1.15, baseH + 0.18, cZ + side * 0.40), 0.14, 0.16, 0.13, ivory);

      // Chin projection spur at symphysis
      cone(`chin-keel:${side}`, new Vector3(cX + 1.70, baseH - 0.14, cZ + side * 0.11), new Vector3(cX + 1.58, baseH - 0.40, cZ + side * 0.07), 0.075, worn);

      // F. Terrifying Predatory Teeth & Fangs
      // Upper fangs (Maxillary)
      cone(`great-fang-upper:${side}`, new Vector3(cX + 0.50, baseH + 0.26, cZ + side * 0.44), new Vector3(cX + 0.56, baseH - 0.14, cZ + side * 0.42), 0.06, ivory);
      cone(`secondary-fang-upper:${side}`, new Vector3(cX + 1.05, baseH + 0.16, cZ + side * 0.32), new Vector3(cX + 1.10, baseH - 0.12, cZ + side * 0.30), 0.05, ivory);
      for (let t = 0; t < 5; t++) {
        const tx = cX + 1.22 + t * 0.11;
        const ty = baseH + 0.13 - t * 0.024;
        const tz = cZ + side * (0.28 - t * 0.024);
        cone(`upper-tooth:${side}:${t}`, new Vector3(tx, ty, tz), new Vector3(tx + 0.02, ty - 0.15, tz), 0.035, ivory);
      }

      // Lower teeth (Dentary)
      cone(`lower-canine:${side}`, new Vector3(cX + 0.80, baseH - 0.26, cZ + side * 0.36), new Vector3(cX + 0.78, baseH + 0.04, cZ + side * 0.34), 0.05, ivory);
      for (let t = 0; t < 4; t++) {
        const tx = cX + 1.10 + t * 0.12;
        const ty = baseH - 0.23 + t * 0.024;
        const tz = cZ + side * (0.29 - t * 0.030);
        cone(`lower-tooth:${side}:${t}`, new Vector3(tx, ty, tz), new Vector3(tx - 0.01, ty + 0.13, tz), 0.032, ivory);
      }

      // Salt-weathered bone cracks & cranial suture lines
      for (let cr = 0; cr < 4; cr++) {
        const sx = cX - 0.85 + cr * 0.38;
        const sy = baseH + 0.52 - cr * 0.06;
        tube(`cranial-suture:${side}:${cr}`, [
          new Vector3(sx, sy, cZ + side * 0.30),
          new Vector3(sx + 0.08, sy - 0.14, cZ + side * 0.42),
          new Vector3(sx + 0.04, sy - 0.25, cZ + side * 0.50)
        ], 0.015, worn, 5);
      }

      // External Naris (Nostril Cavity)
      hollowSocket(`naris-socket:${side}`,new Vector3(cX+1.50,baseH+.26,cZ+side*.32),side,.12,.08,.08);
    }

    // Join the two dentaries at the chin; their old end points left an open
    // split. The jaw and its teeth are now a complete visible assembly.
    tube('mandibular-symphysis', [
      new Vector3(cX + 1.75, baseH - 0.22, cZ - 0.15),
      new Vector3(cX + 1.83, baseH - 0.20, cZ),
      new Vector3(cX + 1.75, baseH - 0.22, cZ + 0.15)
    ], 0.09, ivory, 7);
  }

  // 2. STERN VERTEBRAL COLUMN & TITANIC RIBCAGE at dragon-bone-stern
  // Footprint: Col 1 (width 1.5m), Rows 13..15 (depth 4.5m)
  const ribCells = cellsFor('dragon-bone-stern');
  if (ribCells.length) {
    const cX = (Math.min(...ribCells.map(c => c.col)) + Math.max(...ribCells.map(c => c.col)) + 1) * 0.75;
    const cZ = (Math.min(...ribCells.map(c => c.row)) + Math.max(...ribCells.map(c => c.row)) + 1) * 0.75;
    const baseH = S.seaHeight + 0.25;

    // Spine runs along Z: cZ ± 1.70 (within depth ±2.24)
    // Width in X: cX ± 0.62 (within width ±0.74)
    const spinePts = [
      new Vector3(cX, baseH + 0.10, cZ - 1.70),
      new Vector3(cX, baseH + 0.35, cZ - 0.85),
      new Vector3(cX, baseH + 0.55, cZ + 0.00),
      new Vector3(cX, baseH + 0.38, cZ + 0.85),
      new Vector3(cX, baseH + 0.12, cZ + 1.70)
    ];
    tube('stern-spinal-cord', spinePts, 0.16, worn, 8);

    // 5 Articulated Vertebrae with dorsal spinous processes & transverse processes
    for (let v = 0; v < spinePts.length; v++) {
      const p = spinePts[v]!;
      // Centrum (vertebral body)
      ellipsoid(`vertebra-centrum:${v}`, p, 0.24, 0.22, 0.30, ivory);

      // Tall dorsal spinous process rising up toward the sky
      const spineH = 0.80 + (v % 3) * 0.22;
      tube(`neural-spine:${v}`, [
        p,
        p.add(new Vector3(0, spineH * 0.6, -0.07)),
        p.add(new Vector3(0, spineH, -0.14))
      ], (i) => 0.09 * (1 - i / 2 * 0.6), worn, 6);

      // Transverse lateral processes (vertebral wings)
      for (const side of [-1, 1]) {
        cone(`transverse-process:${v}:${side}`, p, p.add(new Vector3(side * 0.28, 0.11, 0)), 0.07, worn);

        // B. Majestic Curved Rib Arches
        // Curving out to side * 0.52 from cX (max X offset is 0.52 + radius 0.10 = 0.62, comfortably inside 0.74!)
        // Rising up to 2.8m above sea level!
        const ribPts: Vector3[] = [];
        const numRibPts = 18;
        const ribMaxH = 2.40 + (v % 3) * 0.40;
        const isBroken = (v === 1 && side === 1) || (v === 3 && side === -1);
        const limitPts = isBroken ? 12 : numRibPts;

        for (let k = 0; k < limitPts; k++) {
          const t = k / (numRibPts - 1);
          // Arch outwards in X, arch high in Y, sweep along Z
          const archX = cX + side * (0.20 + Math.sin(t * Math.PI) * 0.32);
          const archY = baseH + 0.18 + Math.sin(t * Math.PI) * ribMaxH - t * 0.40;
          const archZ = p.z + t * 0.30 - 0.12;
          ribPts.push(new Vector3(archX, archY, archZ));
        }

        // Rib head articulation
        ellipsoid(`rib-head:${v}:${side}`, ribPts[0]!, 0.16, 0.14, 0.18, worn);

        tube(`rib-arch:${v}:${side}`, ribPts, (i) => {
          const t = i / (limitPts - 1);
          return (0.11 - t * 0.038) * (1 + 0.08 * Math.sin(i * 2.8));
        }, ivory, 8);

        if (isBroken) {
          // Weathered jagged fracture tip
          const endPt = ribPts.at(-1)!;
          ellipsoid(`rib-fracture:${v}:${side}`, endPt, 0.07, 0.05, 0.08, worn);
        }
      }
    }
  }

  // Final check: compute normals, bake vertex data, assign UVs and shades
  // Geometry is mathematically designed to fit within the authored obstacle cells.
  for (const parts of groups.values()) {
    for (const m of parts) {
      m.bakeCurrentTransformIntoVertices();
      const p = m.getVerticesData('position')!;
      m.setVerticesData('uv', Array.from({ length: p.length / 3 }, (_, i) => [
        (p[i * 3]! + p[i * 3 + 1]! * 0.35) * 0.9,
        (p[i * 3 + 2]! + p[i * 3 + 1]! * 0.65) * 0.9
      ]).flat());
      const n: number[] = [];
      VertexData.ComputeNormals(p, m.getIndices()!, n);
      m.setVerticesData('normal', n);
      const cols: number[] = [];
      for (let i = 0; i < p.length; i += 3) {
        // Natural color shading with warm fossilized undertones
        const shade = 0.86 + 0.10 * Math.sin(p[i]! * 6.7 + p[i + 1]! * 4.3) * Math.cos(p[i + 2]! * 5.1);
        cols.push(shade, shade * 0.98, shade * 0.92, 1);
      }
      m.setVerticesData('color', cols);
    }
  }

  return [...groups].flatMap(([material, parts]) => {
    const m = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!m) return [];
    m.name = `dragon-remains:batch:${material.name}`;
    m.metadata = { visualOnly: true, kind: 'dragon-bone-obstacle', deckSurfaceId: 'sea', anatomy: true };
    m.isPickable = false;
    m.receiveShadows = true;
    return [m];
  });
}

/** Colossal skeletal remains across the reef and cradling the shipwreck hull:
 * 1. Hull-cradling ribs & spine under the stern impact breach ("sostenido en los huesos antiguos que rompieron el casco").
 * 2. Dragon bones rising under the broken foremast/bow reef where the rigging hangs into the sea (C2).
 * 3. Dramatic distant skeletal spires along the natural reef spit. */
export function buildDistantDragonBones(scene: Scene) {
  const material = weatheredBoneMaterial(scene, 'dragon-remains:distant-ivory', '#a89f88');
  const parts: Mesh[] = [];

  // Helper for transformed point
  const atPos = (center: Vector3, yaw: number, x: number, y: number, z: number, scale = 1.55) => {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    return new Vector3(
      center.x + scale * (x * cos - z * sin),
      S.seaHeight + y * scale,
      center.z + scale * (x * sin + z * cos)
    );
  };

  // 1. Lore requirement from PDF: "sostenido en los huesos antiguos que rompieron el casco"
  // Colossal dragon ribs and spine under the stern impact breach cradling the ship's bottom timbers
  const keelCenter = new Vector3(S.origin.x - 8.5, S.seaHeight, S.origin.z - 0.5);
  const hullSpinePts = [
    keelCenter.add(new Vector3(-5.5, -0.6, -1.8)),
    keelCenter.add(new Vector3(-1.0, 0.4, -0.5)),
    keelCenter.add(new Vector3(4.5, 0.8, 1.2)),
    keelCenter.add(new Vector3(9.0, 0.3, 2.5))
  ];
  parts.push(MeshBuilder.CreateTube('dragon-remains:hull-cradle-spine', {
    path: hullSpinePts,
    radius: 0.42,
    tessellation: 10,
    cap: Mesh.CAP_ALL
  }, scene));

  // Giant ribs curving directly up into the shattered hull
  for (let r = 0; r < 6; r++) {
    const t = r / 5;
    const root = Vector3.Lerp(hullSpinePts[0]!, hullSpinePts[3]!, t);
    for (const side of [-1, 1]) {
      const ribPath: Vector3[] = [];
      for (let k = 0; k < 15; k++) {
        const u = k / 14;
        const ribY = root.y + Math.sin(u * Math.PI) * (2.8 + (r % 2) * 0.6) - u * 0.3;
        const ribOffset = root.add(new Vector3(
          (u * 0.6 - 0.3) * (r % 2 ? 1 : -1),
          ribY - root.y,
          side * (u * 3.4 + Math.sin(u * Math.PI) * 1.1)
        ));
        ribPath.push(ribOffset);
      }
      parts.push(MeshBuilder.CreateTube(`dragon-remains:hull-cradle-rib:${r}:${side}`, {
        path: ribPath,
        radiusFunction: (i) => 0.32 * (1 - i / 20),
        tessellation: 9,
        cap: Mesh.CAP_ALL
      }, scene));
    }
  }

  // 2. Lore requirement from PDF C2: "desde la que baja una maraña de jarcias y lonas andrajosas hasta las rocas y los huesos de dragón que se encuentran en el agua"
  // Foremast reef dragon bones under the bow
  const foremastCenter = new Vector3(S.origin.x + 24.5, S.seaHeight, S.origin.z - 7.5);
  const foreSpine = [
    foremastCenter.add(new Vector3(-3.2, 0.1, -1.2)),
    foremastCenter.add(new Vector3(0, 0.6, 0)),
    foremastCenter.add(new Vector3(3.4, 0.2, 1.4))
  ];
  parts.push(MeshBuilder.CreateTube('dragon-remains:foremast-spine', {
    path: foreSpine,
    radius: 0.34,
    tessellation: 9,
    cap: Mesh.CAP_ALL
  }, scene));

  for (let r = 0; r < 4; r++) {
    const p = Vector3.Lerp(foreSpine[0]!, foreSpine[2]!, r / 3);
    for (const side of [-1, 1]) {
      const path = Array.from({ length: 14 }, (_, k) => {
        const u = k / 13;
        return p.add(new Vector3(
          side * (u * 1.8 + Math.sin(u * Math.PI) * 0.6),
          0.15 + Math.sin(u * Math.PI) * (1.9 + r * 0.25) - u * 0.4,
          (u * 0.8 - 0.4)
        ));
      });
      parts.push(MeshBuilder.CreateTube(`dragon-remains:foremast-rib:${r}:${side}`, {
        path,
        radiusFunction: (i) => 0.24 * (1 - i / 24),
        tessellation: 8,
        cap: Mesh.CAP_ALL
      }, scene));
    }
  }

  // 3. Giant Distant Skeletal Spire Formations (North-West, North-East, South-East, Northern Barrier)
  const distantFormations = [
    { cx: -46, cz: -25, yaw: 0.35, ribCount: 6, ribSpan: 2.8 },
    { cx: 50, cz: 34, yaw: -0.55, ribCount: 5, ribSpan: 2.5 },
    { cx: -38, cz: 42, yaw: 1.15, ribCount: 5, ribSpan: 2.6 },
    { cx: 12, cz: -48, yaw: -1.3, ribCount: 6, ribSpan: 3.1 } // northern reef barrier
  ];

  for (let f = 0; f < distantFormations.length; f++) {
    const form = distantFormations[f]!;
    const fCenter = new Vector3(S.origin.x + form.cx, S.seaHeight, S.origin.z + form.cz);

    const fSpine = [
      atPos(fCenter, form.yaw, -4.2, 0.15, 0),
      atPos(fCenter, form.yaw, 0, 0.42, 0),
      atPos(fCenter, form.yaw, 4.2, 0.10, 0)
    ];
    parts.push(MeshBuilder.CreateTube(`dragon-remains:dist-spine:${f}`, {
      path: fSpine,
      radius: 0.38,
      tessellation: 10,
      cap: Mesh.CAP_ALL
    }, scene));

    for (let i = 0; i < form.ribCount; i++) {
      const t = (i - (form.ribCount - 1) / 2) * 1.35;
      const vertPt = atPos(fCenter, form.yaw, t, 0.35, 0);
      const vert = MeshBuilder.CreateIcoSphere(`dragon-remains:dist-vert:${f}:${i}`, { radius: 0.55, subdivisions: 2 }, scene);
      vert.position.copyFrom(vertPt);
      vert.scaling.set(1.0, 0.85, 1.25);
      parts.push(vert);

      // Neural spine
      parts.push(MeshBuilder.CreateTube(`dragon-remains:dist-neural:${f}:${i}`, {
        path: [vertPt, atPos(fCenter, form.yaw, t + 0.15, 1.35, 0.05), atPos(fCenter, form.yaw, t + 0.30, 1.65, 0.08)],
        radiusFunction: (n) => 0.20 * (1 - n / 4),
        tessellation: 8,
        cap: Mesh.CAP_ALL
      }, scene));

      // Rib arches
      for (const side of [-1, 1]) {
        const path = Array.from({ length: 18 }, (_, n) => {
          const u = n / 17;
          return atPos(
            fCenter,
            form.yaw,
            t + 0.3 * u,
            0.18 + Math.sin(u * Math.PI) * (form.ribSpan * 0.55 + i * 0.12) - u * 0.45,
            side * u * form.ribSpan
          );
        });
        parts.push(MeshBuilder.CreateTube(`dragon-remains:dist-rib:${f}:${i}:${side}`, {
          path,
          radiusFunction: (n) => 0.26 * (1 - n / 25),
          tessellation: 9,
          cap: Mesh.CAP_ALL
        }, scene));
      }
    }
  }

  for (const p of parts) {
    p.material = material;
    p.receiveShadows = true;
    p.isPickable = false;
    p.bakeCurrentTransformIntoVertices();
    const v = p.getVerticesData('position')!;
    p.setVerticesData('uv', Array.from({ length: v.length / 3 }, (_, i) => [
      (v[i * 3]! + v[i * 3 + 1]! * 0.4) * 0.8,
      (v[i * 3 + 2]! + v[i * 3 + 1]! * 0.7) * 0.8
    ]).flat());
  }

  const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, false)!;
  merged.name = 'dragon-remains:distant-skeletons';
  merged.metadata = { visualOnly: true, kind: 'distant-dragon-bones', deckSurfaceId: 'sea', outsideNavigation: true };
  merged.receiveShadows = true;
  merged.isPickable = false;
  return [merged];
}

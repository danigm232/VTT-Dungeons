import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SW_DIR = path.join(ROOT, 'campaigns', 'stormwreck-isle', 'public');
const MODULES_DIR = path.join(SW_DIR, 'art', 'retreat-modules');
const OUT_DIR = path.join(ROOT, 'prototypes', 'godot-retiro');
const OUT_DATA_DIR = path.join(OUT_DIR, 'assets', 'data');
const OUT_TEX_DIR = path.join(OUT_DIR, 'assets', 'textures');
const OUT_MOD_DIR = path.join(OUT_DIR, 'assets', 'retreat-modules');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function buildExpandedTerrain() {
  const terrain = readJson(path.join(SW_DIR, 'retreat-terrain-v2.json'));
  const forest = readJson(path.join(SW_DIR, 'retreat-forest-walkability.json'));
  const temple = readJson(path.join(SW_DIR, 'retreat-temple-navigation.json'));
  const r3 = readJson(path.join(SW_DIR, 'retreat-r3-navigation.json'));

  const clonedSurfaces = terrain.surfaces.map((s) => ({
    ...s,
    tiles: s.tiles.map((t) => ({ ...t, cell: { ...t.cell }, corners: [...t.corners] })),
  }));
  const obstacles = terrain.obstacles || [];

  // 1. expandRetreatIslandWalkability
  const byId = new Map(clonedSurfaces.map((s) => [s.id, s]));
  for (const record of forest.cells || []) {
    const s = byId.get(record.surfaceId);
    if (!s) continue;
    const key = `${record.cell.col},${record.cell.row}`;
    if (s.tiles.some((t) => `${t.cell.col},${t.cell.row}` === key)) continue;
    if (obstacles.some((o) => o.surfaceId === s.id && `${o.cell.col},${o.cell.row}` === key)) continue;
    const h = record.height;
    s.tiles.push({
      cell: { ...record.cell },
      corners: [h, h, h, h],
      kind: 'floor',
      materialId: 'retreat-earth',
      movementCost: 1,
      medium: 'solid',
    });
  }

  // 2. adaptRetreatTempleNavigation
  const a5Surf = byId.get('a5');
  if (a5Surf && temple.surface?.tiles) {
    a5Surf.tiles = temple.surface.tiles.map((t) => ({ ...t, cell: { ...t.cell }, corners: [...t.corners] }));
  }

  // 3. adaptRetreatCorrectionsNavigation
  for (const rSurf of r3.surfaces || []) {
    const target = byId.get(rSurf.id);
    if (target && Array.isArray(rSurf.tiles)) {
      target.tiles = rSurf.tiles.map((t) => ({ ...t, cell: { ...t.cell }, corners: [...t.corners] }));
    }
  }

  // 4. adaptRetreatWinchJunction + relleno de huecos interiores/transiciones para evitar caídas
  const ensureTile = (surfId, col, row, y, materialId = 'retreat-stone') => {
    const s = byId.get(surfId);
    if (!s) return;
    if (s.tiles.some((t) => t.cell.col === col && t.cell.row === row)) return;
    s.tiles.push({
      cell: { col, row },
      corners: [y, y, y, y],
      kind: 'floor',
      materialId,
      movementCost: 1,
      medium: 'solid',
    });
  };

  const a2Surf = byId.get('a2');
  if (a2Surf) {
    for (let col = 102; col <= 108; col++) {
      for (let row = 43; row <= 45; row++) {
        if (col === 102 && row === 43) continue;
        ensureTile('a2', col, row, 15, 'retreat-wood');
      }
    }
  }

  // 5. Rellenar huecos bajo muebles/hoguera/estatua en las 6 cuevas excavadas y la plaza A1
  const a1CaveRects = [
    [51, 55, 55, 59], // Habitación 1
    [58, 51, 61, 59], // Habitación 2 (Tarak)
    [64, 53, 69, 59], // Habitación 3 (Varnoth)
    [72, 52, 77, 59], // Habitación 4 (Myla)
    [80, 51, 82, 59], // Habitación 5 (Kobolds oeste)
    [85, 52, 89, 59], // Habitación 6 (Kobolds este)
    [50, 60, 92, 63], // Plaza central A1 (sin huecos bajo hoguera o estatua)
  ];
  for (const [c0, r0, c1, r1] of a1CaveRects) {
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        ensureTile('a1', c, r, 9.0, 'retreat-plaza');
      }
    }
  }

  // 6. Rellenar umbrales/huecos en Paseo Superior (upper), A3, A4 y puente A2/cliff
  for (let c = 51; c <= 96; c++) {
    for (let r = 43; r <= 47; r++) {
      ensureTile('upper', c, r, 18.0, 'retreat-stone');
    }
  }
  for (let c = 76; c <= 86; c++) {
    for (let r = 37; r <= 41; r++) {
      ensureTile('a3', c, r, 18.0, 'retreat-stone');
    }
  }
  for (let c = 58; c <= 73; c++) {
    for (let r = 35; r <= 41; r++) {
      ensureTile('a4', c, r, 18.0, 'retreat-stone');
    }
  }
  ensureTile('a3', 78, 42, 18.0, 'retreat-stone');
  ensureTile('a4', 68, 42, 18.0, 'retreat-stone');

  const outTerrain = {
    ...terrain,
    adaptation: 'Retreat expanded runtime terrain (forest + temple + r3 + winch junction + solid interiors)',
    surfaces: clonedSurfaces,
  };

  const totalTiles = clonedSurfaces.reduce((n, s) => n + s.tiles.length, 0);
  const summary = Object.fromEntries(clonedSurfaces.map((s) => [s.id, s.tiles.length]));
  console.log(`Terrain built: ${clonedSurfaces.length} surfaces, ${totalTiles} tiles`);
  console.log('Surface tile counts:', JSON.stringify(summary));
  return outTerrain;
}

function copyTextures() {
  fs.mkdirSync(OUT_TEX_DIR, { recursive: true });
  const sources = [
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'a1-plaza-v6.png'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'a1-cell-v6.png'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'a1-cliff-rugged-v8.jpg'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'a1-cliff-v6.png'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'oak-v4.webp'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'limestone-v3.webp'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'ashlar-v4.webp'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'earth.webp'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'linen-v4.webp'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'wool-v4.webp'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'bay-v3.png'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1', 'foliage-atlas-v5.png'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'camp-detail-v1', 'foliage-atlas.png'),
    path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'camp-detail-v1', 'coastal-rock.png'),
    path.join(SW_DIR, 'art', 'retreat-stone', 'basalt-coastal-albedo-v1.webp'),
    path.join(SW_DIR, 'art', 'retreat-refinement', 'rock-normal-v1.png'),
    path.join(SW_DIR, 'art', 'retreat-refinement', 'wood-normal-v1.png'),
    path.join(SW_DIR, 'art', 'retreat-refinement', 'metal-normal-v1.png'),
  ];
  let copied = 0;
  for (const src of sources) {
    if (!fs.existsSync(src)) {
      console.warn('Missing texture:', src);
      continue;
    }
    const dst = path.join(OUT_TEX_DIR, path.basename(src));
    fs.copyFileSync(src, dst);
    copied++;
  }
  console.log(`Textures copied: ${copied} files -> ${OUT_TEX_DIR}`);
}

// ============================================================================
// GLB PARSER & GODOT-READY GLB MERGER
// ============================================================================
function parseGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error(`Invalid GLB: ${filePath}`);
  let offset = 12;
  let gltf = null;
  let bin = Buffer.alloc(0);
  while (offset + 8 <= buf.length) {
    const chunkLen = buf.readUInt32LE(offset);
    const chunkType = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + chunkLen);
    if (chunkType === 0x4e4f534a) {
      gltf = JSON.parse(data.toString('utf8'));
    } else if (chunkType === 0x004e4942) {
      bin = data;
    }
    offset += 8 + chunkLen;
  }
  return { gltf, bin };
}

const COMP_INFO = {
  5120: { size: 1, read: (b, o, norm) => { const v = b.readInt8(o); return norm ? Math.max(-1, v / 127) : v; } },
  5121: { size: 1, read: (b, o, norm) => { const v = b.readUInt8(o); return norm ? v / 255 : v; } },
  5122: { size: 2, read: (b, o, norm) => { const v = b.readInt16LE(o); return norm ? Math.max(-1, v / 32767) : v; } },
  5123: { size: 2, read: (b, o, norm) => { const v = b.readUInt16LE(o); return norm ? v / 65535 : v; } },
  5125: { size: 4, read: (b, o) => b.readUInt32LE(o) },
  5126: { size: 4, read: (b, o) => b.readFloatLE(o) },
};
const TYPE_COUNTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(gltf, bin, accessorIdx) {
  const acc = gltf.accessors[accessorIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const info = COMP_INFO[acc.componentType];
  if (!info) throw new Error(`Unsupported componentType ${acc.componentType}`);
  const numComp = TYPE_COUNTS[acc.type];
  if (!numComp) throw new Error(`Unsupported accessor type ${acc.type}`);
  const stride = bv.byteStride || numComp * info.size;
  const baseOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Float32Array(acc.count * numComp);
  const norm = Boolean(acc.normalized);
  for (let i = 0; i < acc.count; i++) {
    const rowOff = baseOffset + i * stride;
    for (let c = 0; c < numComp; c++) {
      out[i * numComp + c] = info.read(bin, rowOff + c * info.size, norm);
    }
  }
  return { data: out, numComp, count: acc.count };
}

function readIndices(gltf, bin, accessorIdx, vertCount) {
  if (accessorIdx === undefined) {
    const out = new Uint32Array(vertCount);
    for (let i = 0; i < vertCount; i++) out[i] = i;
    return out;
  }
  const acc = gltf.accessors[accessorIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const info = COMP_INFO[acc.componentType];
  const stride = bv.byteStride || info.size;
  const baseOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Uint32Array(acc.count);
  for (let i = 0; i < acc.count; i++) {
    out[i] = Math.trunc(info.read(bin, baseOffset + i * stride, false));
  }
  return out;
}

function quatRotate(q, v) {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

function normalize3(x, y, z) {
  const len = Math.hypot(x, y, z);
  return len > 1e-8 ? [x / len, y / len, z / len] : [0, 1, 0];
}

function clipTriangleListZMax(verts, zMax) {
  // verts: array of { pos:[x,y,z], norm:[nx,ny,nz], uv:[u,v], col:[r,g,b,a] } triplets
  // Returns new vertex list + triangle indices where world z <= zMax
  const outVerts = [];
  const outIdx = [];

  function lerpVert(a, b, t) {
    const n = normalize3(
      a.norm[0] + (b.norm[0] - a.norm[0]) * t,
      a.norm[1] + (b.norm[1] - a.norm[1]) * t,
      a.norm[2] + (b.norm[2] - a.norm[2]) * t
    );
    return {
      pos: [
        a.pos[0] + (b.pos[0] - a.pos[0]) * t,
        a.pos[1] + (b.pos[1] - a.pos[1]) * t,
        a.pos[2] + (b.pos[2] - a.pos[2]) * t,
      ],
      norm: n,
      uv: [a.uv[0] + (b.uv[0] - a.uv[0]) * t, a.uv[1] + (b.uv[1] - a.uv[1]) * t],
      col: [
        a.col[0] + (b.col[0] - a.col[0]) * t,
        a.col[1] + (b.col[1] - a.col[1]) * t,
        a.col[2] + (b.col[2] - a.col[2]) * t,
        1,
      ],
    };
  }

  for (let i = 0; i < verts.length; i += 3) {
    const poly = [verts[i], verts[i + 1], verts[i + 2]];
    const clipped = [];
    for (let k = 0; k < 3; k++) {
      const a = poly[k];
      const b = poly[(k + 1) % 3];
      const da = zMax - a.pos[2];
      const db = zMax - b.pos[2];
      if (da >= -1e-6) clipped.push(a);
      if ((da > 1e-6 && db < -1e-6) || (da < -1e-6 && db > 1e-6)) {
        clipped.push(lerpVert(a, b, da / (da - db)));
      }
    }
    for (let t = 1; t < clipped.length - 1; t++) {
      const v0 = clipped[0], v1 = clipped[t], v2 = clipped[t + 1];
      const ax = v1.pos[0] - v0.pos[0], ay = v1.pos[1] - v0.pos[1], az = v1.pos[2] - v0.pos[2];
      const bx = v2.pos[0] - v0.pos[0], by = v2.pos[1] - v0.pos[1], bz = v2.pos[2] - v0.pos[2];
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      if (cx * cx + cy * cy + cz * cz < 1e-14) continue;
      const base = outVerts.length;
      outVerts.push(v0, v1, v2);
      outIdx.push(base, base + 1, base + 2);
    }
  }
  return { verts: outVerts, idx: outIdx };
}

function createGlbCollector() {
  // buckets keyed by `${bucketPrefix}|${materialName}`
  const buckets = new Map();
  const matMeta = new Map();

  function addPrimitive(bucketPrefix, matName, matDef, verts, indices, detFlip) {
    const key = `${bucketPrefix}|${matName}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        nodeName: `${bucketPrefix}__${matName}`.replace(/[^a-zA-Z0-9_:-]/g, '_'),
        matName,
        pos: [],
        norm: [],
        uv: [],
        col: [],
        idx: [],
      };
      buckets.set(key, b);
    }
    if (matDef && !matMeta.has(matName)) {
      matMeta.set(matName, matDef);
    }
    const baseVert = b.pos.length / 3;
    for (const v of verts) {
      b.pos.push(v.pos[0], v.pos[1], v.pos[2]);
      b.norm.push(v.norm[0], v.norm[1], v.norm[2]);
      b.uv.push(v.uv[0], v.uv[1]);
      b.col.push(v.col[0], v.col[1], v.col[2], 1);
    }
    for (let i = 0; i + 2 < indices.length; i += 3) {
      if (detFlip) {
        b.idx.push(baseVert + indices[i], baseVert + indices[i + 2], baseVert + indices[i + 1]);
      } else {
        b.idx.push(baseVert + indices[i], baseVert + indices[i + 1], baseVert + indices[i + 2]);
      }
    }
  }

  function writeGlb(outPath) {
    const bucketList = [...buckets.values()].filter((b) => b.idx.length > 0);
    const matNames = [...new Set(bucketList.map((b) => b.matName))];
    const matIndexByName = new Map(matNames.map((n, i) => [n, i]));

    const chunks = [];
    let byteOffset = 0;
    const bufferViews = [];
    const accessors = [];
    const meshes = [];
    const nodes = [];

    function pushAlignedBuffer(typedArray, target) {
      const raw = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
      const pad = (4 - (raw.length % 4)) % 4;
      const viewIdx = bufferViews.length;
      bufferViews.push({
        buffer: 0,
        byteOffset,
        byteLength: raw.length,
        ...(target ? { target } : {}),
      });
      chunks.push(raw);
      if (pad > 0) chunks.push(Buffer.alloc(pad));
      byteOffset += raw.length + pad;
      return viewIdx;
    }

    for (const b of bucketList) {
      const posArr = new Float32Array(b.pos);
      const normArr = new Float32Array(b.norm);
      const uvArr = new Float32Array(b.uv);
      const colArr = new Float32Array(b.col);
      const idxArr = new Uint32Array(b.idx);
      const vCount = posArr.length / 3;

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < posArr.length; i += 3) {
        const x = posArr[i], y = posArr[i + 1], z = posArr[i + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }

      const vPos = pushAlignedBuffer(posArr, 34962);
      const vNorm = pushAlignedBuffer(normArr, 34962);
      const vUv = pushAlignedBuffer(uvArr, 34962);
      const vCol = pushAlignedBuffer(colArr, 34962);
      const vIdx = pushAlignedBuffer(idxArr, 34963);

      const aPos = accessors.length;
      accessors.push({ bufferView: vPos, componentType: 5126, count: vCount, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] });
      const aNorm = accessors.length;
      accessors.push({ bufferView: vNorm, componentType: 5126, count: vCount, type: 'VEC3' });
      const aUv = accessors.length;
      accessors.push({ bufferView: vUv, componentType: 5126, count: vCount, type: 'VEC2' });
      const aCol = accessors.length;
      accessors.push({ bufferView: vCol, componentType: 5126, count: vCount, type: 'VEC4' });
      const aIdx = accessors.length;
      accessors.push({ bufferView: vIdx, componentType: 5125, count: idxArr.length, type: 'SCALAR' });

      const meshIdx = meshes.length;
      meshes.push({
        name: b.nodeName,
        primitives: [
          {
            attributes: { POSITION: aPos, NORMAL: aNorm, TEXCOORD_0: aUv, COLOR_0: aCol },
            indices: aIdx,
            material: matIndexByName.get(b.matName),
          },
        ],
      });
      nodes.push({
        name: b.nodeName,
        mesh: meshIdx,
        extras: { sourceMaterial: b.matName },
      });
    }

    const materials = matNames.map((name) => {
      const src = matMeta.get(name) || {};
      const pbr = src.pbrMetallicRoughness || {};
      const mat = {
        name,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: Array.isArray(pbr.baseColorFactor) ? pbr.baseColorFactor : [0.8, 0.8, 0.8, 1],
          metallicFactor: typeof pbr.metallicFactor === 'number' ? pbr.metallicFactor : 0,
          roughnessFactor: typeof pbr.roughnessFactor === 'number' ? pbr.roughnessFactor : 0.88,
        },
      };
      if (Array.isArray(src.emissiveFactor)) {
        mat.emissiveFactor = src.emissiveFactor;
      }
      return mat;
    });

    const binBuf = Buffer.concat(chunks);
    const gltfOut = {
      asset: { version: '2.0', generator: 'Dungeons Godot Retreat Exporter' },
      scene: 0,
      scenes: [{ nodes: nodes.map((_, i) => i) }],
      nodes,
      meshes,
      materials,
      accessors,
      bufferViews,
      buffers: [{ byteLength: binBuf.length }],
    };

    const jsonRaw = Buffer.from(JSON.stringify(gltfOut), 'utf8');
    const jsonPad = (4 - (jsonRaw.length % 4)) % 4;
    const jsonChunk = Buffer.concat([jsonRaw, Buffer.alloc(jsonPad, 0x20)]);
    const totalLen = 12 + 8 + jsonChunk.length + 8 + binBuf.length;

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(totalLen, 8);

    const jHdr = Buffer.alloc(8);
    jHdr.writeUInt32LE(jsonChunk.length, 0);
    jHdr.writeUInt32LE(0x4e4f534a, 4);

    const bHdr = Buffer.alloc(8);
    bHdr.writeUInt32LE(binBuf.length, 0);
    bHdr.writeUInt32LE(0x004e4942, 4);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.concat([header, jHdr, jsonChunk, bHdr, binBuf]));
    const totalTris = bucketList.reduce((n, b) => n + b.idx.length / 3, 0);
    console.log(`GLB written: ${path.basename(outPath)} (${nodes.length} nodes, ${totalTris} tris, ${(totalLen / 1024 / 1024).toFixed(2)} MB)`);
  }

  return { addPrimitive, writeGlb };
}

function clipTriangleListYMax(verts, yMax) {
  const outVerts = [];
  const outIdx = [];

  function lerpVert(a, b, t) {
    const n = normalize3(
      a.norm[0] + (b.norm[0] - a.norm[0]) * t,
      a.norm[1] + (b.norm[1] - a.norm[1]) * t,
      a.norm[2] + (b.norm[2] - a.norm[2]) * t
    );
    return {
      pos: [
        a.pos[0] + (b.pos[0] - a.pos[0]) * t,
        a.pos[1] + (b.pos[1] - a.pos[1]) * t,
        a.pos[2] + (b.pos[2] - a.pos[2]) * t,
      ],
      norm: n,
      uv: [a.uv[0] + (b.uv[0] - a.uv[0]) * t, a.uv[1] + (b.uv[1] - a.uv[1]) * t],
      col: [
        a.col[0] + (b.col[0] - a.col[0]) * t,
        a.col[1] + (b.col[1] - a.col[1]) * t,
        a.col[2] + (b.col[2] - a.col[2]) * t,
        1,
      ],
    };
  }

  for (let i = 0; i < verts.length; i += 3) {
    const poly = [verts[i], verts[i + 1], verts[i + 2]];
    const clipped = [];
    for (let k = 0; k < 3; k++) {
      const a = poly[k];
      const b = poly[(k + 1) % 3];
      const da = yMax - a.pos[1];
      const db = yMax - b.pos[1];
      if (da >= -1e-6) clipped.push(a);
      if ((da > 1e-6 && db < -1e-6) || (da < -1e-6 && db > 1e-6)) {
        clipped.push(lerpVert(a, b, da / (da - db)));
      }
    }
    for (let t = 1; t < clipped.length - 1; t++) {
      const v0 = clipped[0], v1 = clipped[t], v2 = clipped[t + 1];
      const ax = v1.pos[0] - v0.pos[0], ay = v1.pos[1] - v0.pos[1], az = v1.pos[2] - v0.pos[2];
      const bx = v2.pos[0] - v0.pos[0], by = v2.pos[1] - v0.pos[1], bz = v2.pos[2] - v0.pos[2];
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      if (cx * cx + cy * cy + cz * cz < 1e-14) continue;
      const base = outVerts.length;
      outVerts.push(v0, v1, v2);
      outIdx.push(base, base + 1, base + 2);
    }
  }
  return { verts: outVerts, idx: outIdx };
}

function buildExclusions() {
  const refRep = readJson(path.join(SW_DIR, 'retreat-refinement-replaced.json'));
  const stoneRep = readJson(path.join(SW_DIR, 'retreat-stone-replaced.json'));
  const exactExcluded = new Set([
    ...refRep,
    ...stoneRep,
    // Retired phase 2/6/G2/SAL/R3 replacements
    'P3_Organic_Upper_Cave_Crown',
    'P3_Cave_Mountain_West',
    'P3_Cave_Mountain_East',
    'P3_Cave_Mountain_North',
    'P7_Maritime_Sky_Dome',
    'P7_Extended_Existing_Sea',
    'G2_Backland_Connected_Volcanic_Island',
    'SAL1_Backland_Presentation',
    'SAL2_Backland_Presentation',
    'SAL2_Integrated_Shoulder_1',
    'SAL2_Integrated_Shoulder_2',
    'SAL2_Integrated_Shoulder_3',
    'SAL2_Integrated_Shoulder_4',
    'G2_Path_island-observatory',
    'SAL2R_Backland_Presentation_Stone',
    'SAL2R_Backland_Presentation_Soil',
    'Geography_G13_Winch_Observatorio_Connected_Headland',
    'SAL3_Coastal_Backland_Stone',
    'G2_Path_island-pleamar-low',
    'G2_Path_island-pleamar-high',
    'R2_Pleamar_Low_Soil_Shoulder',
    'SAL4_Scenic_Low_Cove_Continuation',
    // Cutaway rock shells front/roof over A3 & A4
    'Stone_P6_Crest_Front_Transition',
    'Stone_P7_Cave_Exterior_Edge_Closures',
    'Stone_P3_Sculpted_Carved_Front_0',
    'Stone_P3_Sculpted_Carved_Front_1',
    'Stone_P3_Sculpted_Carved_Front_2',
    // Eastern sea-blocking rock fins in front of A2 Winch (retreat-winch-sea-rocks.ts)
    'V5_Eastern_Cliff_Continuous_Spine',
    'Stone_Foreground_East',
    'Stone_P3_Eastern_Cliff_Continuous_Backing',
    'P3_Eastern_Cliff_Continuous_Backing',
    // Cutaway doorway/entrance occluders keeping A2/A3/A4 open to tactical camera
    'Rock_Cut_Entrance',
    'CANON_Carved_Door_Frame',
    'CANON_West_Door_Frame',
    'Finish_A4_Fixed_Oak_Head',
    'CANON_Worn_Wooden_Door',
    'CANON_Oak_Iron_Door',
  ]);

  // Restauramos todos los pinos de Babylon (SAL2R_Grove_Pine_, SAL2_Reused_Pine_, P5_Refined_Existing_Pine_, G2_Forest_Reused_Pine_, VTT_Forest_Quiet_Pine_, V2_Garden_)
  const retiredPrefixRegex = /^(VTT_Forest_Ground_Pleamar|Finish_A5_(Abacus_Bearing|Timber_Seat)_)/;

  return function shouldExclude(node, fileName) {
    const name = node.name || '';
    const baseName = name.replace(/_primitive\d+$/, '');
    if (exactExcluded.has(name) || exactExcluded.has(baseName)) return true;
    if (retiredPrefixRegex.test(name)) return true;

    const ex = node.extras || {};
    // Cutaway interior visibility rules for A2, A3, A4
    const isUpperInterior = ['a2', 'a3', 'a4'].includes(ex.vttInterior) || ['a2', 'a3', 'a4'].includes(ex.globalZone);
    if (isUpperInterior && ex.vttCutaway === 'roof') return true;
    if (ex.role === 'wall-upper' && ['south', 'west', 'east'].includes(ex.cutawaySide)) {
      // Keep north rear upper walls for backdrop depth, hide south/side upper walls so interiors read cleanly
      return true;
    }
    if (fileName === 'retreat_r3_a3.glb' && /(_Upper)$/.test(name) && !/^Dining_North_Upper$|^Kitchen_North_Upper$/.test(name)) {
      return true;
    }
    return false;
  };
}

function processModuleList(files, collector, shouldExclude, isR3Landscape = false, mountainTris = null) {
  const forestBuckets = new Set(['Geo11', 'Geo12', 'P3Terrain', 'StoneS3', 'SAL1', 'SAL2', 'SAL2R', 'SAL3']);
  for (const { file, bucketPrefix } of files) {
    const fullPath = path.join(MODULES_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.warn('Skipping missing module:', file);
      continue;
    }
    const { gltf, bin } = parseGlb(fullPath);
    for (const node of gltf.nodes || []) {
      if (node.mesh === undefined) continue;
      if (shouldExclude(node, file)) continue;

      const mesh = gltf.meshes[node.mesh];
      const T = node.translation || [0, 0, 0];
      const R = node.rotation || [0, 0, 0, 1];
      const S = node.scale || [1, 1, 1];
      const sDet = Math.sign(S[0] * S[1] * S[2]) || 1;
      const detFlip = sDet > 0;

      const clipToBacking =
        node.name === 'Stone_P6_Joined_Excavated_Mountain_Crest' ||
        node.name === 'Stone_P6_Joined_Excavated_Mountain_Sides';

      const nodeGroup = isR3Landscape
        ? bucketPrefix
        : `${bucketPrefix}_${(node.name || 'Node').split('_').slice(0, 2).join('_')}`;

      for (const prim of mesh.primitives || []) {
        const attrs = prim.attributes || {};
        if (attrs.POSITION === undefined) continue;

        const matIdx = prim.material;
        const matDef = matIdx !== undefined ? gltf.materials[matIdx] : null;
        const matName = (matDef?.name || 'Default_Mat').replace(/\.\d+$/, '');
        const clampPlazaWedge = bucketPrefix === 'A1Ctx' && matName === 'a1:coastal-cliff-v10';

        const posAcc = readAccessor(gltf, bin, attrs.POSITION);
        const normAcc = attrs.NORMAL !== undefined ? readAccessor(gltf, bin, attrs.NORMAL) : null;
        const uvAcc = attrs.TEXCOORD_0 !== undefined ? readAccessor(gltf, bin, attrs.TEXCOORD_0) : null;
        const colAcc = attrs.COLOR_0 !== undefined ? readAccessor(gltf, bin, attrs.COLOR_0) : null;
        const rawIndices = readIndices(gltf, bin, prim.indices, posAcc.count);

        const verts = new Array(posAcc.count);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;

        for (let i = 0; i < posAcc.count; i++) {
          const sx = posAcc.data[i * 3] * S[0];
          const sy = posAcc.data[i * 3 + 1] * S[1];
          const sz = posAcc.data[i * 3 + 2] * S[2];
          const pr = quatRotate(R, [sx, sy, sz]);
          const wx = T[0] + pr[0];
          let wy = T[1] + pr[1];
          const wz = -(T[2] + pr[2]); // Babylon gltfRoot.scaling.set(1,1,-1)

          if (clampPlazaWedge && wx >= 95.0 && wx <= 116.0 && wz >= 91.0 && wz <= 97.2 && wy > 8.92) {
            wy = 8.92;
          }

          if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
          if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
          if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;

          let n = [0, 1, 0];
          if (normAcc) {
            const nl = normalize3(normAcc.data[i * 3] / S[0], normAcc.data[i * 3 + 1] / S[1], normAcc.data[i * 3 + 2] / S[2]);
            const nr = quatRotate(R, nl);
            n = normalize3(nr[0], nr[1], -nr[2]);
          }
          const uv = uvAcc ? [uvAcc.data[i * 2], uvAcc.data[i * 2 + 1]] : [wx * 0.25, wz * 0.25];
          const col = colAcc
            ? [
                colAcc.data[i * colAcc.numComp],
                colAcc.data[i * colAcc.numComp + 1],
                colAcc.data[i * colAcc.numComp + 2],
                1,
              ]
            : [1, 1, 1, 1];

          verts[i] = { pos: [wx, wy, wz], norm: n, uv, col };
        }

        // Registrar triángulos hacia arriba de la montaña para poblar el bosque frondoso
        if (mountainTris && forestBuckets.has(bucketPrefix) && /cliff|earth/i.test(matName)) {
          for (let i = 0; i + 2 < rawIndices.length; i += 3) {
            const p0 = verts[rawIndices[i]].pos;
            const p1 = verts[rawIndices[i + 1]].pos;
            const p2 = verts[rawIndices[i + 2]].pos;
            const maxTy = Math.max(p0[1], p1[1], p2[1]);
            if (maxTy < 11.5) continue;
            const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
            const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            const len = Math.hypot(nx, ny, nz);
            if (len > 1e-6 && Math.abs(ny) / len > 0.36) {
              mountainTris.push([p0, p1, p2]);
            }
          }
        }

        // Skip old upper railing inside R3 widened upper walk
        if (
          !isR3Landscape &&
          /(Rope|Post|Rail)/.test(node.name || '') &&
          !(node.name || '').startsWith('R3_') &&
          minX >= 76 && maxX <= 136 && minZ >= 66.7 && maxZ <= 69 && minY > 17.5 && maxY < 20
        ) {
          continue;
        }

        if (clipToBacking) {
          const triVerts = [];
          for (let i = 0; i + 2 < rawIndices.length; i += 3) {
            if (detFlip) {
              triVerts.push(verts[rawIndices[i]], verts[rawIndices[i + 2]], verts[rawIndices[i + 1]]);
            } else {
              triVerts.push(verts[rawIndices[i]], verts[rawIndices[i + 1]], verts[rawIndices[i + 2]]);
            }
          }
          const clipped = clipTriangleListZMax(triVerts, 49.2);
          if (clipped.idx.length > 0) {
            collector.addPrimitive(nodeGroup, matName, matDef, clipped.verts, clipped.idx, false);
          }
        } else {
          const semanticPrefix = isR3Landscape ? bucketPrefix : `${bucketPrefix}`;
          collector.addPrimitive(semanticPrefix, matName, matDef, verts, rawIndices, detFlip);
        }
      }
    }
  }
}

// Exporta desde retreat_global_complete.glb las 6 celdas excavadas en la roca, particiones, muebles y estatua Astalagan
function processA1ExcavationsFromComplete(collector) {
  const fullPath = path.join(MODULES_DIR, 'retreat_global_complete.glb');
  if (!fs.existsSync(fullPath)) {
    console.warn('Missing retreat_global_complete.glb');
    return;
  }
  const { gltf, bin } = parseGlb(fullPath);
  const includeRegex = /^a1:(bedrock-partition|room-[1-6]:(?!mountain-roof)|blanket|pillow|kobold-hammock|astalagan|statue-votive|fire-log|plaza-fire|bench-folded-cloth|fire-kettle|kettle-|watch-lamp|woodpile-log)|^camp:coal-bed/;

  let count = 0;
  for (const node of gltf.nodes || []) {
    if (node.mesh === undefined) continue;
    const name = node.name || '';
    if (!includeRegex.test(name)) continue;

    const isFrontPortal = /^a1:room-[1-6]:face-3:/.test(name);
    const bucketPrefix = name.startsWith('a1:bedrock-partition')
      ? 'A1Bedrock'
      : name.startsWith('a1:room-')
        ? 'A1Room'
        : 'A1PlazaProp';

    const mesh = gltf.meshes[node.mesh];
    const T = node.translation || [0, 0, 0];
    const R = node.rotation || [0, 0, 0, 1];
    const S = node.scale || [1, 1, 1];
    const sDet = Math.sign(S[0] * S[1] * S[2]) || 1;
    const detFlip = sDet > 0;

    for (const prim of mesh.primitives || []) {
      const attrs = prim.attributes || {};
      if (attrs.POSITION === undefined) continue;
      const matIdx = prim.material;
      const matDef = matIdx !== undefined ? gltf.materials[matIdx] : null;
      const matName = (matDef?.name || 'Default_Mat').replace(/\.\d+$/, '');
      if (matName.includes('contact-shadow')) continue;

      const posAcc = readAccessor(gltf, bin, attrs.POSITION);
      const normAcc = attrs.NORMAL !== undefined ? readAccessor(gltf, bin, attrs.NORMAL) : null;
      const uvAcc = attrs.TEXCOORD_0 !== undefined ? readAccessor(gltf, bin, attrs.TEXCOORD_0) : null;
      const colAcc = attrs.COLOR_0 !== undefined ? readAccessor(gltf, bin, attrs.COLOR_0) : null;
      const rawIndices = readIndices(gltf, bin, prim.indices, posAcc.count);

      const verts = new Array(posAcc.count);
      for (let i = 0; i < posAcc.count; i++) {
        const sx = posAcc.data[i * 3] * S[0];
        const sy = posAcc.data[i * 3 + 1] * S[1];
        const sz = posAcc.data[i * 3 + 2] * S[2];
        const pr = quatRotate(R, [sx, sy, sz]);
        const wx = T[0] + pr[0];
        const wy = T[1] + pr[1];
        const wz = -(T[2] + pr[2]);

        let n = [0, 1, 0];
        if (normAcc) {
          const nl = normalize3(normAcc.data[i * 3] / S[0], normAcc.data[i * 3 + 1] / S[1], normAcc.data[i * 3 + 2] / S[2]);
          const nr = quatRotate(R, nl);
          n = normalize3(nr[0], nr[1], -nr[2]);
        }
        const uv = uvAcc ? [uvAcc.data[i * 2], uvAcc.data[i * 2 + 1]] : [wx * 0.25, wz * 0.25];
        const col = colAcc
          ? [colAcc.data[i * colAcc.numComp], colAcc.data[i * colAcc.numComp + 1], colAcc.data[i * colAcc.numComp + 2], 1]
          : [1, 1, 1, 1];
        verts[i] = { pos: [wx, wy, wz], norm: n, uv, col };
      }

      if (isFrontPortal) {
        // Recorte cutaway del muro frontal de la cueva a media altura (y <= 10.35m) para leer camas/muebles y umbral rocoso
        const triVerts = [];
        for (let i = 0; i + 2 < rawIndices.length; i += 3) {
          if (detFlip) triVerts.push(verts[rawIndices[i]], verts[rawIndices[i + 2]], verts[rawIndices[i + 1]]);
          else triVerts.push(verts[rawIndices[i]], verts[rawIndices[i + 1]], verts[rawIndices[i + 2]]);
        }
        const clipped = clipTriangleListYMax(triVerts, 10.35);
        if (clipped.idx.length > 0) {
          collector.addPrimitive(bucketPrefix, matName, matDef, clipped.verts, clipped.idx, false);
        }
      } else {
        collector.addPrimitive(bucketPrefix, matName, matDef, verts, rawIndices, detFlip);
      }
      count++;
    }
  }
  console.log(`Exported ${count} canonical A1 excavation/prop primitives from retreat_global_complete.glb`);
}

function sampleMountainForest(mountainTris, outTerrain) {
  const cellSize = 4.0;
  const grid = new Map();
  for (let idx = 0; idx < mountainTris.length; idx++) {
    const [p0, p1, p2] = mountainTris[idx];
    const minX = Math.floor(Math.min(p0[0], p1[0], p2[0]) / cellSize);
    const maxX = Math.floor(Math.max(p0[0], p1[0], p2[0]) / cellSize);
    const minZ = Math.floor(Math.min(p0[2], p1[2], p2[2]) / cellSize);
    const maxZ = Math.floor(Math.max(p0[2], p1[2], p2[2]) / cellSize);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const key = `${cx},${cz}`;
        let list = grid.get(key);
        if (!list) {
          list = [];
          grid.set(key, list);
        }
        list.push(idx);
      }
    }
  }

  function queryMaxY(x, z) {
    const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    const list = grid.get(key);
    if (!list) return null;
    let bestY = -Infinity;
    for (const idx of list) {
      const [a, b, c] = mountainTris[idx];
      const v0x = c[0] - a[0], v0z = c[2] - a[2];
      const v1x = b[0] - a[0], v1z = b[2] - a[2];
      const v2x = x - a[0], v2z = z - a[2];
      const dot00 = v0x * v0x + v0z * v0z;
      const dot01 = v0x * v1x + v0z * v1z;
      const dot02 = v0x * v2x + v0z * v2z;
      const dot11 = v1x * v1x + v1z * v1z;
      const dot12 = v1x * v2x + v1z * v2z;
      const denom = dot00 * dot11 - dot01 * dot01;
      if (Math.abs(denom) < 1e-9) continue;
      const inv = 1 / denom;
      const u = (dot11 * dot02 - dot01 * dot12) * inv;
      const v = (dot00 * dot12 - dot01 * dot02) * inv;
      if (u >= -0.001 && v >= -0.001 && u + v <= 1.001) {
        const y = a[1] + u * (c[1] - a[1]) + v * (b[1] - a[1]);
        if (y > bestY) bestY = y;
      }
    }
    return bestY > -Infinity ? bestY : null;
  }

  // Centros de casillas transitables para no plantar árboles en caminos, plaza o interiores
  const pathPoints = [];
  for (const s of outTerrain.surfaces) {
    if (['beach', 'pleamar', 'island-pleamar-low'].includes(s.id)) continue;
    for (const t of s.tiles) {
      pathPoints.push([(t.cell.col + 0.5) * 1.5, (t.cell.row + 0.5) * 1.5]);
    }
  }
  const pathGrid = new Map();
  for (const pt of pathPoints) {
    const k = `${Math.floor(pt[0] / 3.0)},${Math.floor(pt[1] / 3.0)}`;
    if (!pathGrid.has(k)) pathGrid.set(k, []);
    pathGrid.get(k).push(pt);
  }
  function isBlockedByZoneOrPath(x, z, minDist) {
    // Interiores y alrededores inmediatos de edificios, plaza y jardines
    if (x >= 72.0 && x <= 144.0 && z >= 63.0 && z <= 99.0) return true; // A1 plaza/cuevas + paseo
    if (x >= 111.0 && x <= 132.5 && z >= 46.5 && z <= 69.5) return true; // A3 Comedor/Cocina
    if (x >= 85.0 && x <= 111.0 && z >= 48.0 && z <= 69.5) return true; // A4 Biblioteca
    if (x >= 76.5 && x <= 86.5 && z >= 52.0 && z <= 69.5) return true; // Z7 Jardines
    if (x >= 30.5 && x <= 51.0 && z >= 59.0 && z <= 77.0) return true; // A5 Templo de Bahamut
    if (x >= 150.5 && x <= 167.0 && z >= 60.5 && z <= 73.0) return true; // A2 Cabrestante

    const gx = Math.floor(x / 3.0), gz = Math.floor(z / 3.0);
    const md2 = minDist * minDist;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = pathGrid.get(`${gx + dx},${gz + dz}`);
        if (!list) continue;
        for (const pt of list) {
          const d2 = (x - pt[0]) ** 2 + (z - pt[1]) ** 2;
          if (d2 < md2) return true;
        }
      }
    }
    return false;
  }

  // PRNG determinista
  let seed = 20261114;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const forestPoints = [];
  const understoryPoints = [];

  // Rejilla densa sobre toda la montaña y laderas verdes (-8..162 x -16..62) + laderas oeste (-2..36 x 52..82)
  for (let gx = -6.0; gx <= 160.0; gx += 4.35) {
    for (let gz = -14.0; gz <= 62.0; gz += 4.35) {
      const x = gx + (rand() - 0.5) * 3.1;
      const z = gz + (rand() - 0.5) * 3.1;
      if (isBlockedByZoneOrPath(x, z, 2.35)) continue;
      const y = queryMaxY(x, z);
      if (y === null || y < 14.5 || y > 47.0) continue;
      // Comprobar pendiente local suave/media para no plantar en acantilados verticales
      const yN = queryMaxY(x, z - 0.9);
      const yS = queryMaxY(x, z + 0.9);
      if (yN !== null && yS !== null && Math.abs(yN - yS) > 3.2) continue;

      const kind = rand() < 0.68 ? 'pine' : (rand() < 0.72 ? 'oak' : 'cypress');
      const scale = +(0.82 + rand() * 0.68).toFixed(2);
      forestPoints.push({ x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), s: scale, k: kind });

      // 1-2 arbustos de sotobosque alrededor de cada árbol
      const bushes = rand() < 0.75 ? 2 : 1;
      for (let b = 0; b < bushes; b++) {
        const bx = x + (rand() - 0.5) * 2.8;
        const bz = z + (rand() - 0.5) * 2.8;
        if (isBlockedByZoneOrPath(bx, bz, 1.85)) continue;
        const by = queryMaxY(bx, bz);
        if (by !== null && by >= 14.0 && by <= 47.5) {
          understoryPoints.push({
            x: +bx.toFixed(2),
            y: +by.toFixed(2),
            z: +bz.toFixed(2),
            s: +(0.75 + rand() * 0.85).toFixed(2),
            f: rand() < 0.35 ? 1 : 0,
          });
        }
      }
    }
  }

  // Bosquete adicional oeste sobre el hombro de Pleamar / Templo
  for (let gx = 4.0; gx <= 32.0; gx += 4.6) {
    for (let gz = 54.0; gz <= 84.0; gz += 4.6) {
      const x = gx + (rand() - 0.5) * 2.8;
      const z = gz + (rand() - 0.5) * 2.8;
      if (isBlockedByZoneOrPath(x, z, 2.35)) continue;
      const y = queryMaxY(x, z);
      if (y === null || y < 13.5 || y > 44.0) continue;
      forestPoints.push({
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        z: +z.toFixed(2),
        s: +(0.80 + rand() * 0.60).toFixed(2),
        k: rand() < 0.65 ? 'pine' : 'oak',
      });
    }
  }

  outTerrain.forest_points = forestPoints;
  outTerrain.understory_points = understoryPoints;
  console.log(`Mountain forest sampled: ${forestPoints.length} trees, ${understoryPoints.length} understory bushes/ferns`);
}

function main() {
  const outTerrain = buildExpandedTerrain();
  copyTextures();

  const shouldExclude = buildExclusions();

  // Bundle 1: Canon Architecture, A1 Context & Excavations, Shore, Connections, P1/P2/P5, Finishes, E1, V4 Paths, V2 Garden
  const archCollector = createGlbCollector();
  processModuleList(
    [
      { file: 'retreat_global_a1_context_runtime.glb', bucketPrefix: 'A1Ctx' },
      { file: 'retreat_global_shore_runtime.glb', bucketPrefix: 'Shore' },
      { file: 'retreat_global_connections_runtime.glb', bucketPrefix: 'Conn' },
      { file: 'retreat_expanded_a2.glb', bucketPrefix: 'A2' },
      { file: 'retreat_finish_a2_runtime.glb', bucketPrefix: 'A2Fin' },
      { file: 'retreat_r3_a3.glb', bucketPrefix: 'A3' },
      { file: 'retreat_r3_finish_a3_runtime.glb', bucketPrefix: 'A3Fin' },
      { file: 'retreat_r3_a4.glb', bucketPrefix: 'A4' },
      { file: 'retreat_r3_finish_a4_runtime.glb', bucketPrefix: 'A4Fin' },
      { file: 'retreat_r3_a5.glb', bucketPrefix: 'A5' },
      { file: 'retreat_finish_a5_runtime.glb', bucketPrefix: 'A5Fin' },
      { file: 'retreat_expanded_p1_runtime.glb', bucketPrefix: 'P1' },
      { file: 'retreat_refinement_p2_runtime.glb', bucketPrefix: 'P2' },
      { file: 'retreat_finish_a1_runtime.glb', bucketPrefix: 'A1Fin' },
      { file: 'retreat_round2_p5_runtime.glb', bucketPrefix: 'P5' },
      { file: 'retreat_environment_e1_runtime.glb', bucketPrefix: 'E1' },
      { file: 'retreat_v4_paths_runtime.glb', bucketPrefix: 'V4' },
      { file: 'retreat_v2_garden.glb', bucketPrefix: 'V2Garden' },
    ],
    archCollector,
    shouldExclude,
    false
  );
  processA1ExcavationsFromComplete(archCollector);
  archCollector.writeGlb(path.join(OUT_MOD_DIR, 'retreat_architecture_canon.glb'));

  // Bundle 2: Sculpted Stone Cliffs, Volcanic Mountain, Island Backdrops, SAL1-4 Departures
  const geoCollector = createGlbCollector();
  const mountainTris = [];
  processModuleList(
    [
      { file: 'retreat_expanded_p3_runtime.glb', bucketPrefix: 'P3Terrain' },
      { file: 'retreat_expanded_stone_s3_runtime.glb', bucketPrefix: 'StoneS3' },
      { file: 'retreat_v5_coast_runtime.glb', bucketPrefix: 'V5Coast' },
      { file: 'retreat_expanded_geography_runtime.glb', bucketPrefix: 'Geo11' },
      { file: 'retreat_geography_g12_runtime.glb', bucketPrefix: 'Geo12' },
      { file: 'retreat_geography_g14_runtime.glb', bucketPrefix: 'Geo14' },
      { file: 'retreat_island_g2_2_runtime.glb', bucketPrefix: 'G2_2' },
      { file: 'retreat_island_g2_3_runtime.glb', bucketPrefix: 'G2_3' },
      { file: 'retreat_v4_sal1_runtime.glb', bucketPrefix: 'SAL1' },
      { file: 'retreat_departure_sal2_runtime.glb', bucketPrefix: 'SAL2' },
      { file: 'retreat_departure_sal2r_runtime.glb', bucketPrefix: 'SAL2R' },
      { file: 'retreat_departure_sal3_runtime.glb', bucketPrefix: 'SAL3' },
      { file: 'retreat_departure_sal4_runtime.glb', bucketPrefix: 'SAL4' },
      { file: 'retreat_round2_exterior_runtime.glb', bucketPrefix: 'R2Ext' },
      { file: 'retreat_r3_path_edges.glb', bucketPrefix: 'R3Paths' },
      { file: 'retreat_r3_low_shoulder.glb', bucketPrefix: 'R3Shoulder' },
    ],
    geoCollector,
    shouldExclude,
    false,
    mountainTris
  );
  geoCollector.writeGlb(path.join(OUT_MOD_DIR, 'retreat_geography_stone.glb'));

  // Muestrear altura de montaña para bosque frondoso y escribir retreat-terrain-v2.json
  sampleMountainForest(mountainTris, outTerrain);
  fs.mkdirSync(OUT_DATA_DIR, { recursive: true });
  const terrainOutPath = path.join(OUT_DATA_DIR, 'retreat-terrain-v2.json');
  fs.writeFileSync(terrainOutPath, JSON.stringify(outTerrain));
  console.log(`Terrain + forest metadata written -> ${terrainOutPath}`);

  // Bundle 3: R3 Landscape (86 pine/olive trees, 31 planters, meadows, jetty planks/piles)
  const r3Collector = createGlbCollector();
  processModuleList(
    [{ file: 'retreat_r3_landscape_runtime.glb', bucketPrefix: 'R3Land' }],
    r3Collector,
    shouldExclude,
    true
  );
  r3Collector.writeGlb(path.join(OUT_MOD_DIR, 'retreat_landscape_r3.glb'));
}

main();

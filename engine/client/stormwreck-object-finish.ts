import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { worldSurfaceUV } from './diorama-kit.js';
import type { StormwreckFinishScope } from '../../campaigns/stormwreck-isle/public/style-sample.js';
import { finishFoliage } from './stormwreck-foliage-finish.js';

/** Closed chamfers, with face-local UVs and clockwise exterior winding. The
 * original box envelope is exact; the bevel removes only its sharp edges. */
export function chamferedTimber(scene: Scene, name: string, width: number, height: number, depth: number, bevel = .012) {
  const half = [width / 2, height / 2, depth / 2], r = Math.min(bevel, ...half.map(v => v * .35));
  const corners: number[][][] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const s = [x, y, z];
    corners.push([0, 1, 2].map(axis => half.map((h, i) => s[i]! * (h! - (i === axis ? 0 : r)))));
  }
  const faces: number[][][] = [];
  for (let axis = 0; axis < 3; axis++) for (const side of [-1, 1]) {
    const other = [0, 1, 2].filter(i => i !== axis);
    faces.push(corners.filter(c => Math.sign(c[axis]![axis]!) === side).map(c => c[axis]!).sort((a, b) =>
      Math.atan2(a[other[1]!]!, a[other[0]!]!) - Math.atan2(b[other[1]!]!, b[other[0]!]!)));
  }
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    const third = 3 - a - b;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const c = corners.filter(c => Math.sign(c[a]![a]!) === sa && Math.sign(c[b]![b]!) === sb)
        .sort((p, q) => p[a]![third]! - q[a]![third]!);
      faces.push([c[0]![a]!, c[0]![b]!, c[1]![b]!, c[1]![a]!]);
    }
  }
  faces.push(...corners);
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], normals: number[] = [];
  for (const face of faces) {
    const center = face.reduce((sum, p) => sum.addInPlace(Vector3.FromArray(p)), Vector3.Zero()).scale(1 / face.length);
    const n = Vector3.Cross(Vector3.FromArray(face[1]!).subtract(Vector3.FromArray(face[0]!)), Vector3.FromArray(face[2]!).subtract(Vector3.FromArray(face[0]!)));
    if (Vector3.Dot(n, center) > 0) face.reverse();
    const start = positions.length / 3;
    for (const p of face) { positions.push(...p); uvs.push(p[0]! / 3.5, p[2]! / 3.5); }
    for (let i = 1; i < face.length - 1; i++) indices.push(start, start + i, start + i + 1);
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh(name, scene), data = new VertexData();
  Object.assign(data, { positions, indices, normals, uvs }); data.applyToMesh(mesh);
  return mesh;
}

const diningNames = ['CANON_Long_Table', 'CANON_Bench_North', 'CANON_Bench_South', 'CANON_Only_Head_Chair'];
type Binding = { id: string; sources: Mesh[]; candidates: Mesh[]; enabled: boolean[]; sourceFor: Mesh[]; kind: string; sample: boolean };
const worldBounds = (meshes: Mesh[]) => {
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const m of meshes) { m.computeWorldMatrix(true); const b = m.getBoundingInfo().boundingBox; min.minimizeInPlace(b.minimumWorld); max.maximizeInPlace(b.maximumWorld); }
  return { min, max, size: max.subtract(min), center: min.add(max).scale(.5) };
};

/** VIS-2 sample and VIS-3 expansion over the delivered furniture and landscape.
 * Original assets and authoritative states retain their existing owners.
 * Scope changes restore originals without reloading or reallocating meshes. */
export function createStormwreckObjectFinish(scene: Scene, sceneId: string, sourcesReady = () => true, initialScope: StormwreckFinishScope = 'sample') {
  if (!['dragon-rest', 'wreck-ship'].includes(sceneId)) return null;
  const bindings: Binding[] = [], seen = new Set<Mesh>(), finished = new Set<string>();
  let enabled = true, disposed = false, lastCount = -1, scope = initialScope;
  const stats = { enabled: true, scope, groups: 0, sourceMeshes: 0, candidateMeshes: 0, sourceTriangles: 0, candidateTriangles: 0, newTextures: 0, newMaterials: 0 };
  const sampleShip = (name: string) => /^(c4-(desk|bed)[^:]*|c2-ballista[^:]*|wheel):/.test(name)
    && /:(worktop|worktop-rim|leg|drawer-front|drawer-apron|table-apron|bed-frame|bed-frame-rim|pedestal|wheel-plinth|wheel-plinth-rim|spoke|stock|spring-arm|carriage-foot|carriage-foot-rim|carriage-brace|stand):/.test(name);
  const sampleHerb = (name: string) => /^R3_Upper_Planter_[78]_R3_(Olive|Sage|Pine_Sun)$/.test(name);
  const active = (b: Binding) => enabled && (scope === 'zones' || b.sample);
  function recount() {
    stats.groups = bindings.length; stats.sourceMeshes = stats.candidateMeshes = stats.sourceTriangles = stats.candidateTriangles = 0;
    for (const b of bindings) {
      stats.sourceMeshes += b.sources.length; stats.candidateMeshes += b.candidates.length;
      stats.sourceTriangles += b.sources.reduce((n, m) => n + m.getTotalIndices() / 3, 0);
      stats.candidateTriangles += b.candidates.reduce((n, m) => n + m.getTotalIndices() / 3, 0);
    }
  }
  function bind(id: string, sources: Mesh[], candidates: Mesh[], sourceFor: Mesh[], kind: string) {
    const binding = { id, sources, candidates, sourceFor, enabled: sources.map(m => m.isEnabled(false)), kind, sample: diningNames.includes(id) || sampleHerb(id) || sampleShip(id) };
    bindings.push(binding); sources.forEach(m => seen.add(m)); finished.add(id);
    for (let i = 0; i < candidates.length; i++) {
      const m = candidates[i]!, source = sourceFor[i]!;
      m.material = source.material; m.isPickable = false; m.checkCollisions = false; m.receiveShadows = true;
      m.metadata = { ...source.metadata, objectFinishV1: true, sourceObject: id, visualOnly: true };
      m.computeWorldMatrix(true);
      // A late-loaded derivative belongs to the same room lights and shadow
      // lists as its source, including explicit exclusions across rooms.
      for (const light of scene.lights) {
        if (light.includedOnlyMeshes.includes(source) && !light.includedOnlyMeshes.includes(m)) light.includedOnlyMeshes.push(m);
        if (light.excludedMeshes.includes(source) && !light.excludedMeshes.includes(m)) light.excludedMeshes.push(m);
        const shadow = light.getShadowGenerator()?.getShadowMap();
        if (shadow?.renderList?.includes(source) && !shadow.renderList.includes(m)) shadow.renderList.push(m);
      }
    }
    sources.forEach(m => m.setEnabled(false));
    recount();
  }
  function dining(id: string, sources: Mesh[]) {
    const b = worldBounds(sources), { x: w, y: h, z: d } = b.size, pieces: Mesh[] = [];
    const topSource = sources.reduce((a, c) => worldBounds([a]).max.y > worldBounds([c]).max.y ? a : c);
    const supportSource = sources.find(m => m !== topSource) ?? topSource;
    const buckets = new Map<Mesh, Mesh[]>();
    function beam(label: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, source = supportSource) {
      const m = chamferedTimber(scene, `finish:${id}:${label}`, sx, sy, sz, Math.min(.016, sy * .14, sz * .12));
      m.position.set(b.center.x + x, b.min.y + y, b.center.z + z); m.material = source.material;
      worldSurfaceUV(m, 3.5); const bucket = buckets.get(source) ?? []; bucket.push(m); buckets.set(source, bucket); return m;
    }
    if (id === 'CANON_Only_Head_Chair') {
      const seat = h * .40;
      for (const x of [-w * .37, w * .37]) for (const z of [-d * .37, d * .37]) {
        beam('leg', x, seat / 2, z, w * .13, seat, d * .13);
      }
      for (const x of [-w * .17, w * .17]) beam('seat-board', x, seat, 0, w * .49, .065, d, topSource);
      // Its existing back lies at the head of the table, across world X.
      for (const z of [-d * .38, d * .38]) beam('back-post', -w * .43, (h + seat) / 2, z, w * .14, h - seat, d * .14);
      for (const y of [h * .68, h - .045]) beam('back-rail', -w * .43, y, 0, w * .14, .09, d, topSource);
      for (const z of [-d * .20, 0, d * .20]) beam('back-slat', -w * .43, h * .80, z, w * .10, h * .27, d * .10, topSource);
      for (const z of [-d * .37, d * .37]) beam('stretcher', 0, seat * .40, z, w * .78, .045, d * .10);
    } else {
      const table = id === 'CANON_Long_Table', thickness = table ? .085 : .08, boards = table ? 4 : 2;
      for (let i = 0; i < boards; i++) beam('top-board', 0, h - thickness / 2, -d / 2 + (i + .5) * d / boards, w, thickness, d / boards - .006, topSource);
      const supportHeight = h - thickness, inset = w * .32;
      for (const x of [-inset, inset]) {
        for (const z of [-d * .32, d * .32]) beam('trestle-leg', x, supportHeight / 2, z, table ? .14 : .105, supportHeight, table ? .13 : .075);
        beam('trestle-foot', x, .045, 0, table ? .26 : .19, .09, d * .90);
        beam('trestle-cap', x, supportHeight - .04, 0, table ? .23 : .17, .08, d * .92);
      }
      beam('through-stretcher', 0, supportHeight * .35, 0, inset * 2 + .23, table ? .11 : .07, table ? .11 : .065);
      if (table) for (const z of [-d * .41, d * .41]) beam('apron', 0, supportHeight - .07, z, w * .91, .14, .07);
      for (const x of [-inset, inset]) beam('mortise-wedge', x, supportHeight * .35, .04, .055, table ? .17 : .12, table ? .15 : .075, topSource);
    }
    const sourceFor: Mesh[] = [];
    for (const [source, meshes] of buckets) {
      const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
      if (!merged) throw Error('No se pudo construir el mueble ' + id);
      merged.name = `finish:${id}:${source === topSource ? 'oak' : 'joinery'}`; pieces.push(merged); sourceFor.push(source);
    }
    bind(id, sources, pieces, sourceFor, 'dining-joinery');
  }
  function planter(source: Mesh) {
    // Preserve all trailing geometry below the trough lip, including the
    // current stem paths. Only the dense upper leaf spray is regrouped.
    const group = source.name.replace(/_R3_(Olive|Sage|Pine_Sun)$/, ''), soil = scene.getMeshByName(group + '_a1_earth-v6');
    // Every existing trough keeps its own elevation, including the lower stair.
    const lip = soil ? (soil.computeWorldMatrix(true), soil.getBoundingInfo().boundingBox.maximumWorld.y + .0075) : 18.60;
    const b = worldBounds([source]), p: number[] = [], indices: number[] = [], colors: number[] = [];
    const matrix = source.getWorldMatrix(), original = source.getVerticesData('position')!, originalIndices = source.getIndices()!;
    for (let i = 0; i < originalIndices.length; i += 3) {
      const v = [0, 1, 2].map(j => Vector3.TransformCoordinates(Vector3.FromArray(original, originalIndices[i + j]! * 3), matrix));
      if (v.some(v => v.y < lip)) { const n = p.length / 3; for (const q of v) { p.push(q.x, q.y, q.z); colors.push(1, 1, 1, 1); } indices.push(n, n + (matrix.determinant() < 0 ? 2 : 1), n + (matrix.determinant() < 0 ? 1 : 2)); }
    }
    const sage = /Sage/.test(source.name), highlight = /Pine_Sun/.test(source.name), clusters = highlight ? 5 : sage ? 2 : 3;
    for (let cluster = 0; cluster < clusters; cluster++) {
      const fraction = highlight ? (cluster + .5) / 5 : sage ? (.3 + cluster * .40) : (.15 + cluster * .35);
      const cx = b.min.x + b.size.x * fraction, cz = b.center.z + Math.sin(cluster * 2.1) * .08;
      for (let leaf = 0; leaf < (highlight ? 9 : 26); leaf++) {
        const angle = leaf * 2.39996 + cluster * .8, reach = .09 + .15 * (.5 + .5 * Math.sin(leaf * 3.7)), rise = .10 + .21 * (.5 + .5 * Math.cos(leaf * 1.7));
        const base = new Vector3(cx, lip + .025, cz), tip = new Vector3(cx + Math.cos(angle) * reach, Math.min(b.max.y, lip + rise), cz + Math.sin(angle) * reach);
        const mid = Vector3.Lerp(base, tip, .53), side = new Vector3(-Math.sin(angle) * (sage ? .045 : .032), 0, Math.cos(angle) * (sage ? .045 : .032));
        const vertices = [base, mid.add(side), tip, mid.subtract(side), mid.add(new Vector3(0, .035, 0)), mid.subtract(new Vector3(0, .012, 0))];
        const start = p.length / 3;
        for (const q of vertices) {
          p.push(Math.max(b.min.x, Math.min(b.max.x, q.x)), Math.max(b.min.y, Math.min(b.max.y, q.y)), Math.max(b.min.z, Math.min(b.max.z, q.z)));
          const tint = .87 + (leaf % 4) * .045; colors.push(tint, tint, tint * .98, 1);
        }
        for (const tri of [[0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0], [0, 1, 5], [1, 2, 5], [2, 3, 5], [3, 0, 5]]) indices.push(...tri.map(i => start + i));
      }
    }
    const candidate = new Mesh('finish:' + source.name, scene), data = new VertexData(), normals: number[] = [];
    VertexData.ComputeNormals(p, indices, normals); Object.assign(data, { positions: p, indices, normals, colors }); data.applyToMesh(candidate);
    bind(source.name, [source], [candidate], [source], 'grouped-herbs');
  }
  function ship(source: Mesh) {
    const b = source.getBoundingInfo().boundingBox, size = b.maximum.subtract(b.minimum), center = b.minimum.add(b.maximum).scale(.5);
    if (Math.min(size.x, size.y, size.z) < .018) return;
    const meshes: Mesh[] = [], boards = /c4-desk[^:]*:worktop(?:-rim)?:/.test(source.name) ? 3 : 1;
    for (let i = 0; i < boards; i++) {
      const candidate = chamferedTimber(scene, 'finish:' + source.name + ':' + i, size.x, size.y, size.z / boards - (boards > 1 ? .007 : 0), .012);
      candidate.parent = source.parent; candidate.position.copyFrom(source.position); candidate.rotation.copyFrom(source.rotation); candidate.rotationQuaternion = source.rotationQuaternion?.clone() ?? null; candidate.scaling.copyFrom(source.scaling);
      // Procedural prop boxes are centered at zero; keep every original pivot.
      candidate.bakeTransformIntoVertices(Matrix.Translation(center.x, center.y, center.z - size.z / 2 + (i + .5) * size.z / boards));
      worldSurfaceUV(candidate, 3.5); meshes.push(candidate);
    }
    bind(source.name, [source], meshes, meshes.map(() => source), 'ship-chamfers');
  }
  function refresh() {
    // Imported GLTF nodes exist before their owner fixes handedness, attaches
    // room metadata and completes the material/light library. Bake only after
    // that owner is ready; otherwise a leaf can be frozen on the opposite coast.
    if (disposed || !sourcesReady()) return;
    // Interactive props may be replaced after a state change. Release those
    // bindings with their owner instead of retaining old geometry references.
    for (let i = bindings.length - 1; i >= 0; i--) {
      const b = bindings[i]!;
      if (!b.sources.every(m => m.isDisposed())) continue;
      b.sources.forEach(m => seen.delete(m)); b.candidates.forEach(m => { if (!m.isDisposed()) m.dispose(false, false); });
      bindings.splice(i, 1); finished.delete(b.id); lastCount = -1; recount();
    }
    // Runtime state can hide rooms and LOD can swap source materials. Reuse
    // those owners; do not introduce another visibility or weather system.
    for (const b of bindings) for (let i = 0; i < b.candidates.length; i++) {
      const candidate = b.candidates[i]!, source = b.sourceFor[i]!;
      if (source.isDisposed()) { candidate.dispose(false, false); continue; }
      candidate.material = source.material; candidate.isVisible = source.isVisible;
      // Local occlusion works on the visible derivative. Its owner restores
      // the original opacity before each update; do not undo that fade here.
      if (candidate.metadata?.retreatOcclusionOpacity == null) candidate.visibility = source.visibility;
      candidate.setEnabled(active(b) && (source.parent?.isEnabled() ?? true));
    }
    if (!enabled || lastCount === scene.meshes.length) return;
    for (const id of sceneId === 'dragon-rest' ? diningNames : []) {
      if (finished.has(id)) continue;
      const sources = scene.meshes.filter((m): m is Mesh => m instanceof Mesh && m.isEnabled(false) && m.getTotalVertices() > 0 && (m.name === id || m.name.startsWith(id + '_primitive')));
      if (sources.length >= 2) dining(id, sources);
    }
    for (const m of [...scene.meshes]) {
      if (!(m instanceof Mesh) || seen.has(m) || !m.material || m.metadata?.objectFinishV1 || !m.isEnabled(false)) continue;
      if (sceneId === 'dragon-rest' && (sampleHerb(m.name) || scope === 'zones' && /^R3_(Upper_Planter|A1_Trailing_Herbs|Lower_Stair_Planter|Garden_Herbs)_\d+_R3_(Olive|Sage|Pine_Sun)$/.test(m.name))) planter(m);
      if (sceneId === 'dragon-rest' && scope === 'zones') {
        if (/^R3_Tree_.+_crown_R3_(Olive|Pine_Dark)$/.test(m.name)) bind(m.name, [m], [finishFoliage(m, 'crown')], [m], 'foliage-depth');
        if (/^R3_(Garden|Harbor|Expedition)_Meadow_R3_Grass(_Light)?$/.test(m.name)) bind(m.name, [m], [finishFoliage(m, 'meadow')], [m], 'grouped-meadow');
      }
      if (sceneId === 'wreck-ship' && (sampleShip(m.name) || scope === 'zones' && /^(c[1-9]-|wheel:)/.test(m.name)
        && m.getTotalIndices() === 36 && /:(worktop|worktop-rim|leg|table-apron|bed-frame|bed-frame-rim|upper-frame|upper-frame-rim|bunk-post|back|shelf|shelf-rim|upright|collapsed-shelf|seat|seat-rim|backrest|chair-stretcher|crate-body|crate-band|lid|lid-rim|open-lid|iron-chest|chest-lid|iron-end-brace|frame-left|frame-right|lintel|hinged-leaf|wooden-bar):/.test(m.name))) ship(m);
    }
    lastCount = scene.meshes.length;
  }
  function setEnabled(value: boolean) {
    enabled = value; stats.enabled = value;
    for (const b of bindings) { b.sources.forEach((m, i) => { if (!m.isDisposed()) m.setEnabled(active(b) ? false : b.enabled[i]!); }); b.candidates.forEach(m => { if (!m.isDisposed()) m.setEnabled(active(b)); }); }
    lastCount = -1; if (value) refresh();
  }
  function setScope(value: StormwreckFinishScope) { if (scope === value) return; scope = value; stats.scope = value; setEnabled(enabled); }
  const observer = scene.onBeforeRenderObservable.add(refresh);
  function dispose() { if (disposed) return; setEnabled(false); disposed = true; scene.onBeforeRenderObservable.remove(observer); for (const b of bindings) for (const m of b.candidates) m.dispose(false, false); }
  scene.onDisposeObservable.addOnce(dispose);
  return { stats, refresh, setEnabled, setScope, dispose, audit: () => bindings.map(b => ({ id: b.id, kind: b.kind, active: active(b), sources: b.sources.map(m => ({ name: m.name, material: m.material?.name, vertices: m.getTotalVertices(), indices: m.getTotalIndices(), matrix: m.getWorldMatrix().asArray() })), beforeBounds: worldBounds(b.sources), afterBounds: worldBounds(b.candidates.filter(m => !m.isDisposed())), meshes: b.candidates.map(m => m.name) })) };
}


/** One visual vocabulary for Sylvania. All geometry here is VTT_AMBIENCE. */
export const SYLVANIA_LAYERS = ['near', 'village', 'distant', 'panorama', 'atmosphere'] as const;
export type SylvaniaLayer = typeof SYLVANIA_LAYERS[number];
type ScenicPlacement = [number, number, number, number, number, number, number?];
type SylvaniaRgb = [number, number, number];
export const SYLVANIA_STYLE = {
  id: 'sylvania-evening', architecture: 'lime-plaster-oak-fieldstone-clay-tile',
  plaster: ['#c3ae90', '#ac9a82', '#b4a28d', '#bca38d'],
  roofs: ['#805c52', '#746f64', '#70645b', '#786047'],
  stone: '#b6ad94', wood: '#896d54', trim: '#433a3b', foliage: '#476a55',
  distance: '#ad9b8d', coldShadow: '#34455f', haze: '#d7bc9d',
  sky: [[-32, '#777e69'], [-2, '#ad9d87'], [12, '#e0b893'], [45, '#cfaa9b'], [100, '#90929f'], [240, '#707e98'], [540, '#707e98']] as const
};
export const sylvaniaSeed = (n: number) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
export function sylvaniaEveningView(view: any, enabled = true) {
  // The DM's selection (including automatic clock progression) remains authoritative.
  if (enabled && view.story?.d8EndingVisual === 'darkness' && (view.environment?.timeOfDay ?? 'auto') === 'auto') return { ...view, naturalLight: { phase: 'night', ambient: .08, direct: 0, warmth: 0 } };
  return view;
}
/** Warm low-angle sunlight and cool sky fill, not a yellow filter on every light. */
export function sylvaniaLightStyle(light: any) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const ambient = clamp(light?.ambient ?? .7), direct = clamp(light?.direct ?? .55), warmth = clamp(light?.warmth ?? .8);
  const phase = light?.phase ?? 'sunset', golden = phase === 'sunset', dawn = phase === 'dawn', night = phase === 'night';
  const mix = (a: SylvaniaRgb, b: SylvaniaRgb, t: number): SylvaniaRgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as SylvaniaRgb;
  const warm = golden ? Math.max(.78, warmth) : dawn ? warmth * .65 : 0;
  const key = mix([1, .97, .90], [1, .72, .34], warm);
  const fill = mix([.84, .92, 1], [.63, .72, .92], night ? .9 : golden ? .8 : dawn ? .55 : .1);
  const ground = fill.map(v => v * .16) as SylvaniaRgb;
  const daylight = ['#789077', '#b6c9c8', '#bad4de', '#9fc3da', '#89b3d1', '#729cbc', '#729cbc'];
  const dawnSky = ['#535b61', '#998d94', '#d3aca0', '#b6a6b6', '#919bb5', '#7188a7', '#7188a7'];
  const nightSky = ['#182128', '#202b3a', '#26364a', '#223147', '#1d2a40', '#18263c', '#18263c'];
  const palette = golden ? SYLVANIA_STYLE.sky.map(band => band[1]) : dawn ? dawnSky : night ? nightSky : daylight;
  const twilight = night ? clamp((warmth - .15) * .5) : 0;
  const sky = palette.map((hex, row) => mix(rgb(hex), rgb(SYLVANIA_STYLE.sky[row]![1]), twilight).map(v => v * (night ? 1 : .65 + .35 * ambient))) as [SylvaniaRgb, SylvaniaRgb, SylvaniaRgb, SylvaniaRgb, SylvaniaRgb, SylvaniaRgb, SylvaniaRgb];
  return { key, fill, ground, sky, sunElevation: golden ? 15 : dawn ? 12 : 55,
    keyIntensity: (golden || dawn ? Math.sqrt(direct) : direct) * (.8 + .6 * ambient),
    fillIntensity: (.2 + .9 * ambient) * (golden ? .7 : 1), sunlight: golden ? Math.sqrt(direct) : direct };
}
/** Recolour the existing panorama only on light-profile changes; no new meshes. */
export function updateSylvaniaPanorama(B: any, mesh: any, style: ReturnType<typeof sylvaniaLightStyle>) {
  if (!mesh) return;
  const colors: number[] = [];
  for (const color of style.sky) for (let i = 0; i <= 80; i++) colors.push(...color, 1);
  mesh.updateVerticesData('color', colors); mesh.material.emissiveColor = B.Color3.White();
}
export function sylvaniaDistanceTint(B: any, ambient: number) {
  return B.Color3.Lerp(B.Color3.FromHexString(SYLVANIA_STYLE.coldShadow), B.Color3.White(), Math.min(1, ambient * 1.43));
}
/** Curved world-space sky, covering the permitted front orbit, not a 360° set. */
export function createSylvaniaPanorama(B: any, scene: any, track: any, name: string) {
  const mesh = new B.Mesh(name, scene), data = new B.VertexData();
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], normals: number[] = [], segments = 80;
  for (const [y, hex] of SYLVANIA_STYLE.sky) for (let i = 0; i <= segments; i++) {
    const a = (i / segments * 200 - 100) * Math.PI / 180, c = B.Color3.FromHexString(hex);
    positions.push(Math.sin(a) * 370, y, -Math.cos(a) * 370); colors.push(c.r, c.g, c.b, 1);
  }
  for (let row = 0; row < SYLVANIA_STYLE.sky.length - 1; row++) for (let i = 0; i < segments; i++) {
    const a = row * 81 + i, b = a + 81; indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  B.VertexData.ComputeNormals(positions, indices, normals);
  Object.assign(data, { positions, colors, indices, normals }); data.applyToMesh(mesh, true);
  const material = track(new B.StandardMaterial('sylvania-continuous-sky', scene));
  material.disableLighting = true; material.emissiveColor = B.Color3.White(); material.diffuseColor = B.Color3.White();
  material.fogEnabled = false; material.backFaceCulling = false;
  material.metadata = { d8Authored: true, d8Backdrop: true, sylvaniaStyle: SYLVANIA_STYLE.id };
  mesh.material = material; mesh.receiveShadows = false; mesh.metadata = { radialSeparation: 369, arcDegrees: 200 };
  return mesh;
}

/** Closed gables also on the instanced, low-detail skyline houses. */
export function createSylvaniaGabledBody(B: any, scene: any, name: string, material: any, baseY = 0) {
  const body = B.MeshBuilder.CreateBox(name, { size: 1 }, scene), p = body.getVerticesData('position');
  for (let i = 1; i < p.length; i += 3) p[i] += baseY + .5; body.setVerticesData('position', p); body.material = material;
  const ends = new B.Mesh('sylvania-gable-prototype', scene), data = new B.VertexData(), y = baseY + 1;
  const positions = [-.5, y, -.5, .5, y, -.5, 0, y + .235, -.5, -.5, y, .5, .5, y, .5, 0, y + .235, .5], indices = [0, 2, 1, 3, 4, 5], normals: number[] = [];
  B.VertexData.ComputeNormals(positions, indices, normals); Object.assign(data, { positions, indices, normals, uvs: [0, 0, 1, 0, .5, 1, 0, 0, 1, 0, .5, 1] }); data.applyToMesh(ends); ends.material = material;
  const mesh = B.Mesh.MergeMeshes([body, ends], true, true, undefined, false, false); mesh.name = name; mesh.metadata = { closedGables: true }; return mesh;
}

/** Uses the Temple's builders, layer ownership and spatial batching conventions. */
export function createSylvaniaEnvironment(options: any) {
  const { B, scene, parent, track, materials, builders, mapId, size, bounds } = options;
  const config = options.config ?? {}, phase = config.phase ?? 5, roots: Record<string, any> = {}, meshes: any[] = [], distantMaterials: any[] = [];
  const protectedBounds: [number, number, number, number] = [Math.min(-size[0] / 2, bounds[0]), Math.max(size[0] / 2, bounds[1]), Math.min(-size[1] / 2, bounds[2]), Math.max(size[1] / 2, bounds[3] + .75)];
  const clothMotion: any[] = []; let wind = .2;
  let suspendedSnow: any = null, celebration: any = null;
  for (const id of SYLVANIA_LAYERS) {
    const root = new B.TransformNode(`sylvania-${mapId}-${id}`, scene); root.parent = parent;
    root.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, environmentLayer: id }; root.setEnabled(config.layers?.[id] !== false); roots[id] = root;
  }
  const own = (mesh: any, layer: SylvaniaLayer) => {
    mesh.parent = roots[layer]; mesh.isPickable = false; mesh.checkCollisions = false;
    mesh.metadata = { ...mesh.metadata, content: 'VTT_AMBIENCE', decorativeOnly: true, environmentLayer: layer, tokenOccluder: false, sylvaniaStyle: SYLVANIA_STYLE.id };
    meshes.push(mesh); return mesh;
  };
  const capture = (layer: SylvaniaLayer, build: () => void) => {
    const before = new Set(scene.meshes); build(); const top = new Set<any>();
    for (const mesh of scene.meshes.filter((m: any) => !before.has(m))) {
      let node = mesh; while (node.parent && node.parent !== parent && !String(node.parent.name).startsWith('LAYER_')) node = node.parent;
      top.add(node); mesh.isPickable = false; mesh.checkCollisions = false;
      mesh.metadata = { ...mesh.metadata, content: 'VTT_AMBIENCE', decorativeOnly: true, environmentLayer: layer, tokenOccluder: false, sylvaniaStyle: SYLVANIA_STYLE.id }; meshes.push(mesh);
    }
    for (const node of top) node.parent = roots[layer];
  };
  const textured = (name: string, source: any, hex: string, unlit = false) => {
    const m = track(new B.StandardMaterial(`sylvania-${mapId}-${name}`, scene));
    m.diffuseTexture = source?.diffuseTexture ?? null; m.bumpTexture = source?.bumpTexture ?? null;
    m.diffuseColor = B.Color3.FromHexString(hex); m.emissiveColor = m.diffuseColor.scale(unlit ? 1 : .025); m.specularColor = B.Color3.Black();
    m.maxSimultaneousLights = 4; m.disableLighting = unlit; m.fogEnabled = !unlit;
    m.metadata = { d8Authored: true, d8Backdrop: unlit, sylvaniaStyle: SYLVANIA_STYLE.id };
    if (unlit) distantMaterials.push({ material: m, color: m.diffuseColor.clone() }); return m;
  };
  const winter = mapId === 'garden';
  const meadow = textured('meadow', winter ? materials.ground : materials.meadow, winter ? '#d6e1e5' : '#71805d'), fieldstone = textured('fieldstone', materials.stone, SYLVANIA_STYLE.stone);
  const leaf = textured('leaf', materials.foliage, SYLVANIA_STYLE.foliage);
  const relief = (x: number, z: number) => {
    const edge = Math.max(0, protectedBounds[0] - x, x - protectedBounds[1], protectedBounds[2] - z);
    return z < protectedBounds[2] ? Math.min(1, edge / 22) * (.06 * Math.sin(x * .17) + .055 * Math.sin(z * .13)) : 0;
  };
  const terrain = (name: string, x0: number, z0: number, w: number, d: number, layer: SylvaniaLayer) => {
    const mesh = own(B.MeshBuilder.CreateGround(`sylvania-${name}`, { width: w, height: d, subdivisions: 12 }, scene), layer);
    mesh.position.set(x0 + w / 2, -.012, z0 + d / 2); mesh.material = materials.ground; mesh.metadata.continuousGround = true;
    const pos = mesh.getVerticesData('position'), uv = mesh.getVerticesData('uv');
    for (let i = 0; i < pos.length; i += 3) {
      const x = mesh.position.x + pos[i], z = mesh.position.z + pos[i + 2];
      // No height change at a tactical edge, and no foreground mound in sightlines.
      pos[i + 1] = relief(x, z);
      uv[i / 3 * 2] = .5 + x / size[0]; uv[i / 3 * 2 + 1] = .5 + z / size[1];
    }
    mesh.setVerticesData('position', pos); mesh.setVerticesData('uv', uv); const normals: number[] = [];
    B.VertexData.ComputeNormals(pos, mesh.getIndices(), normals); mesh.setVerticesData('normal', normals); return mesh;
  };
  const blend = (x: number, z: number, w: number, d: number, material: any) => {
    const mesh = own(B.MeshBuilder.CreateGround('sylvania-soft-terrain-transition', { width: w, height: d, subdivisions: 8 }, scene), 'near');
    mesh.position.set(x, -.006, z); mesh.material = material; const colors: number[] = [], positions = mesh.getVerticesData('position');
    for (let i = 0; i < positions.length; i += 3) positions[i + 1] = relief(x + positions[i], z + positions[i + 2]);
    mesh.setVerticesData('position', positions);
    for (let row = 0; row <= 8; row++) for (let col = 0; col <= 8; col++) {
      const edge = Math.min(row, col, 8 - row, 8 - col) / 2; colors.push(1, 1, 1, Math.min(1, edge) * .54);
    }
    mesh.setVerticesData('color', colors); mesh.hasVertexAlpha = true; mesh.metadata.softTransition = true; return mesh;
  };
  const instances = (mesh: any, placements: ScenicPlacement[], layer: SylvaniaLayer = 'distant') => {
    own(mesh, layer); const matrices = new Float32Array(placements.length * 16);
    for (const [i, [x, y, z, sx, sy, sz, angle = 0]] of placements.entries()) {
      const c = Math.cos(angle), s = Math.sin(angle);
      matrices.set([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1], i * 16);
    }
    mesh.thinInstanceSetBuffer('matrix', matrices, 16, true); mesh.thinInstanceRefreshBoundingInfo(); mesh.metadata.instanceCount = placements.length; return mesh;
  };
  if (phase >= 1) {
    const [left, right, back, front] = protectedBounds;
    terrain('back-verge', -115, -115, 230, back + 115, 'near');
    terrain('west-verge', -115, back, left + 115, front - back, 'near');
    terrain('east-verge', right, back, 115 - right, front - back, 'near');
    terrain('front-continuation', -240, front, 480, 370 - front, 'near');
    for (const side of [-1, 1]) { blend(side * 48, -34, 29, 26, meadow); blend(side * 29, -49, 22, 22, meadow); }
    capture('near', () => builders.road(`${mapId}-rural-lane`, [[-40, -29], [-18, -32], [16, -33], [42, -29]], 3));
    for (let i = 0; i < 18; i++) {
      const x = (i % 2 ? -1 : 1) * (25 + sylvaniaSeed(i + 92) * 28), z = -27 - sylvaniaSeed(i + 81) * 32;
      const shrub = own(B.MeshBuilder.CreateSphere('sylvania-bush-cluster', { diameter: 1, segments: 5 }, scene), 'near');
      shrub.position.set(x, .32, z); shrub.scaling.set(1.7, .75, 1.3); shrub.material = leaf;
      const stone = own(B.MeshBuilder.CreateSphere('sylvania-roadside-stone', { diameter: 1, segments: 4 }, scene), 'near');
      stone.position.set(x + .95, .15, z + .7); stone.scaling.set(.57, .28, .4); stone.material = fieldstone;
    }
  }
  if (phase >= 2) capture('village', () => {
    const houses: Array<[number, number, number]> = winter ? [[0, -43, -53], [1, 42, -58]] : mapId === 'dinner' ? [[0, -48, -64], [1, 49, -69]] : [[0, -34, -39], [1, -17, -45], [2, 20, -44], [3, 38, -40]];
    for (const [i, x, z] of houses) builders.house(x, z, 6.5 + i % 2, 6, 4.5 + i % 2 * .3, i, Math.PI + (i % 2 ? .08 : -.06), true);
    builders.road('sylvania-neighbourhood-lane', [[-45, -35], [-30, -52], [0, -56], [32, -51], [46, -35]], 2.8);
    if (mapId === 'market') {
      for (const [i, x] of [-37, -23, -6, 13, 34].entries()) {
        builders.stall(x, -28 - i % 2 * 2, i);
        for (const dx of [-.8, 0, .8]) builders.prop('scenic-merchandise', { width: .45, height: .22, depth: .55 }, [x + dx, .84, -28 - i % 2 * 2], materials.wood);
      }
    }
  });
  if (winter && phase >= 2) {
    const thorn = textured('thorn-bark', materials.wood, '#42382f'), rose = textured('scenic-rose', null, '#9c2534');
    for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
      const x = side * (24 + i % 3 * 3), z = -17 - i * 3.7;
      capture('village', () => {
        builders.prop('garden-fence-post', { width: .16, height: 1.15, depth: .16 }, [side * 34, .56, z], materials.wood);
        builders.prop('garden-fence-rail', { width: .1, height: .11, depth: 3.8 }, [side * 34, .7, z - 1.8], materials.wood);
      });
      for (let stem = 0; stem < 3; stem++) {
        const branch = own(B.MeshBuilder.CreateCylinder('sylvania-scenic-thorn', { height: 1.2, diameterTop: .03, diameterBottom: .1, tessellation: 5 }, scene), 'village');
        branch.position.set(x + stem * .25, .52, z); branch.rotation.z = (stem - 1) * .36; branch.material = thorn;
        const flower = own(B.MeshBuilder.CreateSphere('sylvania-scenic-rose', { diameter: .23, segments: 5 }, scene), 'village');
        flower.position.set(x + stem * .25 + (stem - 1) * -.21, 1.05, z); flower.material = rose;
      }
    }
  }
  if (mapId === 'market') for (const mesh of meshes.filter(m => m.name.includes('stall-striped-canopy'))) {
    mesh.metadata.d8Animated = true; clothMotion.push({ mesh, rotation: mesh.rotation.x });
  }
  if (phase >= 3) {
    terrain('far-land', -240, -245, 480, 130.1, 'distant');
    const placements = Array.from({ length: mapId === 'dinner' ? 8 : 18 }, (_, i): ScenicPlacement => [-105 + i % 9 * 26 + sylvaniaSeed(i) * 6, 2.1, -91 - Math.floor(i / 9) * 35 - sylvaniaSeed(i + 11) * 12, 4.8 + sylvaniaSeed(i + 9) * 2, 4.2, 5.5, sylvaniaSeed(i + 75) * .16 - .08]);
    const walls = createSylvaniaGabledBody(B, scene, 'sylvania-far-houses', textured('far-plaster', materials.plaster, SYLVANIA_STYLE.distance, true), -.5); instances(walls, placements);
    const parts = [-1, 1].map(side => { const m = B.MeshBuilder.CreateBox('sylvania-roof-prototype', { width: .6, height: .05, depth: 1.12 }, scene); m.position.set(side * .25, .61, 0); m.rotation.z = -side * .4; m.material = materials.roof; return m; });
    const roofs = B.Mesh.MergeMeshes(parts, true, true, undefined, false, false); roofs.name = 'sylvania-far-roofs'; roofs.material = textured('far-tile', materials.roof, '#85716c', true); instances(roofs, placements);
    const trees = Array.from({ length: mapId === 'dinner' ? 22 : 44 }, (_, i): ScenicPlacement => [-160 + sylvaniaSeed(i + 47) * 320, 0, -72 - sylvaniaSeed(i + 683) * 113, 2.4 + sylvaniaSeed(i + 31) * 2.4, 4.8 + sylvaniaSeed(i + 81) * 3, 3.2]);
    const trunk = B.MeshBuilder.CreateCylinder('sylvania-far-trunks', { height: 1, diameter: .09, tessellation: 5 }, scene);
    const pos = trunk.getVerticesData('position'); for (let i = 1; i < pos.length; i += 3) pos[i] += .5; trunk.setVerticesData('position', pos);
    trunk.material = textured('far-oak', materials.wood, '#716b64', true); instances(trunk, trees);
    const crown = B.MeshBuilder.CreateSphere('sylvania-far-crowns', { diameter: 1, segments: 5 }, scene), cp = crown.getVerticesData('position');
    for (let i = 1; i < cp.length; i += 3) cp[i] += .75; crown.setVerticesData('position', cp); crown.material = textured('far-leaf', materials.foliage, '#687669', true); instances(crown, trees);
    if (winter) {
      const cap = B.MeshBuilder.CreateSphere('sylvania-far-winter-crowns', { diameter: 1, segments: 5 }, scene);
      cap.material = textured('far-snow', materials.ground, '#c5c9c4', true);
      instances(cap, trees.map(([x, , z, sx, sy, sz]): ScenicPlacement => [x, sy * 1.07, z, sx * .93, sy * .18, sz * .93]));
    }
    const hills = B.MeshBuilder.CreateSphere('sylvania-soft-hills', { diameter: 1, segments: 6 }, scene); hills.material = textured('far-field', materials.meadow, '#878e79', true);
    instances(hills, Array.from({ length: 8 }, (_, i): ScenicPlacement => [-175 + i * 50, -1.5, -197 - sylvaniaSeed(i) * 30, 52, 6 + sylvaniaSeed(i + 88) * 3, 35]));
    if (mapId === 'market') {
      const people = Array.from({ length: 18 }, (_, i): ScenicPlacement => [-39 + i * 4.3, 0, -35 - sylvaniaSeed(i + 197) * 4, .85 + sylvaniaSeed(i + 39) * .3, .95 + sylvaniaSeed(i + 9) * .25, 1]);
      const body = B.MeshBuilder.CreateCylinder('sylvania-distant-festival-silhouettes', { height: 1.1, diameterTop: .24, diameterBottom: .4, tessellation: 5 }, scene), pos = body.getVerticesData('position');
      for (let i = 1; i < pos.length; i += 3) pos[i] += .55; body.setVerticesData('position', pos); body.material = textured('crowd-cloth', materials.wood, '#70615f', true); instances(body, people);
      const head = B.MeshBuilder.CreateSphere('sylvania-distant-festival-heads', { diameter: .25, segments: 4 }, scene), hp = head.getVerticesData('position');
      for (let i = 1; i < hp.length; i += 3) hp[i] += 1.2; head.setVerticesData('position', hp); head.material = textured('crowd-head', null, '#a28e7d', true); instances(head, people);
    }
  }
  let sky: any = null, haze: any = null;
  if (phase >= 4) sky = own(createSylvaniaPanorama(B, scene, track, 'sylvania-curved-panorama'), 'panorama');
  if (phase >= 5) {
    haze = textured('distance-haze', null, SYLVANIA_STYLE.haze, true); haze.alpha = .1; haze.backFaceCulling = false;
    const mist = own(new B.Mesh('sylvania-distance-haze', scene), 'atmosphere'), data = new B.VertexData();
    const positions: number[] = [], colors: number[] = [], indices: number[] = [], normals: number[] = [];
    for (const [row, y] of [-.2, 1.8, 8].entries()) for (let i = 0; i <= 48; i++) {
      const a = (i / 48 * 200 - 100) * Math.PI / 180; positions.push(Math.sin(a) * 205, y, -Math.cos(a) * 205); colors.push(1, 1, 1, row === 1 ? 1 : 0);
    }
    for (let row = 0; row < 2; row++) for (let i = 0; i < 48; i++) { const a = row * 49 + i, b = a + 49; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    B.VertexData.ComputeNormals(positions, indices, normals); Object.assign(data, { positions, colors, indices, normals }); data.applyToMesh(mist);
    mist.material = haze; mist.hasVertexAlpha = true; mist.metadata.radialSeparation = 204;
    const shadow = textured('house-contact', null, '#293445', true); shadow.alpha = .19; shadow.backFaceCulling = false;
    for (const node of roots.village.getChildTransformNodes().filter((n: any) => n.metadata?.roofEnvelope)) {
      const roof = node.metadata.roofEnvelope, m = own(B.MeshBuilder.CreateGround('sylvania-house-contact', { width: roof.width + 2, height: roof.depth + 2, subdivisions: 2 }, scene), 'village');
      m.position.set(node.position.x + .3, -.005 + relief(node.position.x, node.position.z), node.position.z + .1); m.rotation.y = node.rotation.y; m.material = shadow;
      const colors: number[] = []; for (let i = 0; i < 9; i++) colors.push(1, 1, 1, i === 4 ? 1 : 0); m.setVerticesData('color', colors); m.hasVertexAlpha = true;
    }
    if (mapId === 'dinner') {
      const snow = textured('suspended-snow', null, '#ffe5bb', true); snow.alpha = .32;
      suspendedSnow = B.MeshBuilder.CreateSphere('sylvania-dinner-suspended-crystals', { diameter: .045, segments: 4 }, scene); suspendedSnow.material = snow;
      instances(suspendedSnow, Array.from({ length: 24 }, (_, i): ScenicPlacement => [-5 + sylvaniaSeed(i + 920) * 10, 6.2 + sylvaniaSeed(i + 173) * 1.7, -3 + sylvaniaSeed(i + 275) * 8, 1, 1.4, 1]), 'atmosphere');
      suspendedSnow.metadata.atmosphereParticle = true;
      const candle = textured('celebration-glow', null, '#ffc46e', true); candle.alpha = .28;
      celebration = B.MeshBuilder.CreateSphere('sylvania-dinner-celebration-glow', { diameter: .055, segments: 4 }, scene); celebration.material = candle;
      instances(celebration, Array.from({ length: 64 }, (_, i): ScenicPlacement => [(i % 2 ? -1 : 1) * (8.5 + sylvaniaSeed(i) * 1.8), .7 + sylvaniaSeed(i + 36) * 1.3, -6 + sylvaniaSeed(i + 185) * 13, 1, 2, 1]), 'atmosphere');
      celebration.metadata.atmosphereParticle = true; celebration.metadata.finalExclusive = 'celebration'; celebration.setEnabled(false);
    }
  }
  let lastAtmosphere = '';
  return {
    roots, meshes, protectedBounds,
    setLayer(id: SylvaniaLayer, enabled: boolean) { if (!roots[id]) throw new Error(`Unknown Sylvania layer: ${id}`); roots[id].setEnabled(enabled); },
    setGroundMaterial(material: any) { if (material) for (const mesh of meshes) if (!mesh.isDisposed() && mesh.metadata.continuousGround) mesh.material = material; },
    setGroundSurface(source: any) {
      if (!source?.material) return; this.setGroundMaterial(source.material);
      source.computeWorldMatrix(true); const p = source.getVerticesData('position'), uv = source.getVerticesData('uv'), normals = source.getVerticesData('normal'); if (!p || !uv) return;
      const samples: any[] = [];
      for (let i = 0; i < p.length; i += 3) {
        // Some authored floors are slabs: sample their top face, not a side
        // whose UVs deliberately repeat differently from the walkable surface.
        if (normals && normals[i + 1] < .5) continue;
        const point = B.Vector3.TransformCoordinates(new B.Vector3(p[i], p[i + 1], p[i + 2]), source.getWorldMatrix()), sample = { x: point.x, z: point.z, u: uv[i / 3 * 2], v: uv[i / 3 * 2 + 1] };
        if (!samples.length || samples.length === 1 && Math.hypot(sample.x - samples[0].x, sample.z - samples[0].z) > .001 || samples.length === 2 && Math.abs((samples[1].x - samples[0].x) * (sample.z - samples[0].z) - (samples[1].z - samples[0].z) * (sample.x - samples[0].x)) > .001) samples.push(sample);
        if (samples.length === 3) break;
      }
      if (samples.length !== 3) return;
      const [a, b, c] = samples, dx = b.x - a.x, dz = b.z - a.z, ex = c.x - a.x, ez = c.z - a.z, det = dx * ez - dz * ex;
      const coefficient = (key: string) => [((b[key] - a[key]) * ez - (c[key] - a[key]) * dz) / det, (dx * (c[key] - a[key]) - ex * (b[key] - a[key])) / det] as const;
      const u = coefficient('u'), v = coefficient('v');
      for (const mesh of meshes.filter(m => !m.isDisposed() && m.metadata.continuousGround)) {
        mesh.computeWorldMatrix(true); const pos = mesh.getVerticesData('position'), coordinates = mesh.getVerticesData('uv');
        for (let i = 0; i < pos.length; i += 3) { const q = B.Vector3.TransformCoordinates(new B.Vector3(pos[i], pos[i + 1], pos[i + 2]), mesh.getWorldMatrix()); coordinates[i / 3 * 2] = a.u + (q.x - a.x) * u[0] + (q.z - a.z) * u[1]; coordinates[i / 3 * 2 + 1] = a.v + (q.x - a.x) * v[0] + (q.z - a.z) * v[1]; }
        mesh.setVerticesData('uv', coordinates); mesh.metadata.groundUvSource = source.name;
      }
    },
    adjustView(view: any) {
      wind = view.environment?.windIntensity ?? .2;
      if (suspendedSnow) suspendedSnow.setEnabled(!view.story?.d8TimeLoopBroken);
      if (celebration) celebration.setEnabled(view.story?.d8EndingVisual === 'celebration');
      return sylvaniaEveningView(view, phase >= 5 && roots.atmosphere.isEnabled());
    },
    updateMotion(time: number) { for (const [i, item] of clothMotion.entries()) item.mesh.rotation.x = item.rotation + Math.sin(time * .7 + i) * .014 * wind; },
    updateAtmosphere(light: any, climate: any) {
      const ambient = light?.ambient ?? .7, fog = climate?.fogDensity ?? 0, key = `${light?.phase}:${ambient.toFixed(2)}:${(light?.warmth ?? .8).toFixed(2)}:${fog.toFixed(2)}`;
      if (key === lastAtmosphere) return; lastAtmosphere = key; const tint = sylvaniaDistanceTint(B, ambient);
      const style = sylvaniaLightStyle(light); updateSylvaniaPanorama(B, sky, style);
      for (const item of distantMaterials) { item.material.emissiveColor = item.color.multiply(tint); item.material.diffuseColor = item.color.multiply(tint); }
      if (haze) { haze.emissiveColor = new B.Color3(...style.sky[2]); haze.alpha = .08 + Math.min(.12, fog * .12); }
    },
    optimize() {
      const groups = new Map<string, any[]>();
      for (const mesh of meshes.filter(m => !m.isDisposed())) {
        if (!mesh.material || mesh.metadata.d8Animated || mesh.thinInstanceCount || mesh.hasVertexAlpha || mesh.metadata.continuousGround || mesh.metadata.radialSeparation) continue;
        mesh.computeWorldMatrix(true); const p = mesh.getBoundingInfo().boundingBox.centerWorld, key = `${mesh.metadata.environmentLayer}:${mesh.material.uniqueId}:${Math.floor(p.x / 48)}:${Math.floor(p.z / 48)}`;
        const group = groups.get(key) ?? []; group.push(mesh); groups.set(key, group);
      }
      for (const group of groups.values()) if (group.length > 1) {
        const metadata = { ...group[0].metadata, batchedScenicParts: group.length }, merged = B.Mesh.MergeMeshes(group, true, true, undefined, false, false);
        if (merged) { merged.name = `sylvania-batch-${metadata.environmentLayer}-${merged.uniqueId}`; own(merged, metadata.environmentLayer); merged.metadata = metadata; }
      }
    },
    get diagnostics() { return { style: SYLVANIA_STYLE.id, architecture: SYLVANIA_STYLE.architecture, map: mapId, phase, layers: Object.fromEntries(SYLVANIA_LAYERS.map(id => [id, roots[id].isEnabled()])), meshes: meshes.filter(m => !m.isDisposed()).length }; }
  };
}

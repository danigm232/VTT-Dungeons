/** Independent, decorative-only Sylvania layers. No navigation or encounter data. */
import { createSylvaniaPanorama, createSylvaniaGabledBody, sylvaniaEveningView, sylvaniaDistanceTint, sylvaniaLightStyle, updateSylvaniaPanorama, SYLVANIA_STYLE } from './sylvania-environment';
export const TEMPLE_ENVIRONMENT_LAYERS = ['near', 'village', 'distant', 'panorama', 'atmosphere'] as const;
export type TempleEnvironmentLayer = typeof TEMPLE_ENVIRONMENT_LAYERS[number];
type ScenicPlacement = [number, number, number, number, number, number, number?];
export const templeScenicSeed = (n: number) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
/** Decorative presentation respects the DM's time controls and the game clock. */
export function templeEnvironmentLight(view: any, enabled = true) {
  return sylvaniaEveningView(view, enabled);
}

export function createTempleEnvironment(options: any) {
  const { B, scene, parent, materials, builders, track } = options;
  const config = options.config ?? {}, phase = config.phase ?? 5;
  const roots: Record<string, any> = {}, meshes: any[] = [];
  const distantMaterials: any[] = [];
  for (const id of TEMPLE_ENVIRONMENT_LAYERS) {
    const node = new B.TransformNode(`temple-environment-${id}`, scene);
    node.parent = parent; node.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, environmentLayer: id };
    node.setEnabled(config.layers?.[id] !== false); roots[id] = node;
  }
  const own = (mesh: any, layer: TempleEnvironmentLayer) => {
    mesh.parent = roots[layer]; mesh.isPickable = false; mesh.checkCollisions = false;
    mesh.metadata = { ...mesh.metadata, content: 'VTT_AMBIENCE', decorativeOnly: true, environmentLayer: layer, tokenOccluder: false };
    meshes.push(mesh); return mesh;
  };
  const capture = (layer: TempleEnvironmentLayer, build: () => void) => {
    const before = new Set(scene.meshes); build();
    const added = scene.meshes.filter((m: any) => !before.has(m)), topNodes = new Set<any>();
    for (const mesh of added) {
      // Keep the authored house's local coordinates: reparent its root, not each panel.
      let node = mesh; while (node.parent && node.parent !== parent && !String(node.parent.name).startsWith('LAYER_')) node = node.parent;
      topNodes.add(node); mesh.isPickable = false; mesh.checkCollisions = false;
      mesh.metadata = { ...mesh.metadata, content: 'VTT_AMBIENCE', decorativeOnly: true, environmentLayer: layer, tokenOccluder: false };
      meshes.push(mesh);
    }
    for (const node of topNodes) node.parent = roots[layer];
  };
  const sculpt = (name: string, x0: number, z0: number, width: number, depth: number, layer: TempleEnvironmentLayer) => {
    const mesh = own(B.MeshBuilder.CreateGround(name, { width, height: depth, subdivisions: 18 }, scene), layer);
    mesh.position.set(x0 + width / 2, -.018, z0 + depth / 2); mesh.material = materials.ground; mesh.receiveShadows = true; mesh.metadata.continuousGround = true;
    const positions = mesh.getVerticesData('position'), uv = mesh.getVerticesData('uv');
    for (let i = 0; i < positions.length; i += 3) {
      const x = mesh.position.x + positions[i], z = mesh.position.z + positions[i + 2];
      // Zero height at the board/old causeway; shallow relief only outside it.
      const edge = Math.max(0, Math.abs(x) - 26.25, -33.75 - z, z - 62);
      const blend = Math.min(1, edge / 14);
      positions[i + 1] = blend * (.10 * Math.sin(x * .13) + .09 * Math.sin(z * .17));
      uv[i / 3 * 2] = .5 + x / 52.5; uv[i / 3 * 2 + 1] = .5 + z / 67.5;
    }
    mesh.setVerticesData('position', positions); mesh.setVerticesData('uv', uv);
    const normals: number[] = []; B.VertexData.ComputeNormals(positions, mesh.getIndices(), normals); mesh.setVerticesData('normal', normals);
    return mesh;
  };
  if (phase >= 1) {
    // A back apron and two verges meet the existing island; none covers a playable cell.
    sculpt('temple-environment-back-verge', -85, -108, 170, 74.25, 'near');
    sculpt('temple-environment-west-verge', -85, -33.75, 58.75, 47, 'near');
    sculpt('temple-environment-east-verge', 26.25, -33.75, 58.75, 47, 'near');
    // Continue the two already-authored lanes beyond the extended tactical boundary.
    sculpt('temple-environment-causeway-tail', -19, 61.9, 38, 41, 'near');
    capture('near', () => {
      builders.road('sylvania-west-continuation', [[-7, 58], [-11, 76], [-18, 96]], 2.45);
      builders.road('sylvania-east-continuation', [[7, 58], [11, 76], [18, 96]], 2.45);
      builders.road('sylvania-back-lane', [[-40, -39], [0, -42], [40, -39]], 3.2);
    });
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? -1 : 1, x = side * (29 + templeScenicSeed(i + 71) * 20), z = -31 - templeScenicSeed(i + 48) * 36;
      const bush = own(B.MeshBuilder.CreateSphere('temple-environment-bush', { diameter: 1, segments: 5 }, scene), 'near');
      bush.position.set(x, .30, z); bush.scaling.set(1.1 + templeScenicSeed(i) * .8, .65, .95); bush.material = materials.foliage; bush.receiveShadows = true;
      const rock = own(B.MeshBuilder.CreateSphere('temple-environment-fieldstone', { diameter: 1, segments: 4 }, scene), 'near');
      rock.position.set(x + side * 1.2, .11, z + .8); rock.scaling.set(.48, .25, .39); rock.material = materials.stone; rock.receiveShadows = true;
    }
  }
  if (phase >= 2) {
    // Two small neighbourhoods flank a lane behind the temple, not across its approach.
    const houses: Array<[number, number, number, number, number, number, number]> = [
      [-37, -49, 7.2, 6.1, 4.8, 0, .08], [-23, -52, 8.0, 6.8, 5.2, 1, -.07],
      [-9, -56, 6.4, 6.2, 4.2, 2, .03], [13, -51, 8.3, 7.0, 5.0, 3, -.08],
      [30, -53, 7.1, 6.3, 4.6, 0, .10], [47, -60, 6.6, 6.2, 4.2, 1, -.10],
      [-31, -75, 8.1, 6.8, 5.6, 2, .04], [22, -78, 7.4, 6.8, 4.9, 3, -.06]
    ];
    capture('village', () => {
      for (const [x, z, w, d, h, variant, rotation] of houses) builders.house(x, z, w, d, h, variant, Math.PI + rotation, true);
      builders.road('sylvania-neighbourhood-lane', [[-48, -41], [-38, -63], [-5, -68], [35, -68], [50, -43]], 3.1);
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const x = side * (17 + i * 2.1), z = -61.8;
        builders.prop('sylvania-fence-post', { width: .14, height: 1.05, depth: .14 }, [x, .50, z], materials.wood);
        if (i < 5) for (const y of [.32, .77]) builders.prop('sylvania-fence-rail', { width: 2.12, height: .10, depth: .10 }, [x + side * 1.05, y, z], materials.wood);
      }
    });
  }
  const tinted = (source: any, name: string, hex: string) => {
    const material = track(new B.StandardMaterial(name, scene)); material.diffuseTexture = source.diffuseTexture; material.bumpTexture = source.bumpTexture;
    material.diffuseColor = B.Color3.FromHexString(hex); material.emissiveColor = material.diffuseColor.clone(); material.disableLighting = true; material.fogEnabled = false;
    material.metadata = { d8Authored: true, d8Backdrop: true };
    material.specularColor = B.Color3.Black(); material.maxSimultaneousLights = 2;
    distantMaterials.push({ material, color: material.diffuseColor.clone() }); return material;
  };
  const instances = (mesh: any, placements: ScenicPlacement[], layer: TempleEnvironmentLayer) => {
    own(mesh, layer); const matrices = new Float32Array(placements.length * 16);
    for (const [i, [x, y, z, sx, sy, sz, angle = 0]] of placements.entries()) {
      const c = Math.cos(angle), s = Math.sin(angle);
      matrices.set([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1], i * 16);
    }
    mesh.thinInstanceSetBuffer('matrix', matrices, 16, true); mesh.thinInstanceRefreshBoundingInfo();
    mesh.isPickable = false; mesh.receiveShadows = false; mesh.metadata.instanceCount = placements.length;
    return mesh;
  };
  const liftGeometry = (mesh: any, y: number) => {
    const positions = mesh.getVerticesData('position'); for (let i = 1; i < positions.length; i += 3) positions[i] += y;
    mesh.setVerticesData('position', positions); return mesh;
  };
  if (phase >= 3) {
    sculpt('temple-environment-far-meadow', -225, -245, 450, 137.1, 'distant');
    const placements = Array.from({ length: 32 }, (_, i): ScenicPlacement => [
      -112 + (i % 16) * 15 + templeScenicSeed(i + 82) * 5, 0, -110 - Math.floor(i / 16) * 36 - templeScenicSeed(i + 191) * 9,
      4 + templeScenicSeed(i + 412) * 2, 3.8 + templeScenicSeed(i + 175) * 1.3, 5 + templeScenicSeed(i + 43) * 2, templeScenicSeed(i) * .24 - .12
    ]);
    const wall = createSylvaniaGabledBody(B, scene, 'temple-environment-far-houses', materials.plaster);
    wall.material = tinted(materials.plaster, 'sylvania-far-plaster', '#ad9b8d'); instances(wall, placements, 'distant');
    const roofParts = [-1, 1].map(side => {
      const mesh = B.MeshBuilder.CreateBox('sylvania-roof-prototype', { width: .59, height: .06, depth: 1.12 }, scene);
      mesh.position.set(side * .25, 1.11, 0); mesh.rotation.z = -side * .40; mesh.material = materials.roof; return mesh;
    });
    const roof = B.Mesh.MergeMeshes(roofParts, true, true, undefined, false, false); roof.name = 'temple-environment-far-roofs';
    roof.material = tinted(materials.roof, 'sylvania-far-tiles', '#85716c'); instances(roof, placements, 'distant');
    const trees = Array.from({ length: 80 }, (_, i): ScenicPlacement => [
      -190 + templeScenicSeed(i + 370) * 380, .1, -88 - templeScenicSeed(i + 683) * 126,
      2.7 + templeScenicSeed(i + 907) * 2.7, 4.5 + templeScenicSeed(i + 13) * 4.4, 3.2 + templeScenicSeed(i + 773) * 2
    ]);
    const trunks = liftGeometry(B.MeshBuilder.CreateCylinder('temple-environment-far-trunks', { height: 1, diameter: .1, tessellation: 5 }, scene), .5);
    trunks.material = tinted(materials.wood, 'sylvania-far-bark', '#716b64'); instances(trunks, trees, 'distant');
    const crowns = liftGeometry(B.MeshBuilder.CreateSphere('temple-environment-far-crowns', { diameter: 1, segments: 5 }, scene), .75);
    crowns.material = tinted(materials.foliage, 'sylvania-far-foliage', '#687669'); instances(crowns, trees, 'distant');
    const hills = B.MeshBuilder.CreateSphere('temple-environment-soft-hills', { diameter: 1, segments: 6 }, scene);
    hills.material = tinted(materials.ground, 'sylvania-far-meadows', '#878e79');
    instances(hills, Array.from({ length: 14 }, (_, i): ScenicPlacement => [-210 + i * 32, -1.2, -200 - templeScenicSeed(i) * 26, 42 + templeScenicSeed(i + 104) * 19, 5 + templeScenicSeed(i + 377) * 5, 29]), 'distant');
  }
  let panoramaMesh: any = null;
  if (phase >= 4) {
    // World-space 200° cyclorama: no billboard, photograph rectangle or 360° set.
    // Continuous vertex-colour bands blend into the existing sky, avoiding image edges.
    const mesh = own(createSylvaniaPanorama(B, scene, track, 'temple-environment-sylvania-panorama'), 'panorama');
    panoramaMesh = mesh;
  }
  let hazeMaterial: any = null;
  if (phase >= 5) {
    const material = hazeMaterial = track(new B.StandardMaterial('sylvania-distant-haze', scene));
    material.disableLighting = true; material.emissiveColor = B.Color3.FromHexString('#d7bc9d'); material.alpha = .11; material.backFaceCulling = false; material.fogEnabled = false;
    material.metadata = { d8Authored: true, d8Backdrop: true };
    const mist = own(new B.Mesh('temple-environment-rural-haze', scene), 'atmosphere');
    const data = new B.VertexData(), positions: number[] = [], colors: number[] = [], indices: number[] = [], normals: number[] = [];
    for (const [row, y] of [-.2, 1.8, 8].entries()) for (let i = 0; i <= 48; i++) {
      const angle = (i / 48 * 150 - 75) * Math.PI / 180, radius = 205;
      positions.push(Math.sin(angle) * radius, y, -Math.cos(angle) * radius); colors.push(1, 1, 1, row === 1 ? 1 : 0);
    }
    for (let row = 0; row < 2; row++) for (let i = 0; i < 48; i++) { const a = row * 49 + i, b = a + 49; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    B.VertexData.ComputeNormals(positions, indices, normals); data.positions = positions; data.indices = indices; data.colors = colors; data.normals = normals; data.applyToMesh(mist);
    mist.hasVertexAlpha = true; mist.material = material; mist.receiveShadows = false; mist.metadata.radialSeparation = 204;
    // Cheap contact depth for scenic houses, outside the tactical shadow-map budget.
    const shadowMaterial = track(new B.StandardMaterial('sylvania-house-contact', scene));
    shadowMaterial.disableLighting = true; shadowMaterial.emissiveColor = B.Color3.FromHexString('#293445'); shadowMaterial.alpha = .22; shadowMaterial.backFaceCulling = false;
    shadowMaterial.metadata = { d8Authored: true, d8Backdrop: true };
    for (const house of roots.village.getChildTransformNodes().filter((node: any) => node.metadata?.roofEnvelope)) {
      const roof = house.metadata.roofEnvelope, mesh = own(B.MeshBuilder.CreateGround('temple-environment-house-contact', { width: roof.width + 2, height: roof.depth + 2, subdivisions: 2 }, scene), 'village');
      const { x, z } = house.position, edge = Math.max(0, Math.abs(x) - 26.25, -33.75 - z, z - 62);
      mesh.position.set(x + .3, -.002 + Math.min(1, edge / 14) * (.10 * Math.sin(x * .13) + .09 * Math.sin(z * .17)), z + .1); mesh.rotation.y = house.rotation.y;
      const colors: number[] = []; for (let i = 0; i < 9; i++) colors.push(1, 1, 1, i === 4 ? 1 : 0);
      mesh.setVerticesData('color', colors); mesh.hasVertexAlpha = true; mesh.material = shadowMaterial;
    }
  }
  let lastAtmosphereKey = '';
  return {
    roots, meshes,
    optimize() {
      const groups = new Map<string, any[]>();
      for (const mesh of meshes.filter(m => !m.isDisposed())) {
        if (!mesh.material || mesh.thinInstanceCount || mesh.hasVertexAlpha || mesh.metadata.continuousGround || mesh.metadata.radialSeparation) continue;
        mesh.computeWorldMatrix(true); const p = mesh.getBoundingInfo().boundingBox.centerWorld;
        const key = `${mesh.metadata.environmentLayer}:${mesh.material.uniqueId}:${Math.floor(p.x / 48)}:${Math.floor(p.z / 48)}`;
        const group = groups.get(key) ?? []; group.push(mesh); groups.set(key, group);
      }
      for (const group of groups.values()) if (group.length > 1) {
        const metadata = { ...group[0].metadata, exteriorBuilding: group.some((m: any) => m.metadata?.exteriorBuilding), batchedScenicParts: group.length };
        const merged = B.Mesh.MergeMeshes(group, true, true, undefined, false, false);
        if (merged) { merged.name = `temple-environment-batch-${metadata.environmentLayer}-${merged.uniqueId}`; own(merged, metadata.environmentLayer); merged.metadata = metadata; }
      }
    },
    setGroundMaterial(material: any) { for (const mesh of meshes) if (mesh.metadata.continuousGround) mesh.material = material; },
    adjustView(view: any) { return templeEnvironmentLight(view, phase >= 5 && roots.atmosphere.isEnabled()); },
    updateAtmosphere(light: any, climate: any) {
      const ambient = light?.ambient ?? .70, fog = climate?.fogDensity ?? 0, key = `${light?.phase}:${ambient.toFixed(2)}:${(light?.warmth ?? .8).toFixed(2)}:${fog.toFixed(2)}`;
      if (key === lastAtmosphereKey) return; lastAtmosphereKey = key;
      const tint = sylvaniaDistanceTint(B, ambient);
      const style = sylvaniaLightStyle(light); updateSylvaniaPanorama(B, panoramaMesh, style);
      for (const item of distantMaterials) { item.material.emissiveColor = item.color.multiply(tint); item.material.diffuseColor = item.color.multiply(tint); }
      if (hazeMaterial) { hazeMaterial.emissiveColor = new B.Color3(...style.sky[2]); hazeMaterial.alpha = .08 + Math.min(.12, fog * .12); }
    },
    setLayer(id: TempleEnvironmentLayer, enabled: boolean) { if (!roots[id]) throw new Error(`Unknown temple layer: ${id}`); roots[id].setEnabled(enabled); },
    get diagnostics() { return { style: SYLVANIA_STYLE.id, architecture: SYLVANIA_STYLE.architecture, phase, layers: Object.fromEntries(TEMPLE_ENVIRONMENT_LAYERS.map(id => [id, roots[id].isEnabled()])), meshes: meshes.filter(m => !m.isDisposed()).length }; }
  };
}

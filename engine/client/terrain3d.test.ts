import { afterEach, describe, expect, it } from 'vitest';
import { Material, NullEngine, RawTexture, Scene, StandardMaterial, VertexBuffer } from '@babylonjs/core';
import { bridgeFixture } from '../shared/terrain-fixture.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { buildTerrain3D } from './terrain3d.js';

const engines: NullEngine[] = [];
afterEach(() => { engines.splice(0).forEach(engine => engine.dispose()); });
describe('Babylon terrain adapter', () => {
  it('renders both elevations of one D&D cell as distinct pickable tiles and grid lines', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const result = buildTerrain3D(scene, bridgeFixture);
    expect(result.tiles.size).toBe(22);
    const ground = result.tiles.get('ground:3,1')!, bridge = result.tiles.get('bridge:3,1')!;
    expect(ground.metadata.address.surfaceId).toBe('ground');
    expect(bridge.metadata.address.surfaceId).toBe('bridge');
    ground.computeWorldMatrix(true); bridge.computeWorldMatrix(true);
    expect(ground.getBoundingInfo().boundingBox.maximumWorld.y).toBeCloseTo(0);
    expect(bridge.getBoundingInfo().boundingBox.maximumWorld.y).toBeCloseTo(2.5);
    expect(ground.isPickable && bridge.isPickable).toBe(true);
    expect(result.grid.isPickable).toBe(false);
    expect(result.grid.visibility).toBe(1);
    expect(result.grid.color.r).toBeCloseTo(219 / 255);
    expect(result.grid.alpha).toBe(1);
    expect(result.occluders).toHaveLength(2);
    expect(result.lights).toHaveLength(1);
  });
  it('uses ramp corner heights for the actual Babylon mesh', () => {
    const engine = new NullEngine(); engines.push(engine);
    const result = buildTerrain3D(new Scene(engine), bridgeFixture);
    const positions = result.tiles.get('bridge:1,1')!.getVerticesData(VertexBuffer.PositionKind)!;
    expect([positions[1], positions[4], positions[7], positions[10]]).toEqual([0, 1.25, 1.25, 0]);
    const normals = result.tiles.get('bridge:1,1')!.getVerticesData(VertexBuffer.NormalKind)!;
    expect(normals[1]).toBeGreaterThan(0);
  });
  it('maps the ship deck texture in continuous world coordinates without changing ramp geometry', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene);
    const result = buildTerrain3D(scene, bridgeFixture, { shipDeck: true, deckTexture: texture });
    const ramp = result.tiles.get('bridge:1,1')!;
    const positions = ramp.getVerticesData(VertexBuffer.PositionKind)!;
    const uvs = ramp.getVerticesData(VertexBuffer.UVKind)!;
    expect([positions[0], positions[2], positions[3], positions[5]]).toEqual([1.5, 1.5, 3, 1.5]);
    expect(uvs).toEqual([1.5 / 4.5, 1.5 / 4.5, 1.5 / 4.5, 3 / 4.5, 3 / 4.5, 3 / 4.5, 3 / 4.5, 1.5 / 4.5]);
    expect((ramp.material as StandardMaterial).diffuseTexture).toBe(texture);
    expect(ramp.isPickable).toBe(true);
    texture.dispose();
  });
  it('maps animated water material without changing the water tiles or their picking', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene);
    const terrain = { ...bridgeFixture, surfaces: bridgeFixture.surfaces.map(surface => surface.id === 'ground'
      ? { ...surface, tiles: surface.tiles.map(tile => ({ ...tile, materialId: 'water' })) }
      : surface) };
    const result = buildTerrain3D(scene, terrain, { shipDeck: true, waterTexture: texture });
    const water = result.tiles.get('ground:1,0')!;
    const sea = scene.getMeshByName('ship-water')!;
    expect((water.material as StandardMaterial).diffuseTexture).toBe(texture);
    expect(water.isPickable).toBe(true);
    expect(water.getVerticesData(VertexBuffer.UVKind)).toHaveLength(48);
    expect((sea.material as StandardMaterial).diffuseTexture).toBe(texture);
    expect(sea.isPickable).toBe(false);
    expect(sea.getVerticesData(VertexBuffer.UVKind)).toHaveLength(sea.getVerticesData(VertexBuffer.PositionKind)!.length / 3 * 2);
    expect(Math.max(...sea.getVerticesData(VertexBuffer.UVKind)!)).toBeGreaterThan(1);
    expect(scene.onBeforeRenderObservable.hasObservers()).toBe(true);
    const initialOffset = texture.uOffset;
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(texture.uOffset).toBeGreaterThan(initialOffset);
    texture.dispose();
  });
  it('separates the illustrated deep-sea backdrop from animated, walkable water tiles', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const nearWater = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene);
    const nearArtwork = RawTexture.CreateRGBATexture(new Uint8Array([20, 70, 90, 255]), 1, 1, scene);
    const scenicBackdrop = RawTexture.CreateRGBATexture(new Uint8Array([14, 42, 58, 255]), 1, 1, scene);
    const terrain = { ...bridgeFixture, baseSurfaceId: 'sea', surfaces: bridgeFixture.surfaces.map(surface => surface.id === 'ground'
      ? { ...surface, id: 'sea', tiles: surface.tiles.map(tile => ({ ...tile, materialId: 'water' })) }
      : surface) };
    const result = buildTerrain3D(scene, terrain, { shipDeck: true, waterTexture: nearWater, waterBackdropTexture: nearArtwork, scenicWaterTexture: scenicBackdrop });
    const nearTile = result.tiles.get('sea:1,0')!;
    const nearTileMaterial = nearTile.material as StandardMaterial;
    const nearTileUvs = nearTile.getVerticesData(VertexBuffer.UVKind)!;
    const backdrop = scene.getMeshByName('ship-water')!;
    const backdropUvs = backdrop.getVerticesData(VertexBuffer.UVKind)!;
    expect(nearTileMaterial.diffuseTexture).toBe(nearArtwork);
    expect(nearTileMaterial.bumpTexture).toBe(nearWater);
    expect(Math.min(...nearTileUvs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nearTileUvs)).toBeLessThanOrEqual(1);
    expect(nearTile.isPickable).toBe(true);
    expect((backdrop.material as StandardMaterial).diffuseTexture).toBe(scenicBackdrop);
    expect(backdrop.isPickable).toBe(false);
    expect(backdrop.isVisible).toBe(false);
    expect(scene.layers.some(layer => layer.name === 'ship-ocean-backdrop-layer'
      && layer.isBackground && layer.texture === scenicBackdrop)).toBe(true);
    expect(scene.meshes.some(mesh => mesh.name.startsWith('ship-sea-depth:'))).toBe(false);
    expect(scene.meshes.some(mesh => mesh.name.startsWith('wreck-seabed:'))).toBe(false);
    expect(Math.min(...backdropUvs)).toBeLessThan(0);
    expect(Math.max(...backdropUvs)).toBeGreaterThan(1);
    expect(result.grids.get('sea')?.alpha).toBeCloseTo(0.18);
    expect((nearTile.material as StandardMaterial).transparencyMode).toBe(Material.MATERIAL_ALPHABLEND);
    expect(nearTile.hasVertexAlpha).toBe(true);
    expect(nearTile.getVerticesData(VertexBuffer.ColorKind)?.some((value, index) => index % 4 === 3 && value < 1)).toBe(true);
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(nearWater.uOffset).toBeGreaterThan(0);
    expect(nearArtwork.uOffset).toBe(0);
    expect(scenicBackdrop.vOffset).toBeGreaterThan(0);
    nearWater.dispose(); nearArtwork.dispose(); scenicBackdrop.dispose();
  });
  it('lays animated foam only on the real sea surface, never as navigable geometry', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const foamTexture = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 150]), 1, 1, scene);
    const terrain = { ...bridgeFixture, baseSurfaceId: 'sea', surfaces: bridgeFixture.surfaces.map(surface => surface.id === 'ground'
      ? { ...surface, id: 'sea', tiles: surface.tiles.map(tile => ({ ...tile, materialId: 'water' })) }
      : surface) };
    const result = buildTerrain3D(scene, terrain, { shipDeck: true, foamTexture });
    const overlay = scene.getMeshByName('ship-sea-foam-overlay')!;
    expect(overlay.isPickable).toBe(false);
    expect(overlay.metadata).toMatchObject({ visualOnly: true, deckSurfaceId: 'sea' });
    expect(result.tiles.get('sea:1,0')?.isPickable).toBe(true);
    expect(overlay.getVerticesData(VertexBuffer.PositionKind)?.length).toBe(terrain.surfaces[0]!.tiles.length * 12);
    const before = foamTexture.uOffset;
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(foamTexture.uOffset).toBeGreaterThan(before);
    foamTexture.dispose();
  });
  it('keeps flooded C8/C9 shimmer on its own cutaway layer', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([120, 180, 190, 255]), 1, 1, scene);
    const terrain = { ...bridgeFixture, surfaces: bridgeFixture.surfaces.map(surface => ({ ...surface,
      id: surface.id === 'ground' ? 'lower-deck' : 'hold-air',
      tiles: surface.tiles.map(tile => ({ ...tile, medium: 'water' as const })) })) };
    const result = buildTerrain3D(scene, terrain, { shipDeck: true, floodedDeckTexture: texture });
    for (const surfaceId of ['lower-deck', 'hold-air']) {
      const visual = scene.getMeshByName(`ship-flooded-deck:${surfaceId}`)!;
      expect(visual.isPickable).toBe(false);
      expect(visual.metadata.deckSurfaceId).toBe(surfaceId);
      expect(result.deckDetails).toContain(visual);
    }
    texture.dispose();
  });
  it('gives flooded C8 and the darker C9 distinct deck tints without changing their walkable mesh', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene);
    const flooded = bridgeFixture.surfaces[0]!;
    const cargoHold = bridgeFixture.surfaces[1]!;
    const terrain = { ...bridgeFixture, baseSurfaceId: 'lower-deck', surfaces: [
      { ...flooded, id: 'lower-deck', tiles: flooded.tiles.map(tile => ({ ...tile, materialId: 'wood', medium: 'water' as const })) },
      { ...cargoHold, id: 'hold-air', tiles: cargoHold.tiles.map(tile => ({ ...tile, materialId: 'wood', medium: 'water' as const })) }
    ] };
    const result = buildTerrain3D(scene, terrain, { shipDeck: true, deckTexture: texture });
    const wetDeck = result.tiles.get('lower-deck:3,1')!;
    const darkHold = result.tiles.get('hold-air:3,1')!;
    const wetMaterial = wetDeck.material as StandardMaterial, holdMaterial = darkHold.material as StandardMaterial;
    expect(wetMaterial.diffuseTexture).toBe(texture);
    expect(holdMaterial.diffuseTexture).toBe(texture);
    expect(wetMaterial.diffuseColor.g).toBeGreaterThan(holdMaterial.diffuseColor.g);
    expect(wetDeck.isPickable && darkHold.isPickable).toBe(true);
    wetDeck.computeWorldMatrix(true); darkHold.computeWorldMatrix(true);
    expect(wetDeck.getBoundingInfo().boundingBox.maximumWorld.y).toBeCloseTo(flooded.tiles.find(tile => tile.cell.col === 3 && tile.cell.row === 1)!.corners[0]!);
    expect(darkHold.getBoundingInfo().boundingBox.maximumWorld.y).toBeCloseTo(cargoHold.tiles.find(tile => tile.cell.col === 3 && tile.cell.row === 1)!.corners[0]!);
    texture.dispose();
  });
  it('adds the ship hull and deck trim as non-pickable decoration without changing the walkable tiles', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const result = buildTerrain3D(scene, bridgeFixture, { shipDeck: true });
    expect(result.tiles.size).toBe(22);
    expect(result.camera.beta).toBeCloseTo(1.02);
    expect(scene.getMeshByName('ship-hull-sides:bridge')?.isPickable).toBe(false);
    expect(scene.getMeshByName('ship-deck-planks:bridge')?.isPickable).toBe(false);
    expect(scene.getMeshByName('ship-hull-strakes:bridge')?.isPickable).toBe(false);
    expect(scene.getMeshByName('ship-water')?.isPickable).toBe(false);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('ship-rail:')).length).toBeGreaterThan(0);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('ship-rail:')).every(mesh => !mesh.isPickable)).toBe(true);
    expect(result.deckDetails.some(mesh => mesh.name === 'ship-deck-planks:bridge')).toBe(true);
    expect(result.deckDetails.every(mesh => typeof mesh.metadata.deckSurfaceId === 'string')).toBe(true);
    expect(result.grids.get('ground')?.visibility).toBe(1);
    expect(result.grids.get('ground')?.color.r).toBeCloseTo(136 / 255);
    expect(result.grids.get('ground')?.alpha).toBeCloseTo(0.38);
    expect(result.grids.get('ground')?.useVertexAlpha).toBe(true);
  });
  it('paints the ship hull with the deck material as a separate non-pickable art layer', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene);
    const result = buildTerrain3D(scene, bridgeFixture, { shipDeck: true, deckTexture: texture });
    const hull = scene.getMeshByName('ship-hull-sides:bridge')!;
    const positions = hull.getVerticesData(VertexBuffer.PositionKind)!;
    const uvs = hull.getVerticesData(VertexBuffer.UVKind)!;
    expect((hull.material as StandardMaterial).diffuseTexture).toBe(texture);
    expect(hull.metadata).toMatchObject({ visualOnly: true, kind: 'ship-hull' });
    expect(hull.isPickable).toBe(false);
    expect(uvs).toHaveLength(positions.length / 3 * 2);
    expect(Math.max(...uvs)).toBeGreaterThan(1);
    expect(result.tiles.size).toBe(22);
    texture.dispose();
  });
  it('keeps the detailed C1 wreckage sample decorative over a fully walkable deck', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([80, 65, 45, 150]), 1, 1, scene);
    const cells = [14, 15, 16].flatMap(row => [25, 26, 27].map(col => ({ col, row })));
    const terrain: TerrainDefinition = { ...bridgeFixture, cols: 56, rows: 32, baseSurfaceId: 'main',
      surfaces: [{ id: 'main', tiles: cells.map(cell => ({ cell, kind: 'floor' as const,
        corners: [0, 0, 0, 0] as [number, number, number, number],
        materialId: 'wood', movementCost: 1 as const, medium: 'solid' as const })) }],
      structures: [], occluders: [], lights: [] };
    const result = buildTerrain3D(scene, terrain, { shipDeck: true, wreckageTexture: texture });
    const detail = scene.getMeshByName('ship-c1-wreckage-detail')!;
    const stain = scene.getMeshByName('ship-c1-salt-stain')!;
    expect(detail.isPickable).toBe(false);
    expect(detail.metadata).toMatchObject({ visualOnly: true, deckSurfaceId: 'main' });
    expect(stain.isPickable).toBe(false);
    expect(stain.metadata).toMatchObject({ visualOnly: true, deckSurfaceId: 'main' });
    expect(stain.hasVertexAlpha).toBe(true);
    expect((detail.material as StandardMaterial).diffuseTexture).toBe(texture);
    expect((detail.material as StandardMaterial).transparencyMode).toBe(Material.MATERIAL_ALPHABLEND);
    expect(result.deckDetails).toContain(detail);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('ship-c1-wreckage-batten:'))).toHaveLength(3);
    expect(result.tiles.size).toBe(9);
    expect([...result.tiles.values()].every(tile => tile.isPickable)).toBe(true);
    texture.dispose();
  });
  it('adds layered depth lighting and a soft hull shadow without touching playable geometry', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const result = buildTerrain3D(scene, bridgeFixture, { shipDeck: true });
    const depthLayers = scene.meshes.filter(mesh => mesh.name.startsWith('ship-sea-depth:'));
    expect(depthLayers.map(mesh => mesh.name)).toEqual([
      'ship-sea-depth:hull-shadow', 'ship-sea-depth:reef-light-west',
      'ship-sea-depth:reef-light-east', 'ship-sea-depth:reef-light-far'
    ]);
    expect(depthLayers.every(mesh => !mesh.isPickable && mesh.metadata.visualOnly)).toBe(true);
    expect(depthLayers[0]?.metadata.kind).toBe('sea-depth-layer');
    expect(scene.fogMode).toBe(Scene.FOGMODE_EXP2);
    expect(scene.fogDensity).toBeGreaterThan(0);
    expect(scene.getLightByName('ship-key-light')).not.toBeNull();
    expect(result.tiles.size).toBe(22);
    expect([...result.tiles.values()].every(mesh => mesh.isPickable)).toBe(true);
    expect(result.grids.get('ground')?.isPickable).toBe(false);
  });
});

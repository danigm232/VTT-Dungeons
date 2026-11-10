import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color4} from '@babylonjs/core/Maths/math.color.js';
import {
  installRetreatBeachPresentation,
  type RetreatBeachPresentation
} from '../../campaigns/stormwreck-isle/public/retreat-beach-presentation.js';

describe('Retreat Beach & Pier Presentation (Playa y Embarcadero AAA)', () => {
  it('installs beach sand, wet shore ribbon, pebble scatter, jetty detailing, and boat upgrades under NullEngine', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);

    // 1. Mock existing sea mesh
    const sea = MeshBuilder.CreateGround('a1:bay-background', { width: 120, height: 120, subdivisions: 8 }, scene);
    sea.metadata = { coastalGeometryVersion: 1 };

    // 2. Mock existing beach walkable floor
    const beachFloor = MeshBuilder.CreateBox('CANON_Global_beach_walkable-floor', { width: 12, height: 0.25, depth: 8 }, scene);
    beachFloor.position.set(24, 0.25, 112);

    const shoreFloor = MeshBuilder.CreateBox('A1_APPROACH_floor-shore', { width: 6, height: 0.25, depth: 7.5 }, scene);
    shoreFloor.position.set(20, 0.25, 110);

    // 3. Mock existing pier meshes
    const deck = MeshBuilder.CreateBox('R3_Jetty_Deck_a1_oak-v5', { width: 2.12, height: 0.18, depth: 3.19 }, scene);
    deck.position.set(20.25, 0.28, 115.7);

    const piles = MeshBuilder.CreateBox('R3_Jetty_Piles_a1_dark-oak-v5', { width: 2.13, height: 2.32, depth: 2.93 }, scene);
    piles.position.set(20.25, -0.34, 115.7);

    const post = MeshBuilder.CreateCylinder('P2_CANON_Mooring_Post_115.35', { height: 1.7, diameter: 0.24 }, scene);
    post.position.set(21.2, 0.82, 117.1);

    // 4. Mock boat rig & parts
    const boatRig = new TransformNode('retreat:moored-boat', scene);
    boatRig.position.set(20.25, 0.15, 119.4);

    const boatHull = MeshBuilder.CreateBox('P2_CANON_Rowing_Boat_Hull', { width: 1.58, height: 0.79, depth: 3.5 }, scene);
    boatHull.parent = boatRig;

    // 5. Mock coastal flora
    const saltGrass = MeshBuilder.CreateBox('V5_Shore_Salt_Grass', { width: 4, height: 0.8, depth: 4 }, scene);
    saltGrass.position.set(16, 0.4, 114);

    // Install presentation module
    const presentation = installRetreatBeachPresentation(scene, sea, 6);
    expect(presentation).not.toBeNull();
    if (!presentation) throw Error('Presentation should not be null');

    // Verify stats
    expect(presentation.stats.sandUpgraded).toBe(true);
    expect(presentation.stats.duneTriangles).toBeGreaterThan(100);
    expect(presentation.stats.wetSandTriangles).toBeGreaterThan(50);
    expect(presentation.stats.pebbleCount).toBeGreaterThan(20);
    expect(presentation.stats.driftwoodCount).toBeGreaterThanOrEqual(4);
    expect(presentation.stats.meadowTufts).toBeGreaterThanOrEqual(100);
    expect(presentation.stats.pineBushes).toBeGreaterThanOrEqual(6);
    expect(presentation.stats.ironBolts).toBeGreaterThan(8);
    expect(presentation.stats.barnacleClusters).toBeGreaterThan(15);
    expect(presentation.stats.boatRibs).toBe(3);
    expect(presentation.stats.oarsInstalled).toBe(true);
    expect(presentation.stats.cliffSealed).toBe(true);
    expect(presentation.stats.trailGuideposts).toBeGreaterThanOrEqual(5);
    expect(presentation.stats.lanternInstalled).toBe(true);
    expect(presentation.stats.shallowSeabedInstalled).toBe(true);

    // Verify beach floor received dedicated sand material
    expect(beachFloor.material?.name).toBe('retreat:pbr:beach-sand');
    expect(shoreFloor.material?.name).toBe('retreat:pbr:beach-sand');

    // Verify 3D natural dunes & wet sand mesh
    const dunes = scene.getMeshByName('retreat:beach-natural-dunes');
    expect(dunes).toBeDefined();
    expect(dunes?.material?.name).toBe('retreat:pbr:beach-sand');

    const wetSand = scene.getMeshByName('retreat:beach-wet-shore-ribbon');
    expect(wetSand).toBeDefined();
    expect(wetSand?.material?.name).toBe('retreat:pbr:beach-wet-sand');
    expect(wetSand?.isPickable).toBe(false);
    expect(wetSand?.checkCollisions).toBe(false);

    // Verify driftwood & pebble scatter meshes
    const driftwood0 = scene.getMeshByName('retreat:driftwood-0');
    expect(driftwood0).toBeDefined();
    expect(driftwood0?.metadata?.decorativeOnly).toBe(true);

    const scatter = scene.getMeshByName('retreat:beach-scatter');
    expect(scatter).toBeDefined();
    expect(scatter?.metadata?.decorativeOnly).toBe(true);

    // Verify lush 3D coastal meadow
    const meadow = scene.getMeshByName('retreat:coastal-lush-meadow');
    expect(meadow).toBeDefined();
    expect(meadow?.material?.name).toBe('retreat:pbr:coastal-grass');

    // Verify iron hardware bolts
    const bolts = scene.getMeshByName('retreat:jetty-iron-hardware');
    expect(bolts).toBeDefined();
    expect(bolts?.material?.name).toBe('retreat:pbr:marine-iron');

    // Verify pile marine life (barnacles & kelp)
    const marine = scene.getMeshByName('retreat:jetty-pile-marine-life');
    expect(marine).toBeDefined();

    // Verify mooring coils
    const coils = scene.getMeshByName('retreat:jetty-mooring-coils');
    expect(coils).toBeDefined();

    // Verify boat upgrades (ribs, thwarts, oars, bow painter)
    const rib0 = scene.getMeshByName('retreat:boat-rib-0');
    expect(rib0).toBeDefined();
    expect(rib0?.parent).toBe(boatRig);

    const thwart0 = scene.getMeshByName('retreat:boat-thwart-0');
    expect(thwart0).toBeDefined();

    const oarShaft0 = scene.getMeshByName('retreat:oar-shaft-0');
    expect(oarShaft0).toBeDefined();
    const oarBlade0 = scene.getMeshByName('retreat:oar-blade-0');
    expect(oarBlade0).toBeDefined();

    const bowRope = scene.getMeshByName('retreat:boat-bow-rope-coil');
    expect(bowRope).toBeDefined();
    expect(bowRope?.parent).toBe(boatRig);

    // Verify sealed basalt cliff buttresses
    const cliffSeal0 = scene.getMeshByName('retreat:cliff-buttress-seal-0');
    expect(cliffSeal0).toBeDefined();
    expect(cliffSeal0?.material?.name).toBe('retreat:pbr:cliff-basalt');

    // Verify trail guideposts & safety rope
    const guidepost0 = scene.getMeshByName('retreat:trail-guidepost-0');
    expect(guidepost0).toBeDefined();
    const safetyRope = scene.getMeshByName('retreat:trail-safety-rope');
    expect(safetyRope).toBeDefined();
    expect(bowRope?.parent).toBe(boatRig);

    // Verify seabed
    const seabed = scene.getMeshByName('retreat:shallow-seabed-bedrock');
    expect(seabed).toBeDefined();

    // Verify lantern & dynamic lighting response
    expect(presentation.lanternLight).toBeDefined();
    const light = presentation.lanternLight!;

    // Midday (clearColor.r = 0.22): light should be disabled/off
    scene.clearColor = new Color4(0.22, 0.35, 0.45, 1);
    presentation.update(0);
    expect(light.isEnabled()).toBe(false);

    // Night (clearColor.r = 0.02): light should be enabled and flickering
    scene.clearColor = new Color4(0.02, 0.04, 0.08, 1);
    presentation.update(1.5);
    expect(light.isEnabled()).toBe(true);
    expect(light.intensity).toBeGreaterThan(0.3);

    // All added meshes must strictly be decorative and non-blocking
    for (const mesh of presentation.meshes) {
      expect(mesh.isPickable).toBe(false);
      expect(mesh.checkCollisions).toBe(false);
      expect(mesh.metadata?.decorativeOnly).toBe(true);
      expect(mesh.metadata?.retreatFloor).toBe(false);
    }

    scene.dispose();
    engine.dispose();
  });
});

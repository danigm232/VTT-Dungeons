import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { actorShadow } from './actor-shadow.js';

describe('actorShadow: comprobación día y noche', () => {
  it('responde coherentemente a la luz del sol diurna y a antorchas nocturnas', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const ground = new Vector3(0, 0, 0);
    const actor = new Mesh('actor:hero:body', scene);

    // 1. Condición de DÍA: sol activo con dirección inclinada
    const sun = new DirectionalLight('camp-key:camp-a1-rooms', new Vector3(-0.6, -1, -0.4), scene);
    sun.intensity = 1.0;

    const dayShadow = actorShadow(scene, ground, actor, 1.8);
    expect(dayShadow.alpha).toBeGreaterThan(0.2);
    expect(dayShadow.alpha).toBeLessThanOrEqual(0.55);
    expect(dayShadow.length).toBeGreaterThan(0.5);
    // La dirección se proyecta plana sobre el suelo (y = 0)
    expect(dayShadow.direction.y).toBe(0);
    expect(dayShadow.direction.length()).toBeCloseTo(1, 4);

    // 2. Condición de NOCHE: sol atenuado/apagado, antorcha puntual cercana encendida
    sun.intensity = 0.0;
    const torch = new PointLight('a1:room-1:torch-light', new Vector3(2, 1.8, 1), scene);
    torch.intensity = 1.2;
    torch.range = 10;

    const nightShadow = actorShadow(scene, ground, actor, 1.8);
    expect(nightShadow.alpha).toBeGreaterThan(0.1);
    expect(nightShadow.alpha).toBeLessThanOrEqual(0.55);
    expect(nightShadow.length).toBeGreaterThan(0.2);
    expect(nightShadow.direction.y).toBe(0);
    // La dirección debe alejarse de la antorcha: delta = ground - torchPos
    // ground (0,0,0) - torch (2, 1.8, 1) -> x negativo, z negativo
    expect(nightShadow.direction.x).toBeLessThan(0);
    expect(nightShadow.direction.z).toBeLessThan(0);

    // 3. Condición de NOCHE SIN FUENTES DIRECTAS (oscuridad o luz ambiente)
    torch.intensity = 0.005; // menor al umbral de 0.01
    const darkShadow = actorShadow(scene, ground, actor, 1.8);
    expect(darkShadow.alpha).toBe(0);

    scene.dispose();
    engine.dispose();
  });
});

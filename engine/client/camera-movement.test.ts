import { describe, expect, it } from 'vitest';
import { cameraAlphaForOrientation, cameraBetaForTiltDegrees, cameraTiltDegreesForBeta, normalizeCameraOrientationStep, screenVectorToWorld, screenVectorToWorldAtAlpha, worldVectorToCellDelta, sceneOrientationForView, terrainCameraBaseAlpha } from './camera-movement.js';
import { exteriorArrivalOrientation } from './camera-space.js';

describe('movimiento relativo a la cámara', () => {
  it('starts an exterior arrival from the open side without imposing an orbit lock',()=>{
    const center={x:42,z:20.25},half={x:31.5,z:10.55},alpha=-Math.PI/4;
    expect(exteriorArrivalOrientation({x:9.75,z:20.25},center,half,alpha)).toBe(5);
    expect(exteriorArrivalOrientation({x:76,z:20.25},center,half,alpha)).toBe(1);
    expect(exteriorArrivalOrientation({x:42,z:6},center,half,alpha)).toBe(7);
    expect(exteriorArrivalOrientation({x:42,z:33},center,half,alpha)).toBe(3);
    expect(exteriorArrivalOrientation(center,center,half,alpha)).toBeUndefined();
    expect(exteriorArrivalOrientation({x:9.75,z:20.25},center,half,Math.PI/4)).toBe(3);
  });
  it('frames Stormwreck arrivals from the open side and uses that visible basis for controls', () => {
    for (const id of ['camp-wreck-beach', 'camp-cliffs-observatory', 'camp-coastal-refuge']) {
      const alpha = cameraAlphaForOrientation(terrainCameraBaseAlpha(id), sceneOrientationForView(id, 0));
      expect(alpha).toBeCloseTo(Math.PI / 4);
      const up = screenVectorToWorldAtAlpha(0, 1, alpha, Math.PI / 4);
      expect(up.x).toBeLessThan(0); expect(up.z).toBeLessThan(0);
    }
    const retreatAlpha = cameraAlphaForOrientation(terrainCameraBaseAlpha('dragon-rest'), sceneOrientationForView('dragon-rest', 0));
    expect(retreatAlpha).toBeCloseTo(125*Math.PI/180);
    const retreatUp = screenVectorToWorldAtAlpha(0, 1, retreatAlpha, Math.PI / 4);
    expect(retreatUp.x).toBeGreaterThan(0); expect(retreatUp.z).toBeLessThan(0);
    expect(cameraAlphaForOrientation(terrainCameraBaseAlpha('camp-a1-rooms'), sceneOrientationForView('camp-a1-rooms', 0))).toBeCloseTo(Math.PI / 2);
    expect(terrainCameraBaseAlpha('camp-forest-pleamar')).toBeCloseTo(-Math.PI / 4);
  });
  it('mantiene giros discretos y límites de inclinación sin depender del renderizador', () => {
    expect(cameraAlphaForOrientation(-Math.PI / 2, 1)).toBeCloseTo(-Math.PI / 4);
    const left = cameraAlphaForOrientation(-Math.PI / 2, -1);
    expect(Math.cos(left)).toBeCloseTo(Math.cos(-3 * Math.PI / 4));
    expect(Math.sin(left)).toBeCloseTo(Math.sin(-3 * Math.PI / 4));
    expect(cameraAlphaForOrientation(-Math.PI / 2, 8)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeCameraOrientationStep(-1)).toBe(7);
    expect(cameraTiltDegreesForBeta(cameraBetaForTiltDegrees(48))).toBeCloseTo(35);
    expect(cameraTiltDegreesForBeta(cameraBetaForTiltDegrees(5))).toBeCloseTo(15);
    expect(cameraTiltDegreesForBeta(cameraBetaForTiltDegrees(80))).toBeCloseTo(35);
  });

  it('usa el mismo frente A1 para cámara y WASD sin cambiar las otras escenas', () => {
    for(let step=0;step<8;step++) {
      expect(sceneOrientationForView('camp-a1-rooms',step)).toBe((step+3)%8);
      expect(sceneOrientationForView('camp-forest-pleamar',step)).toBe(step);
      expect(sceneOrientationForView('dragon-rest',step)).toBe(step);
    }
    const up=screenVectorToWorld(0,1,sceneOrientationForView('camp-a1-rooms',0),Math.PI/4);
    expect(up.x).toBeCloseTo(0);expect(up.z).toBeCloseTo(-1);
  });
  it('mantiene las cuatro direcciones de pantalla en los ocho giros', () => {
    for (let step = 0; step < 8; step++) {
      const up = screenVectorToWorld(0, 1, step, Math.PI / 3);
      const right = screenVectorToWorld(1, 0, step, Math.PI / 3);
      expect(Math.max(Math.abs(up.x), Math.abs(up.z))).toBeLessThanOrEqual(1);
      expect(Math.max(Math.abs(right.x), Math.abs(right.z))).toBeLessThanOrEqual(1);
      expect(up.x * right.x + up.z * right.z).toBeCloseTo(0, 8);
      const down = screenVectorToWorld(0, -1, step, Math.PI / 3), left = screenVectorToWorld(-1, 0, step, Math.PI / 3);
      expect(down.x).toBeCloseTo(-up.x, 8); expect(down.z).toBeCloseTo(-up.z, 8);
      expect(left.x).toBeCloseTo(-right.x, 8); expect(left.z).toBeCloseTo(-right.z, 8);
    }
  });

  it('proyecta WASD y joystick según el ángulo visible durante todo el giro', () => {
    for (const tilt of [35, 45, 50]) for (let angle = -Math.PI; angle <= Math.PI; angle += Math.PI / 16) {
      const beta = cameraBetaForTiltDegrees(tilt);
      for (const [x, up] of [[0,1], [1,0], [1,1], [-.4,.7]]) {
        const world = screenVectorToWorldAtAlpha(x!, up!, angle, beta);
        const right = -Math.sin(angle) * world.x + Math.cos(angle) * world.z;
        const screenUp = (-Math.cos(angle) * world.x - Math.sin(angle) * world.z) * Math.cos(beta);
        expect(right * up! - screenUp * x!).toBeCloseTo(0, 8);
        expect(right * x! + screenUp * up!).toBeGreaterThan(0);
      }
    }
  });
  it('da al DM los mismos pasos de cuadrícula que al jugador en todos los giros', () => {
    for (let step = 0; step < 8; step++) {
      const world = screenVectorToWorld(0, 1, step, Math.PI / 4), delta = worldVectorToCellDelta(world);
      expect(delta.col).toBe(world.x > .25 ? 1 : world.x < -.25 ? -1 : 0);
      expect(delta.row).toBe(world.z > .25 ? 1 : world.z < -.25 ? -1 : 0);
      expect(Math.abs(delta.col) + Math.abs(delta.row)).toBeGreaterThan(0);
    }
    expect(worldVectorToCellDelta({ x: .1, z: -.9 })).toEqual({ col: 0, row: -1 });
    expect(worldVectorToCellDelta({ x: .8, z: -.8 })).toEqual({ col: 1, row: -1 });
  });
});

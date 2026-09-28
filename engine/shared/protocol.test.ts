import { describe, expect, it } from 'vitest';
import { dmCommandSchema } from './protocol';

describe('protocolo de audio del DM', () => {
  it('acepta el cambio día/noche desde una consola vinculada a la escena', () => {
    const result = dmCommandSchema.safeParse({
      type: 'environment', commandId: '11111111-1111-4111-8111-111111111111', sceneEpoch: 1,
      storm: false, timeOfDay: 'night'
    });
    expect(result.success).toBe(true);
  });

  it('acepta una mezcla de ambiente identificada por trackId', () => {
    const result = dmCommandSchema.safeParse({
      type: 'audio:mix', commandId: '11111111-1111-4111-8111-111111111111',
      music: { playing: false, volume: .2 },
      layers: {
        ocean: { trackId: 'stormwreck-loop-ocean', playing: true, volume: .3 },
        wind: { trackId: 'stormwreck-loop-wind', playing: true, volume: .2 },
        wood: { trackId: 'stormwreck-loop-wood', playing: false, volume: .1 },
        storm: { trackId: 'stormwreck-loop-storm', playing: false, volume: .2 }
      }
    });
    expect(result.success).toBe(true);
  });

  it('rechaza el antiguo campo assetId para no volver a producir INVALID_COMMAND', () => {
    const result = dmCommandSchema.safeParse({
      type: 'audio:mix', commandId: '11111111-1111-4111-8111-111111111111',
      music: { playing: false, volume: .2 },
      layers: {
        ocean: { assetId: 'stormwreck-loop-ocean', playing: true, volume: .3 },
        wind: { assetId: 'stormwreck-loop-wind', playing: true, volume: .2 },
        wood: { assetId: 'stormwreck-loop-wood', playing: false, volume: .1 },
        storm: { assetId: 'stormwreck-loop-storm', playing: false, volume: .2 }
      }
    });
    expect(result.success).toBe(false);
  });

  it('acepta una secuencia repetible de un disparador rápido', () => {
    const result = dmCommandSchema.safeParse({
      type: 'sfx:loop', commandId: '11111111-1111-4111-8111-111111111111', sfxId: 'd8-night-sfx-step-wood',
      playing: true, volume: .38, loop: false, rate: 1.25, repeats: 4
    });
    expect(result.success).toBe(true);
  });
});

describe('protocolo de conexiones entre zonas', () => {
  it('acepta IDs de puerto válidos definidos por la campaña', () => {
    const result = dmCommandSchema.safeParse({
      type: 'entity:portal', commandId: '11111111-1111-4111-8111-111111111111',
      sceneEpoch: 1, entityId: 'mike', portId: 'travel-pecio-boat', direction: 'forward', adjudicate: true
    });
    expect(result.success).toBe(true);
  });
});

describe('protocolo de botín C8', () => {
  const base = { type: 'object:interact', commandId: '11111111-1111-4111-8111-111111111111', sceneEpoch: 1, objectRevision: 0, objectId: 'c8-barrel-01' };
  it('acepta un resultado del d6 únicamente al asignarlo a un objeto', () => {
    expect(dmCommandSchema.safeParse({ ...base, action: 'assign-result', resultId: 6 }).success).toBe(true);
    expect(dmCommandSchema.safeParse({ ...base, action: 'assign-result' }).success).toBe(false);
    expect(dmCommandSchema.safeParse({ ...base, action: 'take-loot', characterId: 'mike', resultId: 6 }).success).toBe(false);
  });
});

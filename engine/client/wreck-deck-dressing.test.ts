import { describe, it, expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';
import { buildWreckDeckDressing } from './wreck-deck-dressing.js';

describe('Pecio: atrezo de cubierta, fauna marina y elementos reactivos', () => {
  it('genera todos los elementos canónicos y fauna requeridos con animaciones reactivas', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const sceneDef = stormwreckBundle.public.scenes.find((s: any) => s.id === 'wreck-ship')!;
    const terrain = sceneDef.terrain!;

    const dressing = buildWreckDeckDressing(scene, terrain);

    // 1. Fauna marina: 5 cangrejos articulados reactivos
    const crabs = dressing.filter(m => m.name.startsWith('wreck-dressing:crab-root'));
    expect(crabs.length).toBe(5);

    // 2. Fauna marina: 4 gaviotas posadas reactivas
    const seagulls = dressing.filter(m => m.name.startsWith('wreck-dressing:gull-root'));
    expect(seagulls.length).toBe(4);

    // 3. Maderos al viento con oscilación física: 4 maderos
    const swayingPlanks = dressing.filter(m => m.name.startsWith('wreck-dressing:swaying-plank:'));
    expect(swayingPlanks.length).toBe(4);

    // 4. Batches de atrezo estático combinados
    const batches = dressing.filter(m => m.name.startsWith('wreck-dressing:batch:'));
    expect(batches.some(m => m.name.includes('sailor-skeleton'))).toBe(true);
    expect(batches.some(m => m.name.includes('decayed-barrel'))).toBe(true);
    expect(batches.some(m => m.name.includes('smashed-crate'))).toBe(true);
    expect(batches.some(m => m.name.includes('deck-hole-opening'))).toBe(true);
    expect(batches.some(m => m.name.includes('broken-stairs'))).toBe(true);
    expect(batches.some(m => m.name.includes('sea-shells'))).toBe(true);

    scene.dispose();
    engine.dispose();
  });
});

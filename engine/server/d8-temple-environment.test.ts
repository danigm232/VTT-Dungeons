import { expect, it } from 'vitest';
import { GameState } from './game';
import { oneShotBundle } from '../../campaigns/one-shot/server';
import { endingFlag } from '../shared/adventure';

it('publishes the confirmed Sylvania loop release and only the visible temple/dinner ending, without automatic decisions', () => {
  const state = new GameState(oneShotBundle);
  expect(state.publicSnapshot().story?.d8TimeLoopBroken).toBeUndefined();
  const before = state.captureDurable();
  for (const ending of oneShotBundle.adventure!.endings) {
    expect(state.resolveAdventureEnding(ending.id,'Confirmación explícita para la prueba',true)).toBe('APPLIED');
    for(const id of ['temple','cafe','market','garden','dinner'])expect(state.publicSnapshot(true,id).story?.d8TimeLoopBroken).toBe(true);
    const visual=ending.id==='ending1'?'celebration':ending.id==='ending2'?'solitude':'darkness';
    for(const id of ['temple','dinner'])expect(state.publicSnapshot(true,id).story?.d8EndingVisual).toBe(visual);
    for(const id of ['cafe','market','garden','mirror'])expect(state.publicSnapshot(true,id).story?.d8EndingVisual).toBeUndefined();
    expect(state.publicSnapshot(true,'mirror').story?.d8TimeLoopBroken).toBeUndefined();
    state.resolveAdventureEnding(null,'',true);
  }
  expect(state.captureDurable().environment).toEqual(before.environment);
  expect(state.captureDurable().gameClock.manuallyPaused).toBe(before.gameClock.manuallyPaused);
  expect(state.publicSnapshot().story?.d8TimeLoopBroken).toBeUndefined();
});

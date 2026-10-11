import { expect,it } from 'vitest';
import type { AudioState } from '../shared/protocol.js';
import { shipAmbienceGains,shipPerspectiveAudio } from './ship-acoustics.js';
const track={playing:true,volume:.8,loop:true,startedAt:1234,offset:12,rate:1,repeats:2};
const state:AudioState={music:{...track},layers:{ocean:{...track},wind:{...track},wood:{...track},storm:{...track}},sfxLoops:{}};
it('softens exterior ambience in the submerged hold without altering playback or the DM state',()=>{
  const before=structuredClone(state),mixed=shipPerspectiveAudio(state,{sceneId:'wreck-ship',surfaceId:'hold-air',cell:{col:13,row:10}});
  expect(mixed.layers.wind.volume).toBeCloseTo(.032);
  expect(mixed.layers.ocean.volume).toBeCloseTo(.496);
  expect(mixed.layers.wood).toMatchObject({playing:true,startedAt:1234,offset:12,rate:1,repeats:2});
  expect(mixed.music).toBe(state.music);expect(mixed.sfxLoops).toBe(state.sfxLoops);expect(state).toEqual(before);
});
it('follows room/deck acoustics and restores the original mix outside',()=>{
  expect(shipAmbienceGains({sceneId:'wreck-ship',surfaceId:'main',cell:{col:13,row:10}}).wind).toBe(.35);
  expect(shipAmbienceGains({sceneId:'wreck-ship',surfaceId:'lower-deck',cell:{col:19,row:16}}).wind).toBe(.22);
  expect(shipPerspectiveAudio(state,{sceneId:'wreck-ship',surfaceId:'main',cell:{col:27,row:15}})).toBe(state);
});
it('does not change other scenes or turn muted/stopped channels on',()=>{
  expect(shipPerspectiveAudio(state,{sceneId:'dragon-rest',surfaceId:'main',cell:{col:13,row:10}})).toBe(state);
  const off=structuredClone(state);off.layers.wind.playing=false;off.layers.ocean.volume=0;
  const mixed=shipPerspectiveAudio(off,{sceneId:'wreck-ship',surfaceId:'hold-air',cell:{col:13,row:10}});
  expect(mixed.layers.wind.playing).toBe(false);expect(mixed.layers.ocean.volume).toBe(0);
});

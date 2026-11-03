import {describe,it,expect} from 'vitest';
import {retreatBoatDeparture} from './retreat-boat-departure.js';
import {dragonRestPorts} from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import type {StepState} from '../shared/protocol.js';
describe('R3 boarding and rowing presentation',()=>{
 it('walks the pier before seating the actor and moving the boat; other passages keep their owner',()=>{
  const p=dragonRestPorts[0]!,step:StepState={from:p.from.cell,to:p.from.cell,startedAt:0,durationMs:p.departureWalk!.durationMs,movementKind:'passage',passage:{portId:p.id,points:p.departureWalk!.points}};
  const start=retreatBoatDeparture(step,0)!,end=retreatBoatDeparture(step,1)!;expect(start.seated).toBe(false);expect(start.boat.z).toBe(119.4);expect(start.actor.z).toBe(113.25);expect(end.seated&&end.rowing).toBe(true);expect(end.boat.z).toBe(end.actor.z);expect(end.boat.z).toBe(124.4);expect(end.stroke).toBeGreaterThan(0);
  expect(retreatBoatDeparture({...step,passage:{...step.passage!,portId:'different-road'}},1)).toBeNull();expect(retreatBoatDeparture(null,.5)).toBeNull();
 });
});

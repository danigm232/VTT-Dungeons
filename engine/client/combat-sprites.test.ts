import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {oneShotBundle} from '../../campaigns/one-shot/server';
import {combatSpriteFrames,combatSpriteRoles} from '../../campaigns/one-shot/public/combat-sprites';
import {GameState} from '../server/game';
import {auditActions} from './d8-animation-audit';
it('installs 64 distinct, measured frames without sharing a generic gesture between new roles',()=>{
  for(const tokenId of ['rogue','silverfarben-hotel'] as const){
    const frames=combatSpriteFrames[tokenId],states=oneShotBundle.public.tokenAnimations[tokenId]!;
    expect(frames).toHaveLength(32);
    expect(new Set(frames.map(f=>JSON.stringify(f))).size).toBe(32);
    const png=readFileSync(resolve('campaigns/one-shot/public',frames[0]!.url.slice(1)));
    expect(png[25]).toBe(6); // RGBA, not an opaque RGB sprite sheet.
    for(const frame of frames){
      expect(frame.x+frame.width).toBeLessThanOrEqual(png.readUInt32BE(16));
      expect(frame.y+frame.height).toBeLessThanOrEqual(png.readUInt32BE(20));
      expect(frame.anchorX).toBeGreaterThan(0);expect(frame.anchorX).toBeLessThan(1);expect(frame.anchorY).toBe(1);
    }
    for(const role of combatSpriteRoles[tokenId])expect(states[role]!.frames).toHaveLength(tokenId==='silverfarben-hotel'?6:4);
    // Silverfarben now uses the same anatomically consistent flinch body;
    // fire/force effects remain the independent attack VFX, not a different body.
    if(tokenId==='silverfarben-hotel')expect(states['hit-fire']!.frames).toEqual(states['hit-arcane']!.frames);
    else expect(states['hit-fire']!.frames).not.toEqual(states['hit-arcane']!.frames);
  }
});
it('audits both real player sheets, including new utility gestures and receiving reactions',()=>{
  const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'sprite-a','aoife');state.claim('b'.repeat(32),'sprite-b','maria');
  const snapshot=state.publicSnapshot(),dm=state.dmState();
  for(const id of ['aoife','maria']){
    const actor=snapshot.entities.find(e=>e.id===id)!;
    const actions=auditActions(actor,snapshot,dm,state.campaign.public);
    for(const actionId of ['basic:help','basic:influence','basic:ready','basic:search','basic:study'])expect(actions.find(a=>a.id===actionId),`${id} ${actionId}`).toMatchObject({coverage:'own'});
    expect(actions.filter(a=>a.coverage==='missing'),id).toEqual([]);
  }
});

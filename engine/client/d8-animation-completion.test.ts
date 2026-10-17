import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { oneShotCampaignDefinition as campaign } from '../../campaigns/one-shot/public/pack.js';
import { d8CompletionAtlases } from '../../campaigns/one-shot/public/generated-completion-atlases.js';
import { basicCombatActionAnimationStates, explorationBasicActionCatalogue } from '../shared/protocol.js';

describe('D8 animation coverage and atlas integrity', () => {
  for (const id of ['rogue', 'silverfarben-hotel', 'anteros', 'anteros-dinner', 'fritz', 'ben', 'margaret', 'boris', 'bartender', 'patron', 'patron-woman', 'cow', 'roses']) it(`${id} has playable general-action, exploration and fall/rise sequences`, () => {
    const states = campaign.tokenAnimations[id]!;
    for (const name of new Set(['idle', 'moving', 'running', 'hit', 'fall', 'prone', 'defeated', 'stand', ...Object.values(basicCombatActionAnimationStates), ...Object.values(explorationBasicActionCatalogue).map(action => action.animation)])) {
      expect(states[name], `${id}/${name}`).toBeDefined(); expect(states[name]!.frames.length).toBeGreaterThan(0);
    }
    for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) expect(states[`running-${direction}`]?.frames.length, `${id}/running-${direction}`).toBeGreaterThan(1);
  });
  it('uses new run PNGs instead of accelerating the existing human walk images', () => {
    for (const id of ['anteros', 'fritz', 'ben', 'margaret', 'boris', 'bartender', 'patron', 'patron-woman']) for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
      const states = campaign.tokenAnimations[id]!;
      expect(JSON.stringify(states[`running-${direction}`]!.frames)).not.toBe(JSON.stringify(states[`direction-${direction}`]!.frames));
    }
  });
  it('uses empty-handed player punches instead of dagger frames', () => {
    for (const id of ['rogue', 'silverfarben-hotel']) {
      const states = campaign.tokenAnimations[id]!;
      expect(states['attack-unarmed']!.frames).toHaveLength(4);
      expect(JSON.stringify(states['attack-unarmed']!.frames)).not.toBe(JSON.stringify(states.attack!.frames));
      expect(JSON.stringify(states['attack-unarmed']!.frames)).toContain(`${id}-unarmed.png`);
    }
  });
  it('has existing PNGs, genuine transparent corners, and bounded crops for every generated pose', () => {
    const pngs = new Map<string, Buffer>();
    for (const atlas of Object.values(d8CompletionAtlases)) for (const frames of Object.values(atlas)) for (const frame of frames!) {
      let bytes = pngs.get(frame.url);
      if (!bytes) {
        bytes = readFileSync(path.join(process.cwd(), 'campaigns/one-shot/public', frame.url)); pngs.set(frame.url, bytes);
        expect(bytes[24]).toBe(8); expect(bytes[25]).toBe(6);
        const chunks: Buffer[] = [];
        for (let offset = 8; offset < bytes.length;) { const length = bytes.readUInt32BE(offset); if (bytes.subarray(offset + 4, offset + 8).toString() === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length)); offset += length + 12; }
        // All PNG filters use a zero predictor at the first pixel of row zero.
        expect(inflateSync(Buffer.concat(chunks))[4]).toBe(0);
      }
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(frame.x + frame.width).toBeLessThanOrEqual(bytes.readUInt32BE(16));
      expect(frame.y + frame.height).toBeLessThanOrEqual(bytes.readUInt32BE(20));
      expect(frame.logicalHeight).toBeGreaterThan(0); expect(frame.anchorY).toBe(1);
    }
    expect(pngs.size).toBe(24);
  });
  it('has eight distinct four-frame drinking directions and transparent bounded cafe crops',()=>{
    const horse=campaign.tokenAnimations['cafe-horse']!,seen=new Set<string>();
    for(const direction of ['n','ne','e','se','s','sw','w','nw']){
      const cycle=horse[`drink-${direction}`]!;expect(cycle.frames).toHaveLength(4);
      seen.add(JSON.stringify(cycle.frames));
    }
    expect(seen.size).toBe(8);
    const cycles=[...Object.entries(horse).filter(([name])=>name.startsWith('drink-')).map(([,cycle])=>cycle!),campaign.tokenAnimations.patron!.drink!,campaign.tokenAnimations.bartender!.drink!];
    for(const cycle of cycles)for(const frame of cycle.frames){
      if(typeof frame==='string')throw new Error('Cafe sprites must use bounded atlas crops');
      const bytes=readFileSync(path.join(process.cwd(),'campaigns/one-shot/public',frame.url));
      expect(bytes[24]).toBe(8);expect(bytes[25]).toBe(6);
      expect(frame.x).toBeGreaterThanOrEqual(0);expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x+frame.width).toBeLessThanOrEqual(bytes.readUInt32BE(16));
      expect(frame.y+frame.height).toBeLessThanOrEqual(bytes.readUInt32BE(20));
      const chunks:Buffer[]=[];
      for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset);if(bytes.subarray(offset+4,offset+8).toString()==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12;}
      expect(inflateSync(Buffer.concat(chunks))[4]).toBe(0);
    }
  });
  it('keeps V52 directional patrons, prayer and cow-leading clips within actual PNG bounds',()=>{
    const pngs=new Map<string,Buffer>();
    for(const id of ['patron','bartender','patron-woman','margaret','rogue','silverfarben-hotel']){
      const clips=Object.entries(campaign.tokenAnimations[id]!).filter(([name])=>name.startsWith('drink-')||name.startsWith('guide-cow-')||name==='pray');
      expect(clips.length).toBeGreaterThan(0);
      for(const [,clip] of clips)for(const frame of clip!.frames){
        if(typeof frame==='string')throw new Error('V52 clips require bounded atlas crops');
        let bytes=pngs.get(frame.url);
        if(!bytes){
          bytes=readFileSync(path.join(process.cwd(),'campaigns/one-shot/public',frame.url));pngs.set(frame.url,bytes);
          const chunks:Buffer[]=[];
          for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset);if(bytes.subarray(offset+4,offset+8).toString()==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12;}
          expect(inflateSync(Buffer.concat(chunks))[4],`${frame.url}: genuine transparent corner`).toBe(0);
        }
        expect(bytes[25]).toBe(6);expect(frame.x+frame.width).toBeLessThanOrEqual(bytes.readUInt32BE(16));expect(frame.y+frame.height).toBeLessThanOrEqual(bytes.readUInt32BE(20));
      }
    }
    expect(pngs.size).toBe(6);
  });
});

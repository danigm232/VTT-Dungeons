import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameState } from './game';
import type { CampaignServerBundle } from './campaign';
const cells = Array.from({length:144},(_,i)=>({col:i%12,row:Math.floor(i/12)}));
const origin = {col:5,row:5}, landing = {col:5,row:3};
const art = {url:'/art/test.png',logicalWidth:48,logicalHeight:48,anchorX:.5,anchorY:1};
function fixture(id='future-player') {
  const bundle: CampaignServerBundle = {public:{schemaVersion:2,campaignId:'jump-fixture',version:'test',title:'Saltos',initialSceneId:'field',
    scenes:[{id:'field',title:'Campo',surfaceId:'ground',movementEnabled:true,background:'/art/test.png',grid:{cols:12,rows:12,tileSize:48,originX:0,originY:0,width:576,height:576},walkable:cells,spawns:[origin],props:[],waves:false}],
    roster:[{id,label:id,archetype:'Explorador',tokenId:'hero',color:'#aabbcc'}],tokens:{hero:art},props:{},tokenAnimations:{},
    audio:{music:'/audio/a.wav',layers:{ocean:'/audio/a.wav',wind:'/audio/a.wav',wood:'/audio/a.wav',storm:'/audio/a.wav'},sfx:{thunder:'/audio/a.wav',creak:'/audio/a.wav',impact:'/audio/a.wav'}}},
    characters:{[id]:{maxHp:10,inventory:[],explorationBasics:['jump'],sheet:{level:1,armorClass:10,speedMeters:9,strengthScore:10,background:'',features:[],attacks:[],spells:[]}}}};
  const state = new GameState(bundle), actor = state.characters.get(id)!;
  let now = Date.now(); vi.spyOn(Date,'now').mockImplementation(()=>now);
  const finishStep = () => { now = actor.step!.startedAt+actor.step!.durationMs+1; state.tick(); };
  return {state,actor,id,finishStep};
}
afterEach(()=>vi.restoreAllMocks());
describe('authoritative jump preparation', () => {
  it.each(['future-player','trinity-new','silver-new'])('animates a complete 3 m retreat → 3 m run → jump for %s',id=>{
    const {state,actor,finishStep}=fixture(id);
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running').ok).toBe(true);
    expect(actor.step).toMatchObject({from:origin,to:{col:5,row:6}});
    finishStep(); expect(actor.cell).toEqual({col:5,row:7}); expect(actor.step?.movementKind).toBeUndefined();
    finishStep(); expect(actor.cell).toEqual({col:5,row:6}); expect(actor.step?.movementKind).toBe('run-up');
    finishStep(); expect(actor.cell).toEqual(origin); expect(actor.step?.movementKind).toBe('run-up');
    finishStep(); expect(actor.step).toMatchObject({from:origin,to:landing,movementKind:'jump'}); expect(actor.facing).toBe('north');
    finishStep(); expect(actor.cell).toEqual(landing); expect(actor.step).toBeNull(); expect(actor.moving).toBe(false);
  });
  it('leaves a standing jump direct and automatically prepares when a legacy client needs a run-up',()=>{
    const {state,actor,id,finishStep}=fixture();
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'standing')).toMatchObject({ok:false,code:'JUMP_NEEDS_RUN_UP'});
    expect(actor.cell).toEqual(origin); expect(actor.step).toBeNull();
    expect(state.declareExplorationBasicAction(id,'jump',undefined,{col:6,row:5},'standing').ok).toBe(true);
    expect(actor.step?.movementKind).toBe('jump'); finishStep();
    actor.cell={...origin};
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing).ok).toBe(true);
    expect(actor.step?.movementKind).not.toBe('jump');
  });
  it('reuses only a recent, continuous approach aimed toward the actual landing',()=>{
    const {state,actor,id,finishStep}=fixture(); actor.cell={col:5,row:7};
    state.cancelPlannedJump(id); expect(state.startStep(actor,'north')).toBe(true); finishStep();
    state.cancelPlannedJump(id); expect(state.startStep(actor,'north')).toBe(true); finishStep();
    expect(actor.cell).toEqual(origin);
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running').ok).toBe(true);
    expect(actor.step?.movementKind).toBe('jump');
  });
  it('uses a diagonal fallback and rejects all blocked approaches before moving',()=>{
    const {state,actor,id}=fixture();
    const scene=state.currentScene(); scene.effectWalls=[{minCol:5.4,maxCol:5.6,minRow:6.2,maxRow:6.8}];
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running').ok).toBe(true);
    expect(actor.step!.to.col).not.toBe(5);
    state.cancelPlannedJump(id); actor.cell={...origin}; actor.step=null;
    scene.effectWalls=[{minCol:2,maxCol:8,minRow:5.5,maxRow:8}];
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running')).toMatchObject({ok:false,code:'JUMP_RUN_UP_BLOCKED'});
    expect(actor.cell).toEqual(origin); expect(actor.step).toBeNull();
  });
  it.each(['manual','condition','disconnect','combat','teleport','landing-blocked'])('cancels future preparation on %s',reason=>{
    const {state,actor,id,finishStep}=fixture(); actor.socketId='owner';
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running').ok).toBe(true);
    if(reason==='manual')state.cancelPlannedJump(id);
    if(reason==='condition')state.conditions[id]=['apresada'];
    if(reason==='disconnect')actor.socketId=null;
    if(reason==='combat')state.combat.active=true;
    if(reason==='teleport')actor.cell={col:9,row:9};
    if(reason==='landing-blocked')state.currentScene().effectWalls=[{minCol:4,maxCol:6,minRow:3.5,maxRow:4.5}];
    finishStep(); expect(actor.step).toBeNull(); expect(actor.cell).not.toEqual(landing);
  });
  it('rejects duplicate commands, missing Strength, excess range and disabled maps without starting retreat',()=>{
    const {state,actor,id}=fixture();
    actor.sheet!.strengthScore=undefined;
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running')).toMatchObject({ok:false,code:'STRENGTH_REQUIRED'});
    actor.sheet!.strengthScore=10;
    expect(state.declareExplorationBasicAction(id,'jump',undefined,{col:5,row:1},'running')).toMatchObject({ok:false,code:'JUMP_OUT_OF_RANGE'});
    state.currentScene().movementEnabled=false;
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running')).toMatchObject({ok:false,code:'JUMP_BLOCKED'});
    state.currentScene().movementEnabled=true;
    state.declareExplorationBasicAction(id,'jump',undefined,landing,'running');
    expect(state.declareExplorationBasicAction(id,'jump',undefined,landing,'running')).toMatchObject({ok:false,code:'JUMP_IN_PROGRESS'});
  });
});

import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {oneShotCampaignDefinition} from '../../campaigns/one-shot/public/pack';
import type {AudioState} from '../../engine/shared/protocol';
const log=vi.hoisted(()=>({volume:[] as [number,number][],next:0}));
vi.mock('howler',()=>({Howler:{ctx:{state:'running',resume:async()=>{}},volume:()=>{}},Howl:class{
  private gain=0;
  state(){return 'loaded';}duration(){return 30;}playing(){return true;}play(){return ++log.next;}
  stop(){}unload(){}pause(){}fade(_from:number,to:number){this.gain=to;}loop(){}rate(){}off(){}on(){}once(){}seek(){}
  volume(value?:number,id?:number){if(value!==undefined){this.gain=value;if(id!==undefined)log.volume.push([value,id]);return this;}return this.gain;}
}}));
import {AudioDirector} from '../../apps/web/audio';
const track=(playing:boolean)=>({assetId:'',playing,volume:.1,offset:0,startedAt:Date.now(),loop:true,rate:1,repeats:1});
const mix=(playing=true):AudioState=>({music:track(playing),layers:{ocean:track(playing),wind:track(false),wood:track(false),storm:track(false)},sfxLoops:{}});
const scene=oneShotCampaignDefinition.scenes.find(scene=>scene.id==='cafe')!;
const context=()=>({sceneId:scene.id,sceneEpoch:1,runtimeEpoch:'test',scene,entities:scene.stageActors!.map(actor=>({...actor,moving:false,hp:4})),combat:{active:false}} as unknown as NonNullable<Parameters<AudioDirector['setSceneAmbience']>[0]>);
describe('quiet incidental scene audio',()=>{
  beforeEach(()=>{vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0);log.volume=[];log.next=0;});
  afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
  it('silences only the confirmed dark ending and restores the saved mixer on leaving it',()=>{
    const audio=new AudioDirector(oneShotCampaignDefinition.audio),state=mix(),before=structuredClone(state);
    audio.apply(state);const music=(audio as any).channels.get('music');expect(music.volume()).toBeGreaterThan(0);
    audio.setSceneAmbience({...context(),sceneId:'dinner',story:{wreckDisappeared:false,d8TimeLoopBroken:true,d8EndingVisual:'darkness'}});
    expect(music.volume()).toBe(0);expect(state).toEqual(before);
    audio.setSceneAmbience({...context(),sceneId:'dinner',story:{wreckDisappeared:false,d8TimeLoopBroken:true,d8EndingVisual:'solitude'}});
    expect(music.volume()).toBeCloseTo(state.music.volume);audio.reset();
  });
  it('plays a soft glass cue once despite repeated snapshots and mixer updates',async()=>{
    const audio=new AudioDirector(oneShotCampaignDefinition.audio),play=vi.spyOn(audio,'playSfx');await audio.unlock();audio.apply(mix());
    for(let i=0;i<20;i++)audio.setSceneAmbience(context());
    vi.advanceTimersByTime(18001);expect(play).toHaveBeenCalledTimes(1);expect(play).toHaveBeenCalledWith('d8-night-sfx-cafe-glass',.14);audio.reset();
  });
  it('stops cues during combat, after patrons leave, when muted and on reset',async()=>{
    const audio=new AudioDirector(oneShotCampaignDefinition.audio),play=vi.spyOn(audio,'playSfx');await audio.unlock();audio.apply(mix());
    const current=context();audio.setSceneAmbience(current);audio.setSceneAmbience({...current,combat:{...current.combat,active:true}});vi.advanceTimersByTime(60000);expect(play).not.toHaveBeenCalled();
    audio.setSceneAmbience({...current,entities:current.entities.map(actor=>({...actor,cell:{...actor.cell,row:actor.cell.row+1}}))});vi.advanceTimersByTime(60000);expect(play).not.toHaveBeenCalled();
    audio.setSceneAmbience(current);audio.apply(mix(false));vi.advanceTimersByTime(60000);expect(play).not.toHaveBeenCalled();
    const silent=mix();silent.music.volume=0;for(const layer of Object.values(silent.layers))layer.volume=0;
    audio.apply(silent);vi.advanceTimersByTime(60000);expect(play).not.toHaveBeenCalled();
    audio.apply(mix());audio.setSceneAmbience(current);audio.reset();vi.advanceTimersByTime(60000);expect(play).not.toHaveBeenCalled();
  });
  it('does not replay a previous scene timer after a scene transition',async()=>{
    const audio=new AudioDirector(oneShotCampaignDefinition.audio),play=vi.spyOn(audio,'playSfx');await audio.unlock();audio.apply(mix());audio.setSceneAmbience(context());
    vi.advanceTimersByTime(17000);audio.setSceneAmbience({...context(),sceneId:'market',sceneEpoch:2});vi.advanceTimersByTime(2000);expect(play).not.toHaveBeenCalled();audio.reset();
  });
  it('keeps incidental gain separate from a subsequent manual effect',()=>{
    const audio=new AudioDirector(oneShotCampaignDefinition.audio);audio.playSfx('d8-night-sfx-cafe-glass',.14);audio.playSfx('d8-night-sfx-cafe-glass');
    expect(log.volume).toEqual([[.14,1],[.5,2]]);audio.reset();
  });
});

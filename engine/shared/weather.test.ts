import { describe, expect, it } from 'vitest';
import { advanceClimate, emptyClimateState } from './game-time.js';
import { seaState, strongWind, weatherRuleNotices, weatherLight } from './weather.js';
import { dmCommandSchema, type EnvironmentState } from './protocol.js';
const clear:EnvironmentState={storm:false,lightning:false,stormIntensity:0};
describe('clima unificado y fuentes de reglas',()=>{
  it('atenúa el cielo y sincroniza destellos breves, con movimiento reducido sin flashes',()=>{
    const storm={...clear,storm:true,lightning:true,stormIntensity:.8};
    const samples=Array.from({length:1700},(_,i)=>weatherLight(storm,i/100));
    expect(samples.some(s=>s.flash>.7)).toBe(true);expect(samples.filter(s=>s.flash>0).length).toBeLessThan(40);
    expect(weatherLight(storm,5,true).flash).toBe(0);expect(weatherLight(clear,5)).toEqual({cloud:1,flash:0});
  });
  it('separa mar e inundación, permite calma explícita y conserva escenas antiguas',()=>{
    expect(seaState({...clear,floodTarget:1},.35)).toBe(.35);
    expect(seaState({...clear,seaIntensity:0,storm:true,stormIntensity:1},.8)).toBe(0);
    expect(seaState({...clear,windIntensity:1},.2)).toBe(.85);
    const command={type:'environment',commandId:crypto.randomUUID(),sceneEpoch:0,storm:false,seaIntensity:null,weatherRules:true};
    expect(dmCommandSchema.safeParse(command).success).toBe(true);
    expect(dmCommandSchema.safeParse({...command,seaIntensity:2}).success).toBe(false);
  });
  it('dispersa la niebla con viento fuerte sin borrar nieve ni elevar la inundación',()=>{
    const state={...emptyClimateState(),fogDensity:.9,snowCoverage:.5,snowDepthCm:4};
    const climate=advanceClimate(state,{...clear,temperatureC:-4,fogTarget:1,windIntensity:1},180);
    expect(climate.fogDensity).toBeLessThan(.05);expect(climate.snowCoverage).toBe(.5);expect(climate.floodLevel).toBe(0);
  });
  it('distingue lluvia intensa, viento, niebla y extremos térmicos sin inventar CD para el mar',()=>{
    expect(strongWind({...clear,windIntensity:.65})).toBe(false);
    const notices=weatherRuleNotices({...clear,precipitation:'rain',precipitationLevel:3,windIntensity:.8,temperatureC:-18,seaIntensity:1},{...emptyClimateState(),fogDensity:.8});
    expect(notices.map(n=>n.id)).toEqual(['heavy-precipitation','strong-wind','fog','cold','sea']);
    expect(weatherRuleNotices({...clear,temperatureC:38},emptyClimateState()).some(n=>n.id==='heat')).toBe(true);
    expect(notices.find(n=>n.id==='sea')!.detail).toContain('No existe una CD universal');
  });
});

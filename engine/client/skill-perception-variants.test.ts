import {describe,it,expect} from 'vitest';
import {skillMicroScenes} from '../../apps/web/ui/skill-scenes';
import {perceptionGuest,skillPerceptionVariants,withPerceptionVariant} from '../../apps/web/ui/skill-perception-variants';
import {sampleTrack} from './skill-micro-scene';

describe('visitantes de Percepción',()=>{
  it('elige una variante por entrada sin modificar la definición compartida',()=>{
    const source=skillMicroScenes.find(s=>s.id==='perception')!;
    for(const variant of skillPerceptionVariants){
      const scene=withPerceptionVariant(source,variant.id);
      expect(scene.variant).toBe(variant.id);
      expect(scene.successAnimation.caption).toContain(variant.label);
      const prop=scene.props.find(p=>p.id==='hidden-visitor')!;
      expect(sampleTrack(prop.ambient,0).opacity).toBe(0);
      expect(sampleTrack(prop.failure,1).opacity).toBe(0);
      expect(sampleTrack(prop.failure,1).x).toBeGreaterThan(350);
      if(variant.id!=='owl'){
        expect(prop.y).toBe(202);
        for(let t=0;t<=1;t+=.05)expect(sampleTrack(prop.success,t).y??0).toBe(0);
      }
    }
    expect(source.variant).toBeUndefined();
    expect(source.props.some(p=>p.id==='hidden-owl')).toBe(true);
    expect(withPerceptionVariant(source,undefined,()=>.999).variant).toBe('mike');
  });
  it('reutiliza personajes existentes con su altura y deja las criaturas a su atlas',()=>{
    expect(perceptionGuest('mia')?.asset.worldHeightMeters).toBe(1.3);
    expect(perceptionGuest('trinity')?.asset.worldHeightMeters).toBe(1.05);
    expect(perceptionGuest('mike')?.asset.worldHeightMeters).toBe(1.8);
    const silver=perceptionGuest('silverfarben')!;
    expect(silver.asset.worldHeightMeters).toBe(1.37);
    expect(silver.animations['running-e']?.frames).toHaveLength(6);
    expect(perceptionGuest('goblin')).toBeUndefined();
  });
});

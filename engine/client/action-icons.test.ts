import {describe,expect,it} from 'vitest';
import {ACTION_ICON_CATALOGUE,actionIcon} from './action-icons';
import {readFileSync} from 'node:fs';
describe('shared action artwork catalogue',()=>{
  it('gives all nine confirmed Silverfarben spells individual recognizable artwork',()=>{
    const names=['Remendar','Prestidigitación','Proyectil de fuego','Encontrar familiar','Disco flotante','Nube de niebla','Identificar','Caída de pluma','Misil mágico'];
    const icons=names.map(name=>actionIcon('exploration-action',name));
    expect(new Set(icons.map(icon=>icon.id)).size).toBe(9);
    expect(new Set(icons.map(icon=>icon.svg)).size).toBe(9);
    for(const icon of icons){expect(icon.svg).toContain('<path');expect(icon.id).not.toBe('exploration-action');}
  });
  it('uses the same fog icon in and outside combat, independent of translated labels',()=>{
    expect(actionIcon('fog-cloud-exploration','Desconocido')).toEqual(actionIcon('fog-cloud','Nube de niebla'));
    expect(actionIcon('combat-action','Nube de niebla · concentración · 36 m').id).toBe('fog-cloud');
  });
  it('has no duplicated ids or missing drawings in the extended catalogue',()=>{
    expect(ACTION_ICON_CATALOGUE.length).toBeGreaterThan(150);
    expect(new Set(ACTION_ICON_CATALOGUE.map(icon=>icon.id)).size).toBe(ACTION_ICON_CATALOGUE.length);
    expect(new Set(ACTION_ICON_CATALOGUE.map(icon=>actionIcon(icon.id,'').svg)).size).toBe(ACTION_ICON_CATALOGUE.length);
    for(const icon of ACTION_ICON_CATALOGUE)expect(actionIcon(icon.id,'').svg).toMatch(/<path d="[Mm]/);
  });
  it('keeps different weapon/action identities and never interpolates user input into SVG',()=>{
    expect(actionIcon('dagger','Daga').svg).not.toBe(actionIcon('thrown-dagger','Lanzar daga').svg);
    expect(actionIcon('unknown','<script>alert(1)</script>').svg).not.toContain('script');
    expect(actionIcon('fire-bolt','Proyectil de fuego').color).not.toBe(actionIcon('fog-cloud','Nube de niebla').color);
    const player=readFileSync('apps/web/player.ts','utf8');
    expect(player).toContain('source.dataset.actionId');expect(player).toContain('glyph.innerHTML=icon.svg');
  });
});

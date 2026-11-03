import {expect,it} from 'vitest';
import {INITIATIVE_MARGIN_CM,INITIATIVE_MARGIN_PX,normalizeInitiativePosition,migratedInitiativePosition,initiativeCameraInsets} from './initiative-layout';
import {combatCameraFrame} from './combat-camera';
import {readUiPreferences,writeUiPreferences,type PreferenceStorage} from './ui-preferences';
import {readFileSync} from 'node:fs';
it('defaults old/invalid preferences to the top and restores all three positions',()=>{
  for(const value of [undefined,null,'bottom','RIGHT',{},0])expect(normalizeInitiativePosition(value)).toBe('top');
  for(const value of ['right','left','top'])expect(normalizeInitiativePosition(value)).toBe(value);
  expect(INITIATIVE_MARGIN_CM).toBe(1.5);expect(INITIATIVE_MARGIN_PX).toBeCloseTo(56.6929,3);
});
it('moves existing side layouts once, but respects later explicit choices',()=>{
  for(const position of ['right','left','top',undefined])expect(migratedInitiativePosition(position,undefined)).toBe('top');
  for(const position of ['right','left','top'])expect(migratedInitiativePosition(position,2)).toBe(position);
});
it('persists placement independently of campaign state and preserves the fallback',()=>{
  const values=new Map<string,string>(),storage:PreferenceStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);}};
  const valid=(value:unknown):value is {initiativePosition:'left'}=>Boolean(value&&typeof value==='object'&&(value as any).initiativePosition==='left');
  writeUiPreferences('test-display',{initiativePosition:'left'},storage);
  expect(readUiPreferences('test-display',{initiativePosition:'left'},valid,storage)).toEqual({initiativePosition:'left'});
});
it('wires the setting and uses the same CSS centimeter margin without transformed tooltip ancestors',()=>{
  const css=readFileSync('apps/web/player-combat.css','utf8'),player=readFileSync('apps/web/player.ts','utf8');
  expect(css).toContain(`--initiative-margin:${INITIATIVE_MARGIN_CM}cm`);
  for(const position of ['right','left','top'])expect(player).toContain(`value="${position}"`);
  expect(player).toContain("$('combatInitiative').dataset.position=playerDisplaySettings.initiativePosition");
  expect(player).toContain("migratedInitiativePosition(saved.initiativePosition,saved.initiativeLayoutVersion)");
  expect(css).toContain('height:max-content');expect(css).toContain('margin-block:auto');
  const rootRule=/body\.combat-active \.combat-initiative\{([^}]+)\}/.exec(css)?.[1];
  const topRule=/body\.combat-active \.combat-initiative\[data-position="top"\]\{([^}]+)\}/.exec(css)?.[1];
  expect(rootRule).toContain('transform:none');expect(topRule).toContain('transform:none');
});
it('moves the camera-safe strip to the chosen edge on phone/landscape/desktop without changing DM defaults',()=>{
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1600,height:900}]){
    const grid={width:960,height:720};
    for(const position of ['right','left','top'] as const){
      const frame=combatCameraFrame(grid,viewport,position),inset=initiativeCameraInsets(position);
      expect(frame.safe.left).toBe(inset.left);expect(frame.safe.top).toBe(inset.top);
      expect(viewport.width-frame.safe.left-frame.safe.width).toBeCloseTo(inset.right);
      expect(frame.safe.width).toBeGreaterThan(0);expect(frame.safe.height).toBeGreaterThan(0);
    }
  }
  expect(combatCameraFrame({width:960,height:720},{width:390,height:844}).safe.top).toBe(116);
});

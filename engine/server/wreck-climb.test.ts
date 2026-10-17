import {describe,it,expect} from 'vitest';
import {GameState} from './game.js';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
import {wreckPorts} from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
describe('cofa: adaptación CD 10 bajo autoridad del DM',()=>{
  it('solicita el dado, no duplica solicitudes y conserva posición/PG al fallar',()=>{
    const state=new GameState(stormwreckBundle),c=state.characters.get('mike')!,port=wreckPorts.find(p=>p.id==='P10')!;
    state.focusScene('wreck-ship');
    Object.assign(c,{sceneId:'wreck-ship',surfaceId:'main',cell:{...port.from.cell},sessionToken:'a'.repeat(32),socketId:'test'});
    const hp=c.hp;
    expect(state.playerPrivate(c.sessionToken!).availableInteractions.find(a=>a.targetId==='P10')).toMatchObject({cell:port.from.cell,surfaceId:'main'});
    expect(state.requestCofaClimb('mike')).toBe('REQUESTED');expect(state.requestCofaClimb('mike')).toBe('REQUESTED');expect(state.interactions).toHaveLength(1);
    expect(state.interactionRequestValid(state.interactions[0]!)).toBe(true);
    expect(state.traversePort('mike','P10','forward')).toBe('COFA_CHECK_REQUIRED');
    expect(state.traversePort('mike','P10','forward',false,9)).toBe('COFA_CHECK_FAILED');expect(c.hp).toBe(hp);expect(c.cell).toEqual(port.from.cell);expect(c.step).toBeNull();
    expect(state.traversePort('mike','P10','forward',false,10)).toBe('MOVED');expect(c.step?.movementKind).toBe('climb');expect(state.interactions[0]!.status).toBe('resolved');
  });
  it('invalida una solicitud distante y permite que el DM omita la adaptación',()=>{
    const state=new GameState(stormwreckBundle),c=state.characters.get('mike')!,port=wreckPorts.find(p=>p.id==='P10')!;
    state.focusScene('wreck-ship');
    Object.assign(c,{sceneId:'wreck-ship',surfaceId:'main',cell:{...port.from.cell},sessionToken:'a'.repeat(32),socketId:'test'});
    expect(state.requestCofaClimb('mike')).toBe('REQUESTED');c.cell.col-=2;expect(state.interactionRequestValid(state.interactions[0]!)).toBe(false);
    expect(state.requestCofaClimb('mike')).toBe('TOO_FAR');c.cell={...port.from.cell};state.progress['wreck.cofa-free-climb']=true;
    expect(state.traversePort('mike','P10','forward')).toBe('MOVED');
  });
  it('permite explorar la casilla de llegada sin bajar y ofrece descenso explícito sin CD',()=>{
    const state=new GameState(stormwreckBundle),c=state.characters.get('mike')!,port=wreckPorts.find(p=>p.id==='P10')!;
    state.focusScene('wreck-ship');Object.assign(c,{sceneId:'wreck-ship',surfaceId:'crow',cell:{...port.to.cell},sessionToken:'a'.repeat(32),socketId:'test'});
    expect(port.autoDirection).toBe('forward');
    expect((state as any).autoTraverseAfterStep(c,c.cell)).toBe(false);expect(c.surfaceId).toBe('crow');expect(c.step).toBeNull();
    expect(state.playerPrivate(c.sessionToken!).availableInteractions.find(a=>a.targetId==='P10')).toMatchObject({label:'Bajar de la cofa · escalera de cuerda',surfaceId:'crow'});
    expect(state.requestCofaClimb('mike')).toBe('MOVED');expect(c.step).toMatchObject({movementKind:'climb',fromSurfaceId:'crow',toSurfaceId:'main',durationMs:10000});expect(state.interactions).toHaveLength(0);
  });
});

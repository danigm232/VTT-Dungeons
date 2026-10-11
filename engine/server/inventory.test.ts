import { describe, expect, it, vi } from 'vitest';
import { Server } from 'socket.io';
import { GameServer, GameState } from './game';
import { oneShotBundle } from '../../campaigns/one-shot/server';
import { inventoryUpdateSchema, inventoryUseSchema } from '../shared/protocol';
import { carriedLightRadiusMeters } from '../shared/carried-light';

const token = 'c'.repeat(32);
function harness() {
  const io = new Server(), emitted = vi.fn(), server = new GameServer(io, 'inventory-test', oneShotBundle);
  vi.spyOn(io, 'to').mockReturnValue({ emit: emitted } as never);
  const socket = { id: 'inventory-socket', emit: vi.fn() };
  expect(server.state.claim(token, socket.id, 'aoife').ok).toBe(true);
  const internal = server as unknown as {
    handleInventory(socket: unknown, token: string, raw: unknown): void;
    handleInventoryUse(socket: unknown, token: string, raw: unknown): void;
  };
  return { server, character: server.state.characters.get('aoife')!, socket, internal, emitted };
}
describe('authoritative backpack commands', () => {
  it('matches persistence limits and strictly validates quick uses', () => {
    expect(inventoryUpdateSchema.safeParse({ commandId: crypto.randomUUID(), items: Array(100).fill('a'.repeat(200)) }).success).toBe(true);
    expect(inventoryUpdateSchema.safeParse({ commandId: crypto.randomUUID(), items: Array(101).fill('Mapa') }).success).toBe(false);
    expect(inventoryUseSchema.safeParse({ commandId: crypto.randomUUID(), index: -1, expectedItem: 'Ración', action: 'consume' }).success).toBe(false);
    expect(inventoryUseSchema.safeParse({ commandId: crypto.randomUUID(), index: 0, expectedItem: 'Daga', action: 'throw' }).success).toBe(false);
  });
  it('does not overwrite ammunition consumed since editing began', () => {
    const { server, character, socket, internal } = harness();
    character.inventory = ['4 dagas', 'Mapa']; const base = [...character.inventory];
    character.inventory[0] = 'dagas ×3';
    internal.handleInventory(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), expectedItems: base, items: ['4 dagas', 'Mapa', 'Cuerda'] });
    expect(socket.emit).toHaveBeenCalledWith('command:result', expect.objectContaining({ ok: false, code: 'INVENTORY_CHANGED' }));
    expect(character.inventory).toEqual(['dagas ×3', 'Mapa']);
  });
  it('consumes once when the same command is retried and leaves other stock intact', () => {
    const { server, character, socket, internal } = harness(); character.inventory = ['Raciones ×3', 'Mapa'];
    const command = { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), index: 0, expectedItem: 'Raciones ×3', action: 'consume' };
    internal.handleInventoryUse(socket, token, command); internal.handleInventoryUse(socket, token, command);
    expect(character.inventory).toEqual(['Raciones ×2', 'Mapa']);
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ ok: true, code: 'INVENTORY_CONSUMED' }));
    internal.handleInventoryUse(socket, token, { ...command, commandId: crypto.randomUUID() });
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ ok: false, code: 'INVENTORY_CHANGED' }));
  });
  it('rejects stolen controller sockets and commands reused with different content', () => {
    const { server, character, socket, internal } = harness(); character.inventory = ['2 antorchas'];
    const command = { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), index: 0, expectedItem: '2 antorchas', action: 'light' };
    internal.handleInventoryUse({ ...socket, id: 'other-socket' }, token, command);
    expect(character.inventory).toEqual(['2 antorchas']);
    internal.handleInventoryUse(socket, token, command);
    internal.handleInventoryUse(socket, token, { ...command, action: 'consume' });
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ ok: false, code: 'COMMAND_ID_REUSED' }));
  });
  it('broadcasts light immediately, persists it and does not regenerate a torch', () => {
    const { server, character, socket, internal, emitted } = harness(); character.inventory = ['2 antorchas'];
    internal.handleInventoryUse(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), index: 0, expectedItem: '2 antorchas', action: 'light' });
    expect(carriedLightRadiusMeters(character.inventory)).toBe(6);
    expect(emitted).toHaveBeenCalledWith('world:snapshot', expect.anything());
    const restored = new GameState(oneShotBundle); restored.restoreDurable(server.state.captureDurable());
    expect(carriedLightRadiusMeters(restored.characters.get('aoife')!.inventory)).toBe(6);
    internal.handleInventoryUse(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), index: 1, expectedItem: 'Antorcha encendida', action: 'extinguish' });
    expect(character.inventory).toEqual(['antorchas ×1']);
    expect(carriedLightRadiusMeters(character.inventory)).toBe(0);
  });
  it('allows explicit editing but does not grant free uses during combat', () => {
    const { server, character, socket, internal } = harness(); character.inventory = ['2 pociones']; server.state.combat.active = true;
    internal.handleInventoryUse(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), index: 0, expectedItem: '2 pociones', action: 'consume' });
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ ok: false, code: 'INVENTORY_COMBAT_ACTION_REQUIRED' }));
    expect(character.inventory).toEqual(['2 pociones']);
    internal.handleInventory(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), expectedItems: ['2 pociones'], items: ['pociones ×1'] });
    expect(character.inventory).toEqual(['pociones ×1']);
  });
  it('does not let unconscious characters consume supplies', () => {
    const { server, character } = harness(); character.inventory = ['Ración']; character.hp = 0;
    expect(server.state.useBackpackItem(character.id, 0, 'Ración', 'consume')).toMatchObject({ ok: false, code: 'INCAPACITATED' });
    expect(character.inventory).toEqual(['Ración']);
  });
  it('keeps legacy manual-edit clients compatible and emits updated lighting', () => {
    const { server, character, socket, internal, emitted } = harness();
    internal.handleInventory(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), items: ['Antorcha encendida', 'Cuerda'] });
    expect(character.inventory).toEqual(['Antorcha encendida', 'Cuerda']);
    expect(emitted).toHaveBeenCalledWith('world:snapshot', expect.anything());
  });
  it('acknowledges stale runtimes with their command ID so the UI can unlock', () => {
    const { character, socket, internal } = harness(); character.inventory = ['Ración'];
    const commandId = crypto.randomUUID();
    internal.handleInventoryUse(socket, token, { runtimeEpoch: crypto.randomUUID(), commandId, index: 0, expectedItem: 'Ración', action: 'consume' });
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ commandId, ok: false, code: 'STALE_RUNTIME' }));
    expect(character.inventory).toEqual(['Ración']);
  });
  it('compares a saved legacy description exactly, even if it has whitespace', () => {
    const { server, character, socket, internal } = harness(); character.inventory = ['  Mapa secreto  '];
    internal.handleInventory(socket, token, { runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), expectedItems: ['  Mapa secreto  '], items: ['Mapa secreto', 'Cuerda'] });
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ ok: true, code: 'INVENTORY_SAVED' }));
    expect(character.inventory).toEqual(['Mapa secreto', 'Cuerda']);
  });
});

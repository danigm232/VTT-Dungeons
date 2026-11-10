import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as client, Socket as ClientSocket } from 'socket.io-client';
import { once } from 'node:events';
import crypto from 'node:crypto';
import { GameServer } from './game';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server';
import { PROTOCOL_VERSION, OBJECT_MODEL_VERSION, WorldSnapshot, DmState } from '../shared/protocol';

describe('DM scene change and player transition', () => {
  it('moves both DM and player to the new scene and synchronizes snapshots when DM changes scene', async () => {
    const http = createServer();
    const io = new Server(http);
    const game = new GameServer(io, 'dm-secret', stormwreckBundle);
    game.start();
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    const port = (http.address() as { port: number }).port;

    const sockets: ClientSocket[] = [];
    const open = async (role: string, token?: string) => {
      const socket = client(`http://127.0.0.1:${port}`, {
        autoConnect: false,
        reconnection: false,
        transports: ['websocket'],
        extraHeaders: { Cookie: 'dnd_dm=dm-secret' },
        auth: { role, sessionToken: token, protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION }
      });
      sockets.push(socket);
      const snapshot = once(socket, 'world:snapshot');
      socket.connect();
      return { socket, snapshot: (await snapshot)[0] as WorldSnapshot };
    };

    try {
      game.state.applyClockControl('pause');
      const dm = await open('dm');
      const playerToken = 'b'.repeat(32);
      const player = await open('player', playerToken);

      // Claim a character for player
      game.state.claim(playerToken, player.socket.id!, 'mike');

      const initialScene = game.state.sceneId;
      expect(initialScene).toBe('dragon-rest');

      // Player starts at initial scene
      const initialPlayerSnapshot = game['snapshotForSocket'](io.sockets.sockets.get(player.socket.id!)!);
      expect(initialPlayerSnapshot.sceneId).toBe('dragon-rest');

      // Prepare promises for next world:snapshot on both DM and player
      const dmNextSnapshotPromise = once(dm.socket, 'world:snapshot');
      const playerNextSnapshotPromise = once(player.socket, 'world:snapshot');
      const dmCommandResultPromise = once(dm.socket, 'command:result');

      // DM issues scene command to 'wreck-ship'
      dm.socket.emit('dm:command', {
        runtimeEpoch: game.state.runtimeEpoch,
        sceneEpoch: game.state.sceneEpoch,
        commandId: crypto.randomUUID(),
        type: 'scene',
        sceneId: 'wreck-ship'
      });

      const [result] = await dmCommandResultPromise;
      expect(result).toMatchObject({ ok: true, code: 'APPLIED' });

      // Verify game state updated
      expect(game.state.sceneId).toBe('wreck-ship');
      expect(game.state.characters.get('mike')?.sceneId).toBe('wreck-ship');

      // Verify DM received snapshot with new scene
      const [dmSnapshot] = await dmNextSnapshotPromise as [WorldSnapshot];
      expect(dmSnapshot.sceneId).toBe('wreck-ship');

      // Verify player also received snapshot with new scene!
      const [playerSnapshot] = await playerNextSnapshotPromise as [WorldSnapshot];
      expect(playerSnapshot.sceneId).toBe('wreck-ship');
    } finally {
      for (const socket of sockets) socket.disconnect();
      game.stop();
      await io.close();
      http.close();
    }
  }, 30000);

  it('clears DM preview when changing table scene so DM is not trapped in preview', async () => {
    const http = createServer();
    const io = new Server(http);
    const game = new GameServer(io, 'dm-secret', stormwreckBundle);
    game.start();
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    const port = (http.address() as { port: number }).port;

    const sockets: ClientSocket[] = [];
    const open = async (role: string) => {
      const socket = client(`http://127.0.0.1:${port}`, {
        autoConnect: false,
        reconnection: false,
        transports: ['websocket'],
        extraHeaders: { Cookie: 'dnd_dm=dm-secret' },
        auth: { role, protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION }
      });
      sockets.push(socket);
      const snapshot = once(socket, 'world:snapshot');
      socket.connect();
      return { socket, snapshot: (await snapshot)[0] as WorldSnapshot };
    };

    try {
      const dm = await open('dm');
      game.state.applyClockControl('pause');
      await new Promise(resolve => setTimeout(resolve, 50));

      // DM previews wreck-ship
      let p = once(dm.socket, 'world:snapshot');
      dm.socket.emit('dm:view', { runtimeEpoch: game.state.runtimeEpoch, sceneId: 'wreck-ship' });
      expect((await p)[0].sceneId).toBe('wreck-ship');

      // Now DM changes table scene back to dragon-rest
      const dmNextSnapshot = once(dm.socket, 'world:snapshot');
      const dmCommandResult = once(dm.socket, 'command:result');

      dm.socket.emit('dm:command', {
        runtimeEpoch: game.state.runtimeEpoch,
        sceneEpoch: game.state.sceneEpoch,
        commandId: crypto.randomUUID(),
        type: 'scene',
        sceneId: 'dragon-rest'
      });

      const [res] = await dmCommandResult;
      expect(res.ok).toBe(true);

      const [snap] = await dmNextSnapshot as [WorldSnapshot];
      expect(snap.sceneId).toBe('dragon-rest');

      const dmState = game['dmState'](io.sockets.sockets.get(dm.socket.id!)!) as DmState;
      expect(dmState.sceneId).toBe('dragon-rest');
      expect(dmState.tableSceneId).toBe('dragon-rest');
    } finally {
      for (const socket of sockets) socket.disconnect();
      game.stop();
      await io.close();
      http.close();
    }
  }, 30000);
});

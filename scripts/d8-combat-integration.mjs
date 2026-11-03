import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const serverBuild = path.resolve(root, process.env.DUNGEONS_SERVER_BUILD || 'dist/server');
const { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } = await import(pathToFileURL(path.join(serverBuild, 'engine/shared/protocol.js')).href);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-d8-combat-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = async () => {
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const address = probe.address(), port = typeof address === 'object' && address ? address.port : 0;
  await new Promise(resolve => probe.close(resolve)); return port;
};
const port = await freePort(), base = `http://127.0.0.1:${port}`;
let child;
const wait = (socket, event, predicate = () => true, timeout = 5_000) => new Promise((resolve, reject) => {
  const waiting = new Error(`Timeout esperando ${event}`);
  const timer = setTimeout(() => { socket.off(event, handler); reject(waiting); }, timeout);
  const handler = value => { if (!predicate(value)) return; clearTimeout(timer); socket.off(event, handler); resolve(value); };
  socket.on(event, handler);
});
const emitResult = (socket, event, payload) => {
  const result = wait(socket, 'command:result', value => value.commandId === payload.commandId);
  socket.emit(event, payload); return result;
};
const connect = (auth, extraHeaders) => new Promise((resolve, reject) => {
  const socket = io(base, { autoConnect: false, forceNew: true, transports: ['websocket'], auth: { protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, ...auth }, ...(extraHeaders ? { extraHeaders } : {}) });
  socket.once('runtime:reset', value => socket.__runtime = value);
  socket.on('dm:state', value => socket.__dmState = value);
  socket.on('world:snapshot', value => socket.__world = value);
  const timer = setTimeout(() => reject(new Error('Timeout conectando socket')), 5_000);
  socket.once('connect', () => { clearTimeout(timer); resolve(socket); }); socket.once('connect_error', reject); socket.connect();
});
async function launch() {
  child = spawn(process.execPath, [path.join(serverBuild, 'apps/server/index.js')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DUNGEONS_DATA_DIR: temporary, DUNGEONS_CAMPAIGN: 'd8-night-private', DUNGEONS_TEST_CHILD: '1' } });
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => {output += chunk;process.stderr.write(chunk);});
  for (let attempt = 0; attempt < 600; attempt++) {
    if (child.exitCode !== null) throw new Error(`Servidor D8 terminó: ${output}`);
    try { if ((await fetch(`${base}/api/campaign`)).ok) return; } catch { /* starting */ }
    await delay(100);
  }
  throw new Error(`Servidor D8 no inició: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.send('shutdown'); await Promise.race([exited, delay(12_000).then(() => { throw new Error('Timeout de cierre'); })]);
}

const sockets = [];
try {
  await launch();
  const login = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: '{}' });
  assert.equal(login.status, 200); const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
  const dm = await connect({ role: 'dm' }, { Cookie: cookie }); sockets.push(dm);
  const maria = await connect({ role: 'player', sessionToken: 'a'.repeat(32) }); sockets.push(maria);
  const aoife = await connect({ role: 'player', sessionToken: 'b'.repeat(32) }); sockets.push(aoife);
  const projector = await connect({ role: 'projector' }); sockets.push(projector);
  const dmInitial = dm.__dmState ?? await wait(dm, 'dm:state'), initialWorld = dm.__world ?? await wait(dm, 'world:snapshot');
  const mariaClaimed = wait(maria, 'player:private', value => value.characterId === 'maria');
  assert.equal((await emitResult(maria, 'player:claim', { runtimeEpoch: dmInitial.runtimeEpoch, characterId: 'maria' })).code, 'CLAIMED'); await mariaClaimed;
  const aoifeClaimed = wait(aoife, 'player:private', value => value.characterId === 'aoife');
  assert.equal((await emitResult(aoife, 'player:claim', { runtimeEpoch: dmInitial.runtimeEpoch, characterId: 'aoife' })).code, 'CLAIMED'); await aoifeClaimed;
  if (!dm.__world.entities.some(entity => entity.id === 'maria') || !dm.__world.entities.some(entity => entity.id === 'aoife'))
    await wait(dm, 'world:snapshot', value => ['maria','aoife'].every(id => value.entities.some(entity => entity.id === id)));
  // Reach an unobstructed attack position through the actual physical grid.
  // The old fixture shot from the entry bridge through the temple wall.
  const { oneShotCampaignDefinition } = await import(pathToFileURL(path.join(serverBuild, 'campaigns/one-shot/public/pack.js')).href);
  const { surfaceNeighbors } = await import(pathToFileURL(path.join(serverBuild, 'engine/shared/terrain.js')).href);
  const { segmentCrossesBox, footprintFor } = await import(pathToFileURL(path.join(serverBuild, 'engine/shared/geometry.js')).href);
  const scene = oneShotCampaignDefinition.scenes.find(scene => scene.id === 'temple');
  const target = dm.__world.entities.find(entity => entity.id === 'anteros-temple').cell;
  const origin = dm.__world.entities.find(entity => entity.id === 'maria').cell;
  const forbidden = new Set(dm.__world.entities.filter(entity => entity.id !== 'maria').map(entity => `${entity.cell.col},${entity.cell.row}`));
  for (const prop of dm.__world.props) if (prop.structure !== 'destroyed' && (prop.kind !== 'door' || prop.state !== 'open'))
    for (const cell of footprintFor(prop.cell, prop.rotation, prop.footprint)) forbidden.add(`${cell.col},${cell.row}`);
  const key = cell => `${cell.col},${cell.row}`, paths = [[origin]], visited = new Set([key(origin)]);
  let legalPath;
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i], from = path.at(-1), distance = Math.max(Math.abs(from.col-target.col), Math.abs(from.row-target.row));
    if (distance >= 2 && distance <= 10 && !scene.effectWalls.some(wall => segmentCrossesBox(from, target, wall))) { legalPath = path; break; }
    for (const { cell } of surfaceNeighbors(scene.terrain, { surfaceId: scene.surfaceId, cell: from })) if (!visited.has(key(cell)) && !forbidden.has(key(cell))) { visited.add(key(cell)); paths.push([...path,cell]); }
  }
  assert.ok(legalPath, 'no unobstructed approach to Anteros');
  for (const cell of legalPath.slice(1)) {
    const moved = await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'entity:move', commandId: crypto.randomUUID(), sceneEpoch: initialWorld.sceneEpoch, entityId: 'maria', cell });
    assert.equal(moved.ok, true, `Approach ${cell.col},${cell.row}: ${moved.code}`);
    await delay(250); // Allow the normal one-square motion clock to finish.
  }
  let dmStatePromise = wait(dm, 'dm:state', value => value.combat.active);
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:start', commandId: crypto.randomUUID(), sceneEpoch: initialWorld.sceneEpoch })).ok, true);
  let dmState = await dmStatePromise;
  assert.equal(dmState.combat.currentId, null, 'no hay turno antes de que la mesa registre iniciativa');
  let mariaInitiative = wait(maria, 'player:private', value => value.combat?.initiative.submitted === true);
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiative', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, total: 20 })).code, 'INITIATIVE_RECORDED'); await mariaInitiative;
  let aoifeInitiative = wait(aoife, 'player:private', value => value.combat?.initiative.submitted === true);
  assert.equal((await emitResult(aoife, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiative', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, total: 10 })).code, 'INITIATIVE_RECORDED'); await aoifeInitiative;
  dmStatePromise = wait(dm, 'dm:state', value => value.combat.initiativePending && value.combat.participants.every(participant => participant.initiativeSubmitted));
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiative', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, entries: [{ id: 'anteros-temple', initiative: 0 }] })).ok, true);
  dmState = await dmStatePromise;
  const initiativeOrder = dmState.combat.order.map(item => item.id);
  dmStatePromise = wait(dm, 'dm:state', value => value.combat.currentId === 'maria' && !value.combat.initiativePending);
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiativeOrder', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, order: initiativeOrder, confirm: true })).ok, true);
  dmState = await dmStatePromise;
  assert.equal(dmState.combat.currentId, 'maria');

  const declareId = crypto.randomUUID(), declare = { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:declare', commandId: declareId, sceneEpoch: dmState.sceneEpoch, targetId: 'anteros-temple', actionId: 'shortbow', useSneakAttack: true };
  const mariaAttackPrompt = wait(maria, 'player:private', value => value.combat?.prompt?.stage === 'attack');
  const aoifeWithoutPrompt = wait(aoife, 'player:private', value => value.combat && value.combat.prompt === null);
  const declared = await emitResult(maria, 'player:combat', declare); assert.equal(declared.code, 'ROLL_REQUIRED');
  let attackPrivate = await mariaAttackPrompt; await aoifeWithoutPrompt;
  assert.equal((await emitResult(maria, 'player:combat', declare)).code, 'ROLL_REQUIRED', 'declaración duplicada no fue idempotente');
  assert.equal((await emitResult(aoife, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:cancelAction', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: attackPrivate.combat.prompt.id })).code, 'NOT_YOUR_ACTION');
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:end', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch })).code, 'ROLL_PENDING');
  const cancelled = wait(maria, 'player:private', value => value.combat && !value.combat.prompt && !value.combat.pendingAction);
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:cancelAction', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: attackPrivate.combat.prompt.id })).code, 'ACTION_CANCELLED');
  assert.equal((await cancelled).combat.actionUsed, false);
  const redeclared = wait(maria, 'player:private', value => value.combat?.prompt?.stage === 'attack');
  assert.equal((await emitResult(maria, 'player:combat', { ...declare, commandId: crypto.randomUUID() })).code, 'ROLL_REQUIRED');
  attackPrivate = await redeclared;
  const promptId = attackPrivate.combat.prompt.id;
  const wrongActor = await emitResult(aoife, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollAttack', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId, d20: 20 });
  assert.equal(wrongActor.code, 'WRONG_ACTOR');

  const attackCommand = { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollAttack', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId, d20: 20 };
  const damagePrivatePromise = wait(maria, 'player:private', value => value.combat?.prompt?.stage === 'damage');
  assert.equal((await emitResult(maria, 'player:combat', attackCommand)).code, 'DAMAGE_REQUIRED');
  const damagePrivate = await damagePrivatePromise, damageId = damagePrivate.combat.prompt.id;
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:cancelAction', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: damageId })).code, 'ACTION_ALREADY_RESOLVING');
  assert.notEqual(damageId, promptId);
  assert.equal((await emitResult(maria, 'player:combat', attackCommand)).code, 'DAMAGE_REQUIRED', 'ataque repetido no conservó recibo');
  const wrongStage = await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollAttack', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: damageId, d20: 4 });
  assert.equal(wrongStage.code, 'PROMPT_STAGE_MISMATCH');

  const before = dmState.combat.participants.find(item => item.id === 'anteros-temple').hp;
  const damageCommand = { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollDamage', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: damageId, diceTotal: 12 };
  const afterDamagePromise = wait(dm, 'dm:state', value => value.combat.participants.find(item => item.id === 'anteros-temple')?.hp < before);
  assert.equal((await emitResult(maria, 'player:combat', damageCommand)).code, 'ATTACK_RESOLVED');
  const after = (await afterDamagePromise).combat.participants.find(item => item.id === 'anteros-temple').hp;
  assert.equal(before - after, 15, 'crítico de arco: suma física12 + modificador3; no debe aplicarse dos veces');
  const duplicateDamage = await emitResult(maria, 'player:combat', damageCommand); assert.equal(duplicateDamage.code, 'ATTACK_RESOLVED');
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:flee', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch })).code, 'FLEE_REQUESTED');
  const afterWithdrawal = wait(dm, 'dm:state', value => value.combat.currentId === 'aoife' && !value.combat.participants.some(item => item.id === 'maria'));
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:withdraw', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, entityId: 'maria' })).ok, true);
  await afterWithdrawal;
  const ended = wait(dm, 'dm:state', value => !value.combat.active);
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:withdraw', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, entityId: 'aoife' })).ok, true); await ended;
  if (process.argv.includes('--combat-only')) {
    await stop();
    console.log('D8 combat integration PASS: DM/two players/projector, physical initiative, private dice, damage, idempotent retries and withdrawal.');
  } else {
  // The same authoritative clients now play the full adventure and restore it.
  const command = async (fields, predicate = () => true) => {
    const updated = wait(dm, 'dm:state', predicate);
    // Keep a later observer timeout from masking a command rejection.
    updated.catch(()=>{});
    const result = await emitResult(dm, 'dm:command', { runtimeEpoch: dm.__dmState.runtimeEpoch, ...(fields.type.startsWith('clock:')?{}:{sceneEpoch: dm.__dmState.sceneEpoch}), commandId: crypto.randomUUID(), ...fields });
    assert.equal(result.ok, true, JSON.stringify({fields,result}));
    try { await updated; } catch(error) { console.error('Expected state not received',fields,dm.__dmState?.gameClock);throw error; }
  };
  // Shared weather changes are real authoritative commands, not preview-only.
  for(const precipitation of ['rain','snow'])for(const precipitationLevel of [1,2,3]){
    const fields={type:'environment',storm:false,precipitation,precipitationLevel,windIntensity:.65,timeOfDay:'sunset'};
    const received=sockets.map(socket=>wait(socket,'world:snapshot',world=>world.environment.precipitation===precipitation&&world.environment.precipitationLevel===precipitationLevel&&world.environment.windIntensity===.65));
    await command(fields);await Promise.all(received);
    // The existing server deliberately uses this channel for cold wind in snow.
    // Verify the authored snow sound/level rather than expecting a silent channel.
    const ambience=oneShotCampaignDefinition.audio.library.ambience;
    const expected=precipitation==='snow'
      ? ambience.find(t=>/icy-wind|cliff-wind/.test(t.id))??ambience.find(t=>/(?:^|-)wind$/.test(t.id))
      : ambience.find(t=>/(?:^|-)rain(?:-|$)/.test(t.id))??ambience.find(t=>/(?:^|-)storm$/.test(t.id));
    assert.equal(dm.__dmState.audio.layers.storm.playing,true);
    assert.equal(dm.__dmState.audio.layers.storm.assetId,expected.id);
    assert.equal(dm.__dmState.audio.layers.storm.volume,(precipitation==='snow'?[0,.10,.18,.28]:[0,.18,.42,.72])[precipitationLevel]);
  }
  for(const [timeOfDay,hour] of [['day',12],['night',22],['dawn',5]]){
    // Phase commands now advance the shared clock and keep automatic daylight.
    await command({type:'environment',storm:false,timeOfDay,precipitation:'none',windIntensity:0},state=>state.environment.timeOfDay==='auto'&&Math.floor(state.gameClock.seconds%86400/3600)===hour);
  }
  // Player seating uses the authenticated interaction channel, including
  // duplicate protection; DM seating shares the same authoritative action.
  await command({type:'scene',sceneId:'cafe'},state=>state.sceneId==='cafe');
  for(const door of dm.__dmState.objects.filter(o=>o.kind==='door'&&o.state!=='open')){
    await command({type:'object:door',objectRevision:dm.__dmState.objectRevision,objectId:door.id,state:'open'});
  }
  const cafe=oneShotCampaignDefinition.scenes.find(scene=>scene.id==='cafe');
  const cafeWorld=dm.__world.sceneId==='cafe'?dm.__world:await wait(dm,'world:snapshot',world=>world.sceneId==='cafe');
  maria.emit('scene:ready',{runtimeEpoch:cafeWorld.runtimeEpoch,sceneEpoch:cafeWorld.sceneEpoch});
  const cafeOrigin=cafeWorld.entities.find(entity=>entity.id==='maria').cell;
  const occupied=new Set(cafeWorld.entities.filter(entity=>entity.id!=='maria').map(entity=>key(entity.cell)));
  for(const prop of cafeWorld.props)if(prop.structure!=='destroyed'&&(prop.kind!=='door'||prop.state!=='open'))
    for(const cell of footprintFor(prop.cell,prop.rotation,prop.footprint))occupied.add(key(cell));
  const seatPaths=[[cafeOrigin]],seatVisited=new Set([key(cafeOrigin)]);let chosenSeat,seatPath;
  for(let i=0;i<seatPaths.length;i++){
    const path=seatPaths[i],cell=path.at(-1);
    chosenSeat=cafe.seats.find(seat=>!seat.reservedActorId&&key(seat.cell)===key(cell));
    if(chosenSeat){seatPath=path;break;}
    for(const neighbor of surfaceNeighbors(cafe.terrain,{surfaceId:cafe.surfaceId,cell}))if(cafe.walkable.some(c=>key(c)===key(neighbor.cell))&&!seatVisited.has(key(neighbor.cell))&&!occupied.has(key(neighbor.cell))){seatVisited.add(key(neighbor.cell));seatPaths.push([...path,neighbor.cell]);}
  }
  assert.ok(chosenSeat&&seatPath,'no accessible free seat');
  for(const cell of seatPath.slice(1)){await command({type:'entity:move',entityId:'maria',cell});await delay(250);}
  const seatedWorld=wait(maria,'world:snapshot',world=>world.entities.find(entity=>entity.id==='maria')?.seatId===chosenSeat.id);
  const seatAction={runtimeEpoch:dm.__dmState.runtimeEpoch,sceneEpoch:dm.__dmState.sceneEpoch,commandId:crypto.randomUUID(),targetId:chosenSeat.id};
  assert.equal((await emitResult(maria,'player:interact',seatAction)).code,'SEAT_TAKEN');await seatedWorld;
  assert.equal((await emitResult(maria,'player:interact',seatAction)).code,'SEAT_TAKEN','duplicated sit must not stand');
  const stood=wait(maria,'world:snapshot',world=>!world.entities.find(entity=>entity.id==='maria')?.seatId);
  await command({type:'entity:seat',entityId:'maria',seatId:chosenSeat.id});await stood;
  await command({type:'scene',sceneId:'mirror'},state=>state.sceneId==='mirror');
  const transformed=sockets.map(socket=>wait(socket,'world:snapshot',world=>world.sceneId==='mirror'&&world.props.find(p=>p.id==='true-love-mirror')?.structure==='destroyed'&&world.entities.some(e=>e.kind==='creature'&&e.tokenId===world.entities.find(e=>e.id==='maria')?.tokenId)));
  const mirrorEvents=sockets.map(socket=>wait(socket,'mirror:transformation'));
  const mirrorSound=wait(projector,'sfx:play',event=>event.sfxId==='d8-night-sfx-mirror');
  await command({type:'creature',visible:true,sourceId:'maria'},state=>state.creature?.visible);
  const mirrorResults=await Promise.all([...transformed,...mirrorEvents,mirrorSound]);
  const presentation=mirrorResults.slice(transformed.length,-1),sound=mirrorResults.at(-1);
  assert.ok(presentation.every(event=>event.eventId===sound.eventId&&Number.isFinite(event.serverTime)), 'one authoritative identity for mirror light, appearance and sound');
  let replayedMirrorEvents=0;for(const socket of sockets)socket.on('mirror:transformation',()=>replayedMirrorEvents++);
  maria.disconnect();const reconnectWorld=wait(maria,'world:snapshot',world=>world.sceneId==='mirror'&&world.entities.some(e=>e.kind==='creature'));
  const reconnectOwner=wait(maria,'player:private',value=>value.characterId==='maria');maria.connect();await Promise.all([reconnectWorld,reconnectOwner]);await delay(200);
  assert.equal(replayedMirrorEvents,0,'reconnect restores the public reflection without replaying its transient reveal');
  // The requested physical gallery opens on HP adjudication, independently
  // of the four story choices. Every client sees the same persistent seal.
  const sealedAttempt=await emitResult(dm,'dm:command',{runtimeEpoch:dm.__dmState.runtimeEpoch,sceneEpoch:dm.__dmState.sceneEpoch,commandId:crypto.randomUUID(),type:'entity:portal',entityId:'maria',portId:'galeria-espejo-cena',direction:'forward'});
  assert.equal(sealedAttempt.code,'PORT_CONDITION_BLOCKED');
  const opened=sockets.map(socket=>wait(socket,'world:snapshot',world=>world.sceneId==='mirror'&&world.props.find(p=>p.id==='mirror-ice-seal')?.structure==='destroyed'));
  const defeatId=crypto.randomUUID(),defeat={runtimeEpoch:dm.__dmState.runtimeEpoch,commandId:defeatId,type:'entity:hp',entityId:'reflection',hp:0};
  assert.equal((await emitResult(dm,'dm:command',defeat)).ok,true);await Promise.all(opened);
  assert.equal((await emitResult(dm,'dm:command',defeat)).ok,true,'defeat command remains idempotent');
  assert.equal(dm.__dmState.adventure.objectives.find(g=>g.id==='mirror')?.complete??false,false,'physical exit must not choose the mirror story outcome');
  const mirrorWorld=dm.__world,exitStart=mirrorWorld.entities.find(e=>e.id==='maria').cell,exitGoal={col:5,row:1};
  const blockedExit=new Set(mirrorWorld.entities.filter(e=>e.id!=='maria'&&e.hp!==0).map(e=>key(e.cell)));
  for(const p of mirrorWorld.props)if(p.structure!=='destroyed'&&(p.kind!=='door'||p.state!=='open'))for(const cell of footprintFor(p.cell,p.rotation,p.footprint))blockedExit.add(key(cell));
  for(const hazard of mirrorWorld.scene.movementHazards??[])for(const cell of hazard.cells)blockedExit.add(key(cell));
  const safeExit=new Set(mirrorWorld.scene.walkable.map(key)),exitQueue=[exitStart],exitPrevious=new Map([[key(exitStart),null]]);
  for(let i=0;i<exitQueue.length&&!exitPrevious.has(key(exitGoal));i++)for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const from=exitQueue[i],cell={col:from.col+dc,row:from.row+dr};if(!safeExit.has(key(cell))||blockedExit.has(key(cell))||exitPrevious.has(key(cell)))continue;exitPrevious.set(key(cell),from);exitQueue.push(cell);}
  assert.ok(exitPrevious.has(key(exitGoal)));const exitPath=[exitGoal];while(exitPrevious.get(key(exitPath[0])))exitPath.unshift(exitPrevious.get(key(exitPath[0])));
  for(const cell of exitPath.slice(1)){await command({type:'entity:move',entityId:'maria',cell});await delay(250);}
  const dinnerArrivals=[dm,projector,maria].map(socket=>wait(socket,'world:snapshot',world=>world.sceneId==='dinner',12000));
  const departures=[dm,projector,maria].map(socket=>wait(socket,'world:snapshot',world=>world.sceneId==='mirror'&&world.entities.find(e=>e.id==='maria')?.step?.movementKind==='passage'));
  maria.emit('scene:ready',{runtimeEpoch:dm.__dmState.runtimeEpoch,sceneEpoch:dm.__dmState.sceneEpoch});
  maria.emit('input:move',{runtimeEpoch:dm.__dmState.runtimeEpoch,sceneEpoch:dm.__dmState.sceneEpoch,seq:500,x:0,z:-1});
  const departureViews=await Promise.all(departures),departureStep=departureViews[0].entities.find(e=>e.id==='maria').step;
  assert.equal(departureStep.durationMs,5000);assert.equal(departureStep.passage.points.length,6);
  assert.ok(departureViews.every(v=>v.entities.find(e=>e.id==='maria').step.startedAt===departureStep.startedAt),'all clients share one departure clock');
  maria.disconnect();const midExit=wait(maria,'world:snapshot',world=>world.entities.find(e=>e.id==='maria')?.step?.movementKind==='passage');maria.connect();
  assert.equal((await midExit).entities.find(e=>e.id==='maria').step.startedAt,departureStep.startedAt,'reconnect resumes the same walk');
  await Promise.all(dinnerArrivals);assert.equal(aoife.__world.sceneId,'mirror','another player must retain their own scene');
  maria.disconnect();const exitReconnect=wait(maria,'world:snapshot',world=>world.sceneId==='dinner');maria.connect();await exitReconnect;
  assert.equal(replayedMirrorEvents,0,'walking and reconnecting must not replay the reveal');
  for (const goal of dm.__dmState.adventure.objectives) {
    await command({ type: 'scene', sceneId: goal.sceneId }, state => state.sceneId === goal.sceneId);
    await command({ type: 'story:choice', objectiveId: goal.id, choiceId: goal.choices[0].id, note: 'Recorrido completo por red' }, state => state.adventure.objectives.find(item => item.id === goal.id).complete);
    await command({ type: 'scene', sceneId: 'temple' }, state => state.sceneId === 'temple');
  }
  await command({ type: 'scene', sceneId: 'dinner' }, state => state.sceneId === 'dinner');
  await command({ type: 'story:ending', endingId: 'ending1', reason: 'Cuatro decisiones pacíficas' }, state => state.adventure.endings[0].selected);
  await command({type:'clock:control',action:'pause'},state=>!state.gameClock.running);
  const csrfToken = (await (await fetch(`${base}/api/dm/save/status`, { headers: { cookie } })).json()).csrfToken;
  const request = async (route, body) => {
    const response = await fetch(`${base}/api/dm/save${route}`, { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json', 'x-dungeons-csrf': csrfToken }, body: JSON.stringify({ runtimeEpoch: dm.__dmState.runtimeEpoch, ...body }) });
    const result = await response.json(); assert.equal(response.ok, true, JSON.stringify(result)); return result;
  };
  await request('', { requestId: crypto.randomUUID() });
  // Export HTTP was intentionally removed; inspect only this test's own save.
  const readSave=async()=>JSON.parse(await fs.readFile(path.join(temporary,'d8-night-private','active.json'),'utf8'));
  const saved = await readSave();
  await command({ type: 'story:choice', objectiveId: 'rose', choiceId: 'attack', note: 'Cambio que debe deshacerse al cargar' });
  await request('', { requestId: crypto.randomUUID() });
  const history = await (await fetch(`${base}/api/dm/save/history`, { headers: { cookie } })).json();
  const checkpoint = history.find(entry => entry.generation === saved.generation); assert.ok(checkpoint, 'el guardado anterior debe figurar en el menú');
  const preview = await request(`/history/${checkpoint.id}/preview`, {});
  const beforeEpoch = dm.__dmState.runtimeEpoch;
  const snapshots = sockets.map(socket => wait(socket, 'world:snapshot', world => world.runtimeEpoch !== beforeEpoch && world.sceneId === 'dinner'));
  const restoredOwners = [
    wait(maria, 'player:private', value => value.runtimeEpoch !== beforeEpoch && value.characterId === 'maria'),
    wait(aoife, 'player:private', value => value.runtimeEpoch !== beforeEpoch && value.characterId === 'aoife')
  ];
  const restoredDm = wait(dm, 'dm:state', state => state.runtimeEpoch !== beforeEpoch && state.adventure.endings[0].selected);
  const restored = await request('/restore', { token: preview.token, expectedStateRevision: preview.expectedStateRevision, requestId: crypto.randomUUID() });
  assert.equal(restored.code, 'RESTORED'); await Promise.all([...snapshots, ...restoredOwners]); await restoredDm;
  assert.equal(replayedMirrorEvents,0,'restore and scene changes must not replay the mirror sequence');
  await request('', { requestId: crypto.randomUUID() });
  const exported = await readSave();
  const worldWithoutAudioClock = payload => { const copy = structuredClone(payload); delete copy.audio; return copy; };
  assert.deepEqual(worldWithoutAudioClock(exported.payload), worldWithoutAudioClock(saved.payload), 'restore debe conservar todos los datos del mundo, no solo posiciones');
  assert.equal(exported.payload.audio.music.assetId, saved.payload.audio.music.assetId);
  for (let i = 0; i < 11; i++) {
    await command({ type: 'story:choice', objectiveId: 'rose', choiceId: 'peace', note: `Punto de carga ${i}` });
    await request('', { requestId: crypto.randomUUID() });
  }
  const rotated = await (await fetch(`${base}/api/dm/save/history`, { headers: { cookie } })).json();
  assert.equal(rotated.length, 5, 'el menú vigente conserva cinco puntos de carga');
  await delay(100);
  sockets.forEach(socket => socket.disconnect()); await stop();
  await launch();
  const restartLogin = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: '{}' });
  const restartCookie = restartLogin.headers.get('set-cookie').split(';')[0];
  const restarted=await connect({role:'dm'},{Cookie:restartCookie});sockets.push(restarted);
  const restartedState=restarted.__dmState??await wait(restarted,'dm:state');
  assert.equal(restartedState.sceneId,'dinner');
  const reopened = await readSave();
  assert.equal(reopened.payload.sceneId, 'dinner'); assert.equal(reopened.payload.storyNotes.rose, 'Punto de carga 10');
  assert.deepEqual(restartedState.characters.map(c=>[c.id,c.hp]).sort(),reopened.payload.characters.map(c=>[c.id,c.hp]).sort());
  assert.equal(reopened.payload.npcs.find(actor => actor.id === 'anteros-temple').hp, after);
  await stop();
  console.log('D8 integration PASS: private dice flow, idempotency, withdrawal, three rain/snow levels and all day phases live to DM/two players/projector, single mirror transformation/player appearance before combat, defeat-conditioned gallery and physical player traversal to Anteros with independent second player, reconnect without replay, all six scenes/four objectives, final, full-world restore, preserved player ownership, five-point save history and restart/autoload.');
  }
} finally {
  sockets.forEach(socket => socket.disconnect());
  if (child?.exitCode === null) child.kill('SIGTERM');
  const resolved = path.resolve(temporary), tempRoot = path.resolve(os.tmpdir());
  if (resolved.startsWith(`${tempRoot}${path.sep}`)) await fs.rm(resolved, { recursive: true, force: true });
}

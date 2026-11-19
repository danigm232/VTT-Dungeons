const listRes = await fetch('http://127.0.0.1:9276/json/list');
const tabs = await listRes.json();
const playerTab = tabs.find(t => t.url.includes('/player'));
if (!playerTab) {
  console.log('No player tab found');
  process.exit(1);
}
const ws = new WebSocket(playerTab.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result);
};
const send = (method, params = {}) => new Promise(r => {
  const msgId = id++;
  pending.set(msgId, r);
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
await new Promise(r => ws.onopen = r);
await send('Runtime.enable');

const res = await send('Runtime.evaluate', {
  expression: `(() => {
    const w = window.world;
    const cam = w?.terrainView?.camera;
    const myEntity = w?.snapshot?.entities?.find(e => e.id === w.localId);
    return {
      localId: w?.localId,
      myEntity: myEntity ? { id: myEntity.id, x: myEntity.x, y: myEntity.y, surface: myEntity.surfaceId } : null,
      cameraZoom: w?.cameraZoom,
      cameraBaseZoom: w?.cameraBaseZoom,
      orthoTop: cam?.orthoTop,
      orthoBottom: cam?.orthoBottom,
      orthoLeft: cam?.orthoLeft,
      orthoRight: cam?.orthoRight
    };
  })()`,
  returnByValue: true
});
console.log('Player camera state:', JSON.stringify(res?.value, null, 2));
process.exit(0);

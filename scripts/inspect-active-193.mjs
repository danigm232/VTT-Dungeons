const listRes = await fetch('http://127.0.0.1:9277/json/list');
const tabs = await listRes.json();
const playerTab = tabs.find(t => t.url.includes('/player'));
if (!playerTab) { console.log('No player tab'); process.exit(1); }
const ws = new WebSocket(playerTab.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) pending.get(m.id)(m.result); };
const send = (method, params = {}) => new Promise(r => { const msgId = id++; pending.set(msgId, r); ws.send(JSON.stringify({ id: msgId, method, params })); });
await new Promise(r => ws.onopen = r);
await send('Runtime.enable');

const res = await send('Runtime.evaluate', {
  expression: `(() => {
    const s = window.world?.terrainScene;
    if (!s) return null;
    const active = s.getActiveMeshes().data;
    const len = s.getActiveMeshes().length;
    const list = [];
    for (let i = 0; i < len; i++) {
      const m = active[i];
      if (m) list.push({ name: m.name, alwaysSelectAsActiveMesh: m.alwaysSelectAsActiveMesh });
    }
    return {
      len,
      alwaysActiveCount: list.filter(m => m.alwaysSelectAsActiveMesh).length,
      sample: list.slice(0, 40)
    };
  })()`,
  returnByValue: true
});

console.log(JSON.stringify(res?.value, null, 2));
process.exit(0);

import { spawn } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9285;
const proc = spawn(chromePath, ['--remote-debugging-port=' + port, '--headless=new', 'http://localhost:3000/player']);
setTimeout(() => proc.kill(), 14000);

async function main() {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) break;
    } catch {}
  }
  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const tabs = await listRes.json();
  const playerTab = tabs.find(t => t.url.includes('/player')) || tabs[0];
  const ws = new WebSocket(playerTab.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');

  // Wait for world.retreatVisuals?.stats?.loaded
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden && contBtn.offsetParent !== null) contBtn.click();
        const join = document.getElementById('join');
        if (join && !join.hidden && join.offsetParent !== null) {
          const btn = Array.from(join.querySelectorAll('button')).find(b => b.textContent.includes('Elegir') && !b.disabled);
          if (btn) btn.click();
        }
        return window.world?.retreatVisuals?.stats?.loaded ? 'ready' : 'waiting';
      })()`,
      returnByValue: true
    });
    if (r.result?.value === 'ready') break;
  }

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = window.world?.terrainScene;
      if (!s) return 'No scene';
      const meshes = s.meshes;
      return {
        total: meshes.length,
        frozen: meshes.filter(m => m.isWorldMatrixFrozen).length,
        unfrozen: meshes.filter(m => !m.isWorldMatrixFrozen).length,
        activeCount: s.getActiveMeshes().length,
        renderTargets: s.customRenderTargets.length,
        lights: s.lights.map(l => ({ name: l.name, type: l.getClassName(), range: l.range, shadowMap: !!l.getShadowGenerator() })),
        particleSystems: s.particleSystems.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene details:', res.result?.value);
  proc.kill();
}
main().catch(console.error);

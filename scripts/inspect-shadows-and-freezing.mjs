import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9295;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  '--no-sandbox',
  'http://localhost:3000/player'
]);

let killed = false;
function cleanup() {
  if (!killed) {
    killed = true;
    try { proc.kill(); } catch {}
  }
}
process.on('exit', cleanup);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  for (let i = 0; i < 25; i++) {
    await wait(300);
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
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');

  for (let i = 0; i < 30; i++) {
    await wait(1000);
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

  await wait(2000);

  // Inspect unfrozen meshes and what's in shadow render list
  const details = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = window.world?.terrainScene;
      if (!s) return { error: 'no terrainScene' };

      const unfrozenMeshes = s.meshes.filter(m => !m.isWorldMatrixFrozen);
      const unfrozenGroups = {};
      for (const m of unfrozenMeshes) {
        const prefix = m.name.split(':')[0] || m.name.split('_')[0] || 'other';
        unfrozenGroups[prefix] = (unfrozenGroups[prefix] || 0) + 1;
      }

      const dirLight = s.lights.find(l => l.name === 'camp-key:camp-a1-rooms');
      const gen = dirLight?.getShadowGenerator ? dirLight.getShadowGenerator() : null;
      const shadowList = gen?.getShadowMap()?.renderList?.map(m => m.name) || [];

      return {
        totalUnfrozen: unfrozenMeshes.length,
        unfrozenGroups,
        shadowListSample: shadowList.slice(0, 30),
        shadowListTotal: shadowList.length
      };
    })()`,
    returnByValue: true
  });

  console.log('Unfrozen and shadow details:', JSON.stringify(details.result?.value, null, 2));

  cleanup();
}
main().catch(console.error);

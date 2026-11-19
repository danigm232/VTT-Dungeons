import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9290;
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

  // Profile Babylon scene frame stats
  const profile = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = window.world?.terrainScene;
      if (!s) return { error: 'no terrainScene' };
      const engine = s.getEngine();
      const inst = s.getInstrumentation ? s.getInstrumentation() : null;

      // Check lights and shadows
      const lights = s.lights.map(l => {
        const gen = l.getShadowGenerator ? l.getShadowGenerator() : null;
        const map = gen ? gen.getShadowMap() : null;
        return {
          name: l.name,
          type: l.getClassName(),
          range: l.range,
          intensity: l.intensity,
          enabled: l.isEnabled(),
          hasShadow: !!gen,
          shadowMapSize: map ? map.getSize().width : 0,
          shadowRenderListLength: map?.renderList ? map.renderList.length : 0,
          includedOnlyMeshesCount: l.includedOnlyMeshes?.length || 0,
          excludedMeshesCount: l.excludedMeshes?.length || 0
        };
      });

      // Check active meshes breakdown by material / type
      const active = s.getActiveMeshes().data.slice(0, s.getActiveMeshes().length);
      const activeByMat = {};
      for (const m of active) {
        const mn = m.material?.name || 'no-mat';
        activeByMat[mn] = (activeByMat[mn] || 0) + 1;
      }

      // Check how many meshes are evaluated in culling
      const totalMeshes = s.meshes.length;
      const frozenMatrices = s.meshes.filter(m => m.isWorldMatrixFrozen).length;

      // Check camera
      const cam = s.activeCamera;

      return {
        totalMeshes,
        frozenMatrices,
        unfrozenMatrices: totalMeshes - frozenMatrices,
        activeMeshesCount: active.length,
        activeByMatTop: Object.entries(activeByMat).sort((a, b) => b[1] - a[1]).slice(0, 20),
        lights,
        totalParticleSystems: s.particleSystems.length,
        activeParticleSystems: s.particleSystems.filter(p => p.isStarted()).length,
        camera: {
          name: cam?.name,
          fov: cam?.fov,
          minZ: cam?.minZ,
          maxZ: cam?.maxZ
        }
      };
    })()`,
    returnByValue: true
  });

  await fs.writeFile('output/retreat-frame-profile.json', JSON.stringify(profile.result?.value, null, 2));
  console.log('Saved output/retreat-frame-profile.json');

  cleanup();
}
main().catch(console.error);

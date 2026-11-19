import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmpDir = path.join(os.tmpdir(), 'chrome-diag-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9275;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${tmpDir}`,
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
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
process.on('exit', cleanup);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  for (let i = 0; i < 20; i++) {
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

  console.log('Waiting for player load...');
  for (let i = 0; i < 40; i++) {
    await wait(1000);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden && contBtn.offsetParent !== null) {
          contBtn.click();
        }
        const join = document.getElementById('join');
        if (join && !join.hidden && join.offsetParent !== null) {
          const btns = Array.from(join.querySelectorAll('button'));
          const anyBtn = btns.find(b => b.textContent.includes('Elegir') && !b.disabled);
          if (anyBtn) {
            anyBtn.click();
            return 'clicked-elegir';
          }
        }
        const w = window.world;
        if (w?.terrainScene && w.retreatVisuals?.stats?.loaded) return 'ready';
        if (w?.retreatVisuals) return 'retreat-loading';
        if (w?.terrainScene) return 'scene-loading';
        return 'waiting';
      })()`,
      returnByValue: true
    });
    console.log('Poll', i, check.result?.value);
    if (check.result?.value === 'ready') break;
  }
  await wait(2000);

  // Diagnose Zone 3 (A1 Celdas)
  console.log('Auditing Zone 3 details...');
  const diag = await send('Runtime.evaluate', {
    expression: `(() => {
      const w = window.world;
      const s = w.terrainScene;
      w.terrainView.camera.target.x = 90;
      w.terrainView.camera.target.z = 92;
      s.render();

      const active = s.getActiveMeshes().data;
      const activeCount = s.getActiveMeshes().length;
      const activeMeshes = [];
      for (let i = 0; i < activeCount; i++) {
        const m = active[i];
        if (m) activeMeshes.push({ name: m.name, vertices: m.getTotalVertices(), mat: m.material?.name });
      }

      // Lights
      const lights = s.lights.map(l => ({
        name: l.name,
        enabled: l.isEnabled(),
        intensity: l.intensity,
        shadowGen: !!l.getShadowGenerator()
      }));

      // Particle systems
      const particles = s.particleSystems.map(p => ({
        name: p.name,
        isStarted: p.isStarted(),
        capacity: p.getCapacity()
      }));

      // Registered beforeRender callbacks
      const beforeRenderCount = s._onBeforeRenderObserver?.observers?.length || 0;

      // Draw calls & frame metrics from Instrumentation if available
      const engine = s.getEngine();
      return {
        activeCount,
        activeSample: activeMeshes.slice(0, 30),
        activeMaterials: [...new Set(activeMeshes.map(m => m.mat))],
        lights,
        particles,
        beforeRenderCount
      };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(diag.result?.value, null, 2));

  // Now measure with precise Babylon SceneInstrumentation
  const perf = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const s = window.world.terrainScene;
      const engine = s.getEngine();
      
      let frames = 0;
      let renderDurationSum = 0;
      let evaluateActiveMeshesSum = 0;
      let particlesDurationSum = 0;
      let activeMeshesSum = 0;
      let drawCallsSum = 0;

      // Measure 30 frames
      function run() {
        const t0 = performance.now();
        s.render();
        const t1 = performance.now();
        renderDurationSum += (t1 - t0);
        activeMeshesSum += s.getActiveMeshes().length;
        drawCallsSum += (engine._drawCalls?.current || 0);

        frames++;
        if (frames < 30) {
          requestAnimationFrame(run);
        } else {
          resolve({
            avgRenderDurationMs: renderDurationSum / frames,
            avgActiveMeshes: activeMeshesSum / frames,
            avgDrawCalls: drawCallsSum / frames,
            fps: Math.round(1000 / (renderDurationSum / frames) * 10) / 10
          });
        }
      }
      requestAnimationFrame(run);
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Perf instrumentation:', JSON.stringify(perf.result?.value, null, 2));

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

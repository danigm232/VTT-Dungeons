import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmpDir = path.join(os.tmpdir(), 'chrome-diag2-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9276;
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

  for (let i = 0; i < 40; i++) {
    await wait(1000);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden && contBtn.offsetParent !== null) contBtn.click();
        const join = document.getElementById('join');
        if (join && !join.hidden && join.offsetParent !== null) {
          const anyBtn = Array.from(join.querySelectorAll('button')).find(b => b.textContent.includes('Elegir') && !b.disabled);
          if (anyBtn) { anyBtn.click(); return 'clicked-elegir'; }
        }
        const w = window.world;
        if (w?.terrainScene && w.retreatVisuals?.stats?.loaded) return 'ready';
        return 'waiting';
      })()`,
      returnByValue: true
    });
    if (check.result?.value === 'ready') break;
  }
  await wait(2000);

  // Test: what happens if lights with intensity 0 are setEnabled(false)?
  console.log('Testing light disabling and camera frustum...');
  const test1 = await send('Runtime.evaluate', {
    expression: `(() => {
      const w = window.world;
      const s = w.terrainScene;
      const cam = w.terrainView.camera;
      cam.target.x = 90;
      cam.target.z = 92;
      s.render();

      const beforeActive = s.getActiveMeshes().length;
      const beforeDrawCalls = s.getEngine()._drawCalls?.current || 0;

      // Disabling 0-intensity lights
      let disabledLights = 0;
      for (const l of s.lights) {
        if (l.intensity <= 0.001 && l.isEnabled()) {
          l.setEnabled(false);
          disabledLights++;
        }
      }

      s.render();
      const afterActive = s.getActiveMeshes().length;
      const afterDrawCalls = s.getEngine()._drawCalls?.current || 0;

      // Inspect camera frustum properties
      return {
        camMode: cam.mode, // 0 is PERSPECTIVE, 1 is ORTHOGRAPHIC
        camAlpha: cam.alpha,
        camBeta: cam.beta,
        camRadius: cam.radius,
        camFov: cam.fov,
        camMinZ: cam.minZ,
        camMaxZ: cam.maxZ,
        orthoLeft: cam.orthoLeft,
        orthoRight: cam.orthoRight,
        orthoTop: cam.orthoTop,
        orthoBottom: cam.orthoBottom,
        beforeActive,
        afterActive,
        beforeDrawCalls,
        afterDrawCalls,
        disabledLights
      };
    })()`,
    returnByValue: true
  });

  console.log('Test 1 results:', JSON.stringify(test1.result?.value, null, 2));

  // Benchmark Zone 3 with 0-intensity lights disabled
  const test2 = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const s = window.world.terrainScene;
      let frames = 0;
      let renderSum = 0;
      function run() {
        const t0 = performance.now();
        s.render();
        const t1 = performance.now();
        renderSum += (t1 - t0);
        frames++;
        if (frames < 30) requestAnimationFrame(run);
        else resolve({
          avgRenderMs: renderSum / frames,
          fps: Math.round(1000 / (renderSum / frames) * 10) / 10
        });
      }
      requestAnimationFrame(run);
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Test 2 fps:', JSON.stringify(test2.result?.value, null, 2));

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmpDir = path.join(os.tmpdir(), 'chrome-bench-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9277;
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

  console.log('Waiting for player load and character select...');
  for (let i = 0; i < 40; i++) {
    await wait(1000);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden && contBtn.offsetParent !== null) contBtn.click();
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
        if (w?.terrainScene && w.retreatVisuals?.stats?.loaded && w.localId) return 'ready';
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

  const zones = [
    { zone: 'Zona 1: Playa y Embarcadero', cell: { col: 19, row: 114 } },
    { zone: 'Zona 2: Subida al Retiro', cell: { col: 24, row: 96 } },
    { zone: 'Zona 3: A1 Celdas y Plaza', cell: { col: 90, row: 92 } },
    { zone: 'Zona 4: A2 Cabrestante', cell: { col: 158, row: 68 } },
    { zone: 'Zona 5: A3 Comedor y Cocina', cell: { col: 122, row: 60 } },
    { zone: 'Zona 6: A4 Biblioteca', cell: { col: 102, row: 60 } },
    { zone: 'Zona 7: Jardines y Bosquetes', cell: { col: 80, row: 66 } },
    { zone: 'Zona 8: A5 Templo', cell: { col: 34, row: 44 } },
    { zone: 'Zona 9: Paseos y Explanadas', cell: { col: 60, row: 80 } },
    { zone: 'Zona 10: Rutas hacia la isla', cell: { col: 130, row: 30 } }
  ];

  const results = [];
  for (const z of zones) {
    console.log(`Setting player position to ${z.zone}...`);
    const setupInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const w = window.world;
        const ent = w.snapshot.entities.find(e => e.id === w.localId);
        if (ent) {
          ent.x = ${z.cell.col};
          ent.y = ${z.cell.row};
        }
        // Force world camera update
        w.tick();
        const cam = w.terrainView?.camera;
        return {
          localId: w.localId,
          target: cam ? { x: Math.round(cam.target.x), y: Math.round(cam.target.y), z: Math.round(cam.target.z) } : null,
          orthoTop: cam ? Math.round(cam.orthoTop * 10) / 10 : null,
          orthoRight: cam ? Math.round(cam.orthoRight * 10) / 10 : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Setup info:', setupInfo.result?.value);
    await wait(600);

    // Warm-up 10 frames
    await send('Runtime.evaluate', {
      expression: `new Promise(r => {
        let f = 0;
        function step() { f++; if (f < 10) requestAnimationFrame(step); else r(); }
        requestAnimationFrame(step);
      })`,
      awaitPromise: true
    });

    // Measure 60 frames
    const bench = await send('Runtime.evaluate', {
      expression: `new Promise(resolve => {
        const s = window.world.terrainScene;
        const times = [];
        let lastTime = performance.now();
        let frames = 0;
        let activeMeshesSum = 0;
        let drawCallsSum = 0;

        function record(now) {
          const dt = now - lastTime;
          lastTime = now;
          if (frames > 0) {
            times.push(dt);
            if (s) {
              activeMeshesSum += s.getActiveMeshes().length;
              drawCallsSum += (s.getEngine()._drawCalls?.current || 0);
            }
          }
          frames++;
          if (frames < 65) {
            requestAnimationFrame(record);
          } else {
            times.sort((a, b) => a - b);
            const sum = times.reduce((a, b) => a + b, 0);
            const avgDt = sum / times.length;
            const avgFps = 1000 / avgDt;
            const p95Index = Math.floor(times.length * 0.95);
            const p95Dt = times[p95Index];
            const maxDt = times[times.length - 1];
            resolve({
              avgFps: Math.round(avgFps * 10) / 10,
              minFps: Math.round((1000 / maxDt) * 10) / 10,
              avgFrameTimeMs: Math.round(avgDt * 10) / 10,
              p95FrameTimeMs: Math.round(p95Dt * 10) / 10,
              maxFrameTimeMs: Math.round(maxDt * 10) / 10,
              avgActiveMeshes: Math.round(activeMeshesSum / times.length),
              avgDrawCalls: Math.round(drawCallsSum / times.length)
            });
          }
        }
        requestAnimationFrame(record);
      })`,
      awaitPromise: true,
      returnByValue: true
    });

    results.push({ zone: z.zone, ...bench.result?.value });
    console.log(`${z.zone}: ${bench.result?.value?.avgFps} FPS (avg ${bench.result?.value?.avgFrameTimeMs}ms, max ${bench.result?.value?.maxFrameTimeMs}ms, active: ${bench.result?.value?.avgActiveMeshes})`);
  }

  await fs.promises.writeFile('output/retreat-player-fps-benchmark.json', JSON.stringify(results, null, 2));
  console.log('Saved output/retreat-player-fps-benchmark.json');
  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

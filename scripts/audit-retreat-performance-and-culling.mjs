import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9270;
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

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
  await send('Page.enable');

  console.log('Waiting for player load...');
  for (let i = 0; i < 40; i++) {
    await wait(1000);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
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
    console.log('Poll', i, 'status:', check.result?.value);
    if (check.result?.value === 'ready') {
      await wait(2000);
      break;
    }
  }

  console.log('Auditing meshes and hidden geometry...');
  const meshAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const w = window.world;
      const s = w?.terrainScene;
      if (!s) return { error: 'No terrainScene' };

      const meshes = s.meshes.map(m => {
        const b = m.getBoundingInfo().boundingBox;
        const mat = m.material;
        return {
          name: m.name,
          enabled: m.isEnabled(),
          visible: m.isVisible,
          visibility: m.visibility,
          vertices: m.getTotalVertices(),
          indices: m.getTotalIndices(),
          material: mat?.name || null,
          min: { x: b.minimumWorld.x, y: b.minimumWorld.y, z: b.minimumWorld.z },
          max: { x: b.maximumWorld.x, y: b.maximumWorld.y, z: b.maximumWorld.z },
          center: { x: b.centerWorld.x, y: b.centerWorld.y, z: b.centerWorld.z }
        };
      });

      // 1. Audit cell roof elements
      const cellRoofMeshes = meshes.filter(m => m.name.includes('mountain-roof') || m.name.includes('roof-outcrop'));

      // 2. Audit plant cards buried under terrain or rocks
      // A1 plant cards created by shrub / plantCard / grassTuft
      const a1Plants = meshes.filter(m => m.name === 'a1:plant-card' || m.material?.includes('foliage') || m.name.includes('painted-foliage'));

      // 3. Meshes that are disabled but not disposed
      const disabled = meshes.filter(m => !m.enabled);

      // 4. Meshes with zero visibility
      const zeroVis = meshes.filter(m => m.enabled && m.visibility === 0);

      // 5. Meshes completely below sea level (y < -0.5) that are not underwater detail
      const deepUnderground = meshes.filter(m => m.max.y < -0.2 && !m.name.includes('water') && !m.name.includes('ocean'));

      // 6. Solid bedrock meshes covering A1 cells (X ~ [73..140], Z ~ [70..95], Y ~ [10..25])
      const coveringBedrock = meshes.filter(m => m.enabled && (m.name.includes('Bedrock') || m.name.includes('Stone_P6') || m.name.includes('Plaza_Bedrock')));

      return {
        totalMeshes: meshes.length,
        enabledCount: meshes.filter(m => m.enabled).length,
        disabledCount: disabled.length,
        zeroVisCount: zeroVis.length,
        cellRoofMeshes,
        a1PlantsCount: a1Plants.length,
        a1PlantsSummary: a1Plants.slice(0, 20),
        deepUndergroundCount: deepUnderground.length,
        coveringBedrock: coveringBedrock.map(b => ({ name: b.name, min: b.min, max: b.max })),
        disabledSample: disabled.slice(0, 30).map(d => ({ name: d.name, vertices: d.vertices }))
      };
    })()`,
    returnByValue: true
  });

  await fs.writeFile('output/retreat-mesh-audit.json', JSON.stringify(meshAudit.result?.value, null, 2));
  console.log('Saved output/retreat-mesh-audit.json');

  // Multi-zone performance benchmark
  console.log('Starting multi-zone FPS and frame time audit...');
  const zoneCoords = [
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

  const zoneResults = [];

  for (const z of zoneCoords) {
    console.log(`Auditing ${z.zone}...`);
    // Move player / camera to zone cell
    await send('Runtime.evaluate', {
      expression: `(() => {
        const w = window.world;
        const cell = ${JSON.stringify(z.cell)};
        if (w?.terrainView?.camera) {
          // Point camera to cell world coords: cell col * 0.5 + 72 (approx) or use d8CellWorldPoint
          const d8 = window.__d8CellWorldPoint;
          // In world, each cell is 0.5m or 1m, let's target by setting camera target
          const targetX = cell.col;
          const targetZ = cell.row;
          w.terrainView.camera.target.x = targetX;
          w.terrainView.camera.target.z = targetZ;
        }
      })()`
    });
    await wait(800);

    // Measure 60 frames
    const bench = await send('Runtime.evaluate', {
      expression: `new Promise(resolve => {
        const s = window.world?.terrainScene;
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
            const worst10AvgDt = times.slice(-6).reduce((a, b) => a + b, 0) / 6;
            resolve({
              avgFps: Math.round(avgFps * 10) / 10,
              minFps: Math.round((1000 / maxDt) * 10) / 10,
              worst10Fps: Math.round((1000 / worst10AvgDt) * 10) / 10,
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

    zoneResults.push({
      zone: z.zone,
      ...bench.result?.value
    });
    console.log(`${z.zone}: ${bench.result?.value?.avgFps} FPS (avg ${bench.result?.value?.avgFrameTimeMs}ms, max ${bench.result?.value?.maxFrameTimeMs}ms, activeMeshes: ${bench.result?.value?.avgActiveMeshes})`);
  }

  await fs.writeFile('output/retreat-zones-fps-benchmark.json', JSON.stringify(zoneResults, null, 2));
  console.log('Saved output/retreat-zones-fps-benchmark.json');

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

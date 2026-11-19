import { spawn } from 'node:child_process';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9226',
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  'http://localhost:3000/player'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9226/json/list');
    const tabs = await listRes.json();
    const playerTab = tabs.find(t => t.url.includes('/player')) || tabs[0];
    const ws = new WebSocket(playerTab.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise(r => {
      const mid = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === mid) { ws.removeEventListener('message', handler); r(msg.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: mid, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 2000));
    // Click on character if chooser is shown
    await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('.character-card, button'));
        const trinity = cards.find(c => c.textContent && c.textContent.includes('Trinity'));
        if (trinity) trinity.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const scenes = window.world?.terrainScene?.getEngine()?.scenes || [window.world?.terrainScene];
        const camera = window.world?.terrainScene?.activeCamera;
        const camPos = camera ? [camera.position.x, camera.position.y, camera.position.z] : null;
        const out = [];
        for (const scene of scenes) {
          for (const m of (scene.meshes || [])) {
            if (!m.isVisible || !m.isEnabled()) continue;
            const bi = m.getBoundingInfo();
            const min = bi.boundingBox.minimumWorld;
            const max = bi.boundingBox.maximumWorld;
            const szX = max.x - min.x;
            const szZ = max.z - min.z;
            const szY = max.y - min.y;
            // Any mesh with Y > 5 or size > 15
            if (max.y > 2 && (szX > 5 || szY > 3 || szZ > 5)) {
              out.push({
                name: m.name,
                size: [szX.toFixed(1), szY.toFixed(1), szZ.toFixed(1)],
                minY: min.y.toFixed(1),
                maxY: max.y.toFixed(1),
                pos: [m.position.x.toFixed(1), m.position.y.toFixed(1), m.position.z.toFixed(1)],
                scaling: [m.scaling.x.toFixed(2), m.scaling.y.toFixed(2), m.scaling.z.toFixed(2)],
                mat: m.material?.name
              });
            }
          }
        }
        return { camPos, sceneId: window.world?.sceneId, meshes: out };
      })()`,
      returnByValue: true
    });
    console.log('PLAYER VIEW MESHES:', JSON.stringify(res.result?.value, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill();
    process.exit(0);
  }
}, 3000);

import { spawn } from 'node:child_process';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9227',
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  'http://localhost:3000/player'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9227/json/list');
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
    await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('.character-card, button'));
        const t = cards.find(c => c.textContent && c.textContent.includes('Trinity'));
        if (t) t.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const scene = window.world?.terrainScene;
        const camera = scene?.activeCamera;
        const mx = 19.5, mz = 108.0;
        const nearby = [];
        for (const m of scene.meshes) {
          if (!m.isVisible || !m.isEnabled()) continue;
          const bi = m.getBoundingInfo();
          const center = bi.boundingBox.centerWorld;
          const szX = bi.boundingBox.maximumWorld.x - bi.boundingBox.minimumWorld.x;
          const szY = bi.boundingBox.maximumWorld.y - bi.boundingBox.minimumWorld.y;
          const szZ = bi.boundingBox.maximumWorld.z - bi.boundingBox.minimumWorld.z;
          const dist = Math.hypot(center.x - mx, center.z - mz);
          if (dist < 120 && (szX > 10 || szY > 5 || szZ > 10)) {
            nearby.push({
              name: m.name,
              dist: dist.toFixed(1),
              center: [center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1)],
              size: [szX.toFixed(1), szY.toFixed(1), szZ.toFixed(1)],
              mat: m.material?.name,
              diffuse: m.material?.diffuseColor?.toHexString?.()
            });
          }
        }
        return {
          cameraTarget: camera ? [camera.target.x, camera.target.y, camera.target.z] : null,
          alpha: camera?.alpha,
          beta: camera?.beta,
          radius: camera?.radius,
          nearby
        };
      })()`,
      returnByValue: true
    });
    console.log('NEARBY MESHES:', JSON.stringify(res.result?.value, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill();
    process.exit(0);
  }
}, 3000);

import { spawn } from 'node:child_process';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9223',
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  'http://localhost:3000/dm'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const tabs = await listRes.json();
    const dmTab = tabs.find(t => t.url.includes('/dm')) || tabs[0];
    const ws = new WebSocket(dmTab.webSocketDebuggerUrl);
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
    // Click button to enter
    await send('Runtime.evaluate', {
      expression: `(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Entrar en la mesa'));
        if (b) b.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const engine = window.world?.terrainScene?.getEngine();
        const scenes = engine ? engine.scenes : [window.world?.terrainScene].filter(Boolean);
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
            const cy = (min.y + max.y) / 2;
            if (szX > 50 && szZ > 30) {
              out.push({
                name: m.name,
                sceneIdx: scenes.indexOf(scene),
                size: [szX.toFixed(1), szY.toFixed(2), szZ.toFixed(1)],
                center: [((min.x+max.x)/2).toFixed(1), cy.toFixed(2), ((min.z+max.z)/2).toFixed(1)],
                matName: m.material?.name,
                matClass: m.material?.getClassName(),
                alpha: m.material?.alpha,
                diffuse: m.material?.diffuseColor?.toHexString?.()
              });
            }
          }
        }
        return out;
      })()`,
      returnByValue: true
    });
    console.log('RES:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill();
    process.exit(0);
  }
}, 3000);

import { spawn } from 'node:child_process';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9224',
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  'http://localhost:3000/dm'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9224/json/list');
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
    await send('Runtime.evaluate', {
      expression: `(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Entrar en la mesa'));
        if (b) b.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));
    // Switch scene to dragon-rest
    await send('Runtime.evaluate', {
      expression: `(() => {
        const select = document.getElementById('scene');
        if (select) {
          select.value = 'dragon-rest';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const scenes = window.world?.terrainScene?.getEngine()?.scenes || [window.world?.terrainScene];
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
            const diff = m.material?.diffuseColor?.toHexString?.() || '';
            const emiss = m.material?.emissiveColor?.toHexString?.() || '';
            if (szX > 30 || szY > 15 || diff === '#ffffff' || emiss === '#ffffff') {
              out.push({
                name: m.name,
                size: [szX.toFixed(1), szY.toFixed(1), szZ.toFixed(1)],
                pos: [m.position.x.toFixed(1), m.position.y.toFixed(1), m.position.z.toFixed(1)],
                matName: m.material?.name,
                matClass: m.material?.getClassName(),
                diffuse: diff,
                emissive: emiss,
                hasTexture: !!(m.material?.diffuseTexture)
              });
            }
          }
        }
        return out;
      })()`,
      returnByValue: true
    });
    console.log('RETIRO BIG/WHITE MESHES:', JSON.stringify(res.result?.value, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    chromeProc.kill();
    process.exit(0);
  }
}, 3000);

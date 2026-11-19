import { spawn } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9222;
const chromeProc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--use-gl=angle',
  '--window-size=1600,900',
  '--no-sandbox',
  'http://localhost:3000/dm'
]);

let killed = false;
function cleanup() {
  if (!killed) {
    killed = true;
    try { chromeProc.kill(); } catch {}
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
  const dmTab = tabs.find(t => t.url.includes('/dm')) || tabs[0];
  const ws = new WebSocket(dmTab.webSocketDebuggerUrl);

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

  await wait(2000);

  // Click Enter
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (enterBtn) enterBtn.click();
    })()`
  });

  await wait(2500);

  // Switch scene to wreck-ship
  await send('Runtime.evaluate', {
    expression: `(() => {
      const select = document.getElementById('scene');
      if (select && select.value !== 'wreck-ship') {
        select.value = 'wreck-ship';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });

  await wait(3500);

  // Query window.world.terrainScene meshes
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.world?.terrainScene;
      if (!scene) return { error: 'No terrainScene found on window.world' };
      const out = [];
      for (const m of scene.meshes) {
        if (!m.isEnabled() || !m.isVisible) continue;
        const bi = m.getBoundingInfo();
        const min = bi.boundingBox.minimumWorld;
        const max = bi.boundingBox.maximumWorld;
        const szX = max.x - min.x;
        const szY = max.y - min.y;
        const szZ = max.z - min.z;
        const mat = m.material;
        const diff = mat?.diffuseColor ? mat.diffuseColor.toHexString() : 'no-diff';
        const emiss = mat?.emissiveColor ? mat.emissiveColor.toHexString() : 'no-emiss';
        // Look for anything wide and flat or with high brightness
        if ((szX > 8 && szZ > 8 && szY < 5) || diff === '#ffffff' || diff.startsWith('#ff') || diff.startsWith('#ee')) {
          out.push({
            name: m.name,
            size: [szX.toFixed(1), szY.toFixed(2), szZ.toFixed(1)],
            minY: min.y.toFixed(2),
            maxY: max.y.toFixed(2),
            matName: mat?.name,
            matClass: mat?.getClassName(),
            diffuse: diff,
            alpha: m.visibility * (mat?.alpha ?? 1),
            useVertexColors: m.useVertexColors,
            hasVertexAlpha: m.hasVertexAlpha,
            hasTexture: !!(mat?.diffuseTexture),
            texName: mat?.diffuseTexture?.name
          });
        }
      }
      return { totalMeshes: scene.meshes.length, matching: out };
    })()`,
    returnByValue: true
  });

  console.log('QUERY RESULT:');
  console.log(JSON.stringify(res.result?.value, null, 2));

  cleanup();
}

main().catch(e => { console.error(e); cleanup(); });

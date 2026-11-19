import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9243;
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
  const playerTab = tabs[0];
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

  await wait(4000);

  // Click continuar or join
  await send('Runtime.evaluate', {
    expression: `(() => {
      const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
      if (contBtn) contBtn.click();
      const join = document.getElementById('join');
      if (join) {
        const btns = Array.from(join.querySelectorAll('button'));
        const trinityBtn = btns.find(b => b.parentElement?.textContent?.includes('Trinity') || b.textContent.includes('Elegir'));
        if (trinityBtn) trinityBtn.click();
      }
    })()`
  });

  await wait(3000);

  // Find Babylon scene by inspecting world properties
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const w = window.world;
      if (!w) return 'No world';
      let foundScene = null;
      for (const k of Object.keys(w)) {
        try {
          if (w[k] && w[k].meshes && w[k].materials) {
            foundScene = w[k];
            break;
          }
        } catch {}
      }
      if (!foundScene) return { keys: Object.keys(w) };
      return foundScene.meshes.map(m => {
        const mat = m.material;
        return {
          name: m.name,
          enabled: m.isEnabled(),
          visible: m.isVisible,
          matName: mat?.name,
          diffuseColor: mat?.diffuseColor ? mat.diffuseColor.toHexString() : null,
          albedoColor: mat?.albedoColor ? mat.albedoColor.toHexString() : null,
          tex: mat?.diffuseTexture?.name || mat?.albedoTexture?.name || null
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('Scene inspect:', JSON.stringify(res.result?.value, null, 2));

  // Screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/retreat-player-inspected.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved output/retreat-player-inspected.png');

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

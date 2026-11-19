import { spawn } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9224;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  '--no-sandbox',
  'http://localhost:3000/dm'
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
  // Dismiss dialogs and switch scene
  await send('Runtime.evaluate', {
    expression: `(() => {
      const dlg = document.getElementById('campUpdatesDialog');
      if (dlg) { try { dlg.close(); } catch {} dlg.remove(); }
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (enterBtn) enterBtn.click();
      const select = document.getElementById('scene');
      if (select) {
        select.value = 'wreck-ship';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });

  // Wait for loading to finish
  for (let i = 0; i < 40; i++) {
    await wait(500);
    const check = await send('Runtime.evaluate', {
      expression: `!document.body.innerText.includes('Preparando escenario')`,
      returnByValue: true
    });
    if (check.result?.value) break;
  }
  await wait(3000);

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = window.world?.terrainScene;
      if (!s) return 'No terrainScene';
      return s.meshes.map(m => {
        const mat = m.material;
        let min = null, max = null;
        try {
          const bb = m.getBoundingInfo().boundingBox;
          min = [Math.round(bb.minimumWorld.x), Math.round(bb.minimumWorld.y), Math.round(bb.minimumWorld.z)];
          max = [Math.round(bb.maximumWorld.x), Math.round(bb.maximumWorld.y), Math.round(bb.maximumWorld.z)];
        } catch {}
        return {
          name: m.name,
          visible: m.isVisible,
          enabled: m.isEnabled(),
          min,
          max,
          matName: mat?.name,
          matClass: mat?.getClassName?.(),
          diffuseColor: mat?.diffuseColor ? [mat.diffuseColor.r, mat.diffuseColor.g, mat.diffuseColor.b] : null,
          texName: mat?.diffuseTexture?.name || null
        };
      });
    })()`,
    returnByValue: true
  });

  const meshes = res.result?.value || [];
  console.log('Total meshes:', meshes.length);
  for (const m of meshes) {
    if (m.name.includes('grid') || m.name.includes('terrain') || m.name.includes('sea') || m.name.includes('ocean') || m.name.includes('water') || m.name.includes('slab') || m.name.includes('box') || m.name.includes('plane') || m.name.includes('ground') || m.name.includes('c1') || m.name.includes('hull')) {
      console.log(JSON.stringify(m));
    }
  }

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

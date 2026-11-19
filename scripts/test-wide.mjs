import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9227;
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
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = (msg.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
      console.log('[BROWSER CONSOLE]', msg.params.type, args);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
    }
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

  await wait(2000);

  // Close modals and switch scene
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

  // Loop up to 30s waiting for loading
  for (let i = 0; i < 60; i++) {
    await wait(500);
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn) {
          contBtn.click();
          return 'clicked-continuar';
        }
        if (text.includes('Preparando escenario')) return 'preparing';
        return 'ready';
      })()`,
      returnByValue: true
    });
    console.log('Poll', i, 'status:', status.result?.value);
    if (status.result?.value === 'ready' && i > 5) break;
  }

  await wait(2000);

  // Set camera to wide zoom
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cam = window.world?.terrainScene?.activeCamera;
      if (cam) {
        cam.alpha = Math.PI / 2;
        cam.beta = 1.15;
        if (cam.radius !== undefined) cam.radius = 90;
        if (cam.target) cam.target.set(42, -2, 24);
        if (cam.orthoLeft !== undefined) {
          cam.orthoLeft = -45; cam.orthoRight = 45;
          cam.orthoTop = 25; cam.orthoBottom = -25;
        }
      }
    })()`
  });

  await wait(1500);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/wide-zoom-test.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved output/wide-zoom-test.png');

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

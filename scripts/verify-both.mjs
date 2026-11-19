import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9235;
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
  await send('Page.enable');

  await wait(2000);

  // Close modals and switch scene in DM to wreck-ship
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

  // Wait for loading to finish and click CONTINUAR if present
  for (let i = 0; i < 30; i++) {
    await wait(500);
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const contBtn = btns.find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden) {
          contBtn.click();
          return 'clicked';
        }
        if (document.body.innerText.includes('Preparando escenario')) return 'loading';
        return 'ready';
      })()`,
      returnByValue: true
    });
    if (res.result?.value === 'ready' && i > 3) break;
  }

  await wait(2000);

  // Position camera on wreck overview
  await send('Runtime.evaluate', {
    expression: `(() => {
      const dlg = document.getElementById('campUpdatesDialog');
      if (dlg) { try { dlg.close(); } catch {} dlg.remove(); }
      const mapWin = document.getElementById('mapWindow');
      if (mapWin) {
        mapWin.style.width = '100vw';
        mapWin.style.height = '100vh';
        mapWin.style.position = 'fixed';
        mapWin.style.inset = '0';
        mapWin.style.zIndex = '9999';
      }
      window.dispatchEvent(new Event('resize'));
      const cam = window.world?.terrainScene?.activeCamera;
      if (cam) {
        cam.alpha = Math.PI / 2;
        cam.beta = 1.05;
        if (cam.target) cam.target.set(42, 0, 24);
      }
    })()`
  });

  await wait(1500);

  const shotDm = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/dm-final-wreck.png', Buffer.from(shotDm.data, 'base64'));
  console.log('Saved output/dm-final-wreck.png');

  // Now navigate to player view
  await send('Page.navigate', { url: 'http://localhost:3000/player' });
  await wait(3000);

  for (let i = 0; i < 30; i++) {
    await wait(500);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden) { contBtn.click(); return 'clicked'; }
        if (document.body.innerText.includes('Preparando escenario')) return 'loading';
        return 'ready';
      })()`,
      returnByValue: true
    });
    if (check.result?.value === 'ready' && i > 3) break;
  }

  // Pick Trinity if on join screen
  await send('Runtime.evaluate', {
    expression: `(() => {
      const join = document.getElementById('join');
      if (join && !join.hidden) {
        const trinity = Array.from(join.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Elegir'));
        if (trinity) trinity.click();
      }
    })()`
  });

  await wait(2500);

  const shotPlayer = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/player-final.png', Buffer.from(shotPlayer.data, 'base64'));
  console.log('Saved output/player-final.png');

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

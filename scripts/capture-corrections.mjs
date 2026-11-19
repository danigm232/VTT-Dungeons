import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

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
  await send('Page.enable');

  await wait(2000);

  // Click Enter
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (enterBtn) enterBtn.click();
    })()`
  });

  await wait(1500);

  // Dismiss modal if present
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const contBtn = btns.find(b => b.textContent && (b.textContent.includes('CONTINUAR') || b.textContent.includes('Continuar')));
      if (contBtn) contBtn.click();
    })()`
  });

  await wait(1500);

  // Select scene: wreck-ship
  await send('Runtime.evaluate', {
    expression: `(() => {
      const select = document.getElementById('scene');
      if (select && select.value !== 'wreck-ship') {
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
    if (check.result.value) break;
  }

  await wait(2000);

  // Dismiss any secondary modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const contBtn = btns.find(b => b.textContent && (b.textContent.includes('CONTINUAR') || b.textContent.includes('Continuar')));
      if (contBtn) contBtn.click();
      const mapWin = document.getElementById('mapWindow');
      if (mapWin) {
        mapWin.style.width = '100vw';
        mapWin.style.height = '100vh';
        mapWin.style.position = 'fixed';
        mapWin.style.inset = '0';
        mapWin.style.zIndex = '9999';
      }
      window.dispatchEvent(new Event('resize'));
    })()`
  });

  await wait(2500);

  // Capture Overview 1: Full ship overview
  const shotOverview = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/pecio-overview-fixed.png', Buffer.from(shotOverview.data, 'base64'));
  console.log('Saved output/pecio-overview-fixed.png');

  // Zoom into Hole 1 & Midship dressing
  await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.world?.terrainScene;
      if (scene?.activeCamera) {
        const cam = scene.activeCamera;
        cam.target.set(38.5, 0.5, 21.0);
        cam.radius = 14;
        if (cam.orthoTop !== undefined) {
          cam.orthoTop = 5;
          cam.orthoBottom = -5;
          cam.orthoLeft = -8;
          cam.orthoRight = 8;
        }
      }
    })()`
  });
  await wait(1500);

  const shotHole1 = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/pecio-hole1-and-dressing.png', Buffer.from(shotHole1.data, 'base64'));
  console.log('Saved output/pecio-hole1-and-dressing.png');

  // Zoom into Forecastle (C2) showing perching seagull on rail cap and grounded barrel
  await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.world?.terrainScene;
      if (scene?.activeCamera) {
        const cam = scene.activeCamera;
        cam.target.set(60.0, 3.5, 28.0);
        cam.radius = 12;
        if (cam.orthoTop !== undefined) {
          cam.orthoTop = 4;
          cam.orthoBottom = -4;
          cam.orthoLeft = -6;
          cam.orthoRight = 6;
        }
      }
    })()`
  });
  await wait(1500);

  const shotGull = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/pecio-seagull-rail-perch.png', Buffer.from(shotGull.data, 'base64'));
  console.log('Saved output/pecio-seagull-rail-perch.png');

  // Zoom into Quarterdeck (C3) showing perching seagull on rail, grounded crab, and hanging timber
  await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.world?.terrainScene;
      if (scene?.activeCamera) {
        const cam = scene.activeCamera;
        cam.target.set(24.0, 3.2, 12.0);
        cam.radius = 12;
        if (cam.orthoTop !== undefined) {
          cam.orthoTop = 4;
          cam.orthoBottom = -4;
          cam.orthoLeft = -6;
          cam.orthoRight = 6;
        }
      }
    })()`
  });
  await wait(1500);

  const shotC3 = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/pecio-c3-dressing.png', Buffer.from(shotC3.data, 'base64'));
  console.log('Saved output/pecio-c3-dressing.png');

  cleanup();
}

main().catch(e => { console.error('Error in capture-corrections:', e); cleanup(); });

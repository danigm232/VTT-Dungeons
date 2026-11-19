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

  // Close campUpdatesDialog modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const dlg = document.getElementById('campUpdatesDialog');
      if (dlg) {
        try { dlg.close(); } catch {}
        dlg.remove();
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (enterBtn) enterBtn.click();
    })()`
  });

  await wait(1000);

  // Switch scene to wreck-ship
  await send('Runtime.evaluate', {
    expression: `(() => {
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

  await wait(2000);

  // Maximise map window to full viewport
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
    })()`
  });

  await wait(1500);

  // =========================================================================
  // PASS 1: OVERVIEW 2.5D PERSPECTIVE (TÁCTICA GENERAL)
  // =========================================================================
  console.log('Capturing Pass 1: Overview 2.5D perspective...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const focusSelect = document.getElementById('focus');
      if (focusSelect) {
        focusSelect.value = '';
        focusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const world = window.world;
      if (world && world.terrainScene && world.terrainScene.activeCamera) {
        const cam = world.terrainScene.activeCamera;
        cam.alpha = Math.PI / 2;
        cam.beta = 1.05; // ~60 deg
      }
    })()`
  });
  await wait(2000);
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/audit-pass1-overview.png', Buffer.from(shot1.data, 'base64'));
  console.log('Pass 1 saved: output/audit-pass1-overview.png');

  // =========================================================================
  // PASS 2: CLOSE-UP DECK LEVEL PERSPECTIVE (A RAS DE CUBIERTA C1)
  // =========================================================================
  console.log('Capturing Pass 2: Close-up deck perspective...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const world = window.world;
      if (world && world.terrainScene && world.terrainScene.activeCamera) {
        const cam = world.terrainScene.activeCamera;
        cam.alpha = Math.PI / 2 - 0.22;
        cam.beta = 0.95; // ~54 deg
        if (cam.target) cam.target.set(40.0, 0.5, 21.0);
        if (cam.orthoLeft !== undefined) {
          cam.orthoLeft = -12; cam.orthoRight = 12;
          cam.orthoTop = 7; cam.orthoBottom = -7;
        } else if (cam.radius !== undefined) {
          cam.radius = 18;
        }
      }
    })()`
  });
  await wait(2000);
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/audit-pass2-closeup-deck.png', Buffer.from(shot2.data, 'base64'));
  console.log('Pass 2 saved: output/audit-pass2-closeup-deck.png');

  // =========================================================================
  // PASS 3: STARBOARD WATER-LEVEL / MARINE PERSPECTIVE (FLANCO ESTRIBOR & MAR)
  // =========================================================================
  console.log('Capturing Pass 3: Starboard water-level perspective...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const world = window.world;
      if (world && world.terrainScene && world.terrainScene.activeCamera) {
        const cam = world.terrainScene.activeCamera;
        cam.alpha = Math.PI / 2 + 0.35; // yaw offset showing starboard side breach
        cam.beta = 1.25; // lower pitch
        if (cam.target) cam.target.set(34.0, -1.0, 18.0);
        if (cam.orthoLeft !== undefined) {
          cam.orthoLeft = -18; cam.orthoRight = 18;
          cam.orthoTop = 10; cam.orthoBottom = -10;
        } else if (cam.radius !== undefined) {
          cam.radius = 28;
        }
      }
    })()`
  });
  await wait(2000);
  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/audit-pass3-starboard-marine.png', Buffer.from(shot3.data, 'base64'));
  console.log('Pass 3 saved: output/audit-pass3-starboard-marine.png');

  cleanup();
  console.log('Triple audit capture complete!');
}

main().catch(e => {
  console.error('Error in audit capture:', e);
  cleanup();
  process.exit(1);
});

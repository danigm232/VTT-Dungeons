import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9255;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1920,1080',
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

async function connectTab(url) {
  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const tabs = await listRes.json();
  const tab = tabs.find(t => t.url.includes(url)) || tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

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
  return { ws, send };
}

async function main() {
  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) break;
    } catch {}
  }

  console.log('Connecting to DM view...');
  const dm = await connectTab('dm');

  // Dismiss modal by clicking "Entrar en la mesa"
  await wait(2000);
  const clickRes = await dm.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (btn) {
        btn.click();
        return 'Clicked Entrar en la mesa';
      }
      return 'Button not found, buttons: ' + btns.map(b => b.textContent?.trim()).join(' | ');
    })()`,
    returnByValue: true
  });
  console.log(clickRes.result?.value);

  // Wait for 3D terrain to render
  await wait(5000);

  // Check scene title in header
  const titleRes = await dm.send('Runtime.evaluate', {
    expression: `document.body.innerText.slice(0, 300)`,
    returnByValue: true
  });
  console.log('DM text:', titleRes.result?.value?.replace(/\\n/g, ' '));

  // Capture screenshot of DM view of wreck
  const shotDm = await dm.send('Page.captureScreenshot', { format: 'png' });
  const outDm = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\captura-dm-pecio-real.png';
  await fs.writeFile(outDm, Buffer.from(shotDm.data, 'base64'));
  console.log('Saved', outDm);

  // --- NOW GO TO PLAYER VIEW ---
  console.log('Navigating to Player view...');
  await dm.send('Page.navigate', { url: 'http://localhost:3000/player' });
  await wait(3000);

  // Dismiss player intro modal if present
  await dm.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && (b.textContent.includes('Entrar en la mesa') || b.textContent.includes('CONTINUAR')));
      if (btn) btn.click();
    })()`
  });
  await wait(2000);

  // Select Trinity
  const pickRes = await dm.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('#characters button.choice, button'));
      const t = btns.find(b => b.innerText && b.innerText.includes('Trinity'));
      if (t) { t.click(); return 'Clicked Trinity'; }
      return 'Trinity not found: ' + btns.map(b => b.innerText?.trim()).join(' | ');
    })()`,
    returnByValue: true
  });
  console.log('Player select:', pickRes.result?.value);

  await wait(4000);

  // Capture Player View
  const shotPlayer = await dm.send('Page.captureScreenshot', { format: 'png' });
  const outPlayer = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\captura-jugador-trinity-pecio.png';
  await fs.writeFile(outPlayer, Buffer.from(shotPlayer.data, 'base64'));
  console.log('Saved', outPlayer);

  // Open Mochila
  await dm.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('inventoryButton');
      if (btn) btn.click();
    })()`
  });
  await wait(1500);

  // Capture Mochila
  const shotMochila = await dm.send('Page.captureScreenshot', { format: 'png' });
  const outMochila = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\captura-mochila-con-antorcha.png';
  await fs.writeFile(outMochila, Buffer.from(shotMochila.data, 'base64'));
  console.log('Saved', outMochila);

  // Click Antorcha in Mochila
  await dm.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('#inventory button, #inventory .inventory-card, .inventory-item'));
      const torch = btns.find(b => b.innerText && b.innerText.includes('Antorcha'));
      if (torch) torch.click();
    })()`
  });
  await wait(1000);

  const shotTorchAction = await dm.send('Page.captureScreenshot', { format: 'png' });
  const outTorchAction = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\captura-antorcha-accion.png';
  await fs.writeFile(outTorchAction, Buffer.from(shotTorchAction.data, 'base64'));
  console.log('Saved', outTorchAction);

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

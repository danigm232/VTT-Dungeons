import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9246;
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

  console.log('Connecting to Player view...');
  const player = await connectTab('player');

  // Dismiss "Continuar" if present
  for (let i = 0; i < 30; i++) {
    await wait(1000);
    const status = await player.send('Runtime.evaluate', {
      expression: `(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden) { contBtn.click(); return 'clicked'; }
        if (document.body.innerText.includes('Preparando escenario')) return 'loading';
        return 'loaded';
      })()`,
      returnByValue: true
    });
    if (status.result?.value === 'loaded' || status.result?.value === 'clicked') {
      await wait(1000);
      break;
    }
  }

  // Specifically pick Trinity (Maria)
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('#characters button.choice'));
      const trinityBtn = buttons.find(b => b.innerText.includes('Trinity'));
      if (trinityBtn) {
        trinityBtn.click();
        return 'Trinity clicked';
      }
      return 'Trinity not found among ' + buttons.length;
    })()`
  });

  await wait(3000);

  // Take screenshot of Trinity on the wreck
  const shotTrinityWreck = await player.send('Page.captureScreenshot', { format: 'png' });
  const outWreck = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-en-el-pecio.png';
  await fs.writeFile(outWreck, Buffer.from(shotTrinityWreck.data, 'base64'));
  console.log('Saved', outWreck);

  // Open inventory (Mochila)
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('inventoryButton');
      if (btn) btn.click();
    })()`
  });

  await wait(1500);

  // Capture Mochila screenshot for Trinity
  const shotMochila = await player.send('Page.captureScreenshot', { format: 'png' });
  const outMochila = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-mochila-antorcha-real.png';
  await fs.writeFile(outMochila, Buffer.from(shotMochila.data, 'base64'));
  console.log('Saved', outMochila);

  // Click on "Antorcha" in the inventory to see its details & actions!
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('#inventory button, #inventory .inventory-card'));
      const torchBtn = buttons.find(b => b.innerText.includes('Antorcha'));
      if (torchBtn) torchBtn.click();
    })()`
  });
  await wait(1000);

  // Capture details showing action to light torch
  const shotTorchDetails = await player.send('Page.captureScreenshot', { format: 'png' });
  const outTorchDetails = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-antorcha-seleccionada.png';
  await fs.writeFile(outTorchDetails, Buffer.from(shotTorchDetails.data, 'base64'));
  console.log('Saved', outTorchDetails);

  // --- 2. DM VIEW ---
  console.log('Navigating to DM view...');
  await player.send('Page.navigate', { url: 'http://localhost:3000/dm' });
  await wait(5000);

  // Dismiss overlay if present
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cont = btns.find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
      if (cont) cont.click();
    })()`
  });
  await wait(4000);

  const shotDm = await player.send('Page.captureScreenshot', { format: 'png' });
  const outDm = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\dm-final-vista-completa.png';
  await fs.writeFile(outDm, Buffer.from(shotDm.data, 'base64'));
  console.log('Saved', outDm);

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

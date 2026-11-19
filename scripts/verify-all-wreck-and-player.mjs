import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9251;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1920,1080',
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

  console.log('Connecting to Player...');
  const player = await connectTab('player');

  // Dismiss intro modal
  for (let i = 0; i < 20; i++) {
    await wait(1000);
    const status = await player.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && (b.textContent.includes('CONTINUAR') || b.textContent.includes('ENTRAR')));
        if (btn && !btn.hidden) { btn.click(); return 'clicked'; }
        if (document.body.innerText.includes('Preparando escenario')) return 'loading';
        return 'ready';
      })()`,
      returnByValue: true
    });
    if (status.result?.value === 'ready' || status.result?.value === 'clicked') {
      await wait(1500);
      break;
    }
  }

  // Select Trinity
  const selRes = await player.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('#characters button.choice'));
      const trinityBtn = buttons.find(b => b.innerText.includes('Trinity'));
      if (trinityBtn) {
        trinityBtn.click();
        return 'Trinity clicked';
      }
      return 'Not found, buttons: ' + buttons.map(b => b.innerText).join(' | ');
    })()`,
    returnByValue: true
  });
  console.log('Select Trinity:', selRes.result?.value);
  await wait(4000);

  // Capture Player View on Deck
  const shotDeck = await player.send('Page.captureScreenshot', { format: 'png' });
  const outDeck = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-en-el-pecio-v2.png';
  await fs.writeFile(outDeck, Buffer.from(shotDeck.data, 'base64'));
  console.log('Saved', outDeck);

  // Open Mochila
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('inventoryButton');
      if (btn) btn.click();
    })()`
  });
  await wait(1500);

  // Check items in Mochila
  const invItems = await player.send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('#inventory .inventory-card, #inventory button'));
      return cards.map(c => c.innerText?.trim()).filter(Boolean);
    })()`,
    returnByValue: true
  });
  console.log('Inventory cards:', invItems.result?.value);

  // Capture Mochila screenshot
  const shotMochila = await player.send('Page.captureScreenshot', { format: 'png' });
  const outMochila = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-mochila-antorcha-confirmada.png';
  await fs.writeFile(outMochila, Buffer.from(shotMochila.data, 'base64'));
  console.log('Saved', outMochila);

  // Click Antorcha to show selection
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('#inventory button, #inventory .inventory-card'));
      const torchBtn = buttons.find(b => b.innerText && b.innerText.includes('Antorcha'));
      if (torchBtn) torchBtn.click();
    })()`
  });
  await wait(1000);

  const shotTorch = await player.send('Page.captureScreenshot', { format: 'png' });
  const outTorch = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-antorcha-activa.png';
  await fs.writeFile(outTorch, Buffer.from(shotTorch.data, 'base64'));
  console.log('Saved', outTorch);

  // Close Mochila
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cerrar'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await wait(1000);

  // Audit Babylon Scene from Player view
  const sceneAudit = await player.send('Runtime.evaluate', {
    expression: `(() => {
      const engines = window.BABYLON?.Engine?.Instances || [];
      const scene = engines[0]?.scenes?.[0];
      if (!scene) return { error: 'No scene found' };
      const names = scene.meshes.map(m => m.name);
      return {
        sceneMeshes: scene.meshes.length,
        crabs: names.filter(n => n.includes('crab')),
        gulls: names.filter(n => n.includes('gull')),
        swaying: names.filter(n => n.includes('swaying')),
        skeletons: names.filter(n => n.includes('skeleton')),
        barrels: names.filter(n => n.includes('barrel')),
        crates: names.filter(n => n.includes('crate')),
        holes: names.filter(n => n.includes('hole')),
        ocean: names.filter(n => n.includes('ocean') || n.includes('drift'))
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene meshes audit:', JSON.stringify(sceneAudit.result?.value, null, 2));

  // --- DM VIEW ---
  console.log('Navigating to DM view...');
  await player.send('Page.navigate', { url: 'http://localhost:3000/dm' });
  await wait(5000);

  // Dismiss DM intro
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cont = btns.find(b => b.textContent && (b.textContent.includes('CONTINUAR') || b.textContent.includes('ENTRAR')));
      if (cont) cont.click();
    })()`
  });
  await wait(4000);

  const shotDm = await player.send('Page.captureScreenshot', { format: 'png' });
  const outDm = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\dm-final-sin-plano-blanco.png';
  await fs.writeFile(outDm, Buffer.from(shotDm.data, 'base64'));
  console.log('Saved', outDm);

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

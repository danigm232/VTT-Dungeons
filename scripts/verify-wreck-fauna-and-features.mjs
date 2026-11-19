import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9247;
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

  // Select Trinity
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('#characters button.choice'));
      const trinityBtn = buttons.find(b => b.innerText.includes('Trinity'));
      if (trinityBtn) { trinityBtn.click(); return 'Trinity selected'; }
      return 'not found';
    })()`,
    returnByValue: true
  });

  await wait(3000);

  // Inspect what meshes exist in the Babylon scene on Player view
  const sceneAudit = await player.send('Runtime.evaluate', {
    expression: `(() => {
      const scene = window.__debugTerrainScene || (window.worldRenderer && window.worldRenderer.terrainScene);
      const meshes = scene ? scene.meshes.map(m => m.name) : [];
      const crabs = meshes.filter(n => n.includes('crab'));
      const gulls = meshes.filter(n => n.includes('gull'));
      const swaying = meshes.filter(n => n.includes('swaying'));
      const poops = meshes.filter(n => n.includes('gull-poop'));
      return {
        hasScene: Boolean(scene),
        totalMeshes: meshes.length,
        crabs,
        gulls,
        swaying,
        poops
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene audit from Player view:', JSON.stringify(sceneAudit.result?.value, null, 2));

  // Check Mochila / Inventory
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('inventoryButton');
      if (btn) btn.click();
    })()`
  });
  await wait(1500);

  const shotMochila = await player.send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\trinity-mochila-antorcha-actualizada.png', Buffer.from(shotMochila.data, 'base64'));
  console.log('Saved updated mochila screenshot');

  // Close inventory modal
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cerrar'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await wait(1000);

  // Take screenshot of player on deck
  const shotPlayerDeck = await player.send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\pecio-jugador-cubierta.png', Buffer.from(shotPlayerDeck.data, 'base64'));

  // Switch to DM view for full overview and audit
  console.log('Navigating to DM view...');
  await player.send('Page.navigate', { url: 'http://localhost:3000/dm' });
  await wait(5000);

  // Dismiss DM intro
  await player.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cont = btns.find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
      if (cont) cont.click();
    })()`
  });
  await wait(3000);

  const shotDmView = await player.send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('C:\\Users\\User\\.gemini\\antigravity\\brain\\f7b02bd7-0421-4e62-9b5d-748ce35fedba\\pecio-dm-vista-completa.png', Buffer.from(shotDmView.data, 'base64'));
  console.log('Saved DM view screenshot');

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

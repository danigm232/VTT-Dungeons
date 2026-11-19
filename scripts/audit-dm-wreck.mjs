import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, ['--remote-debugging-port=9250', '--headless=new', 'http://localhost:3000/dm']);

async function run() {
  await new Promise(r => setTimeout(r, 4000));
  const list = await (await fetch('http://127.0.0.1:9250/json/list')).json();
  const tab = list.find(t => t.url.includes('dm'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((res, rej) => {
    const msgId = id++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === msgId) {
        ws.removeEventListener('message', handler);
        if (msg.error) rej(msg.error);
        else res(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  // Dismiss overlay
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CONTINUAR'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Check current scene and switch to wreck-ship if needed
  const sceneNav = await send('Runtime.evaluate', {
    expression: `(() => {
      // Find scene selector in DM UI
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const wreckBtn = buttons.find(b => b.innerText && b.innerText.includes('Rosa de los Vientos'));
      if (wreckBtn) {
        wreckBtn.click();
        return 'Clicked wreck button: ' + wreckBtn.innerText;
      }
      return 'Wreck button not found, available: ' + buttons.map(b => b.innerText?.trim()).filter(Boolean).slice(0, 10).join(' | ');
    })()`,
    returnByValue: true
  });
  console.log('Scene nav:', sceneNav.result?.value);
  await new Promise(r => setTimeout(r, 3000));

  // Inspect Babylon meshes
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const engines = window.BABYLON?.Engine?.Instances || [];
      const scene = engines[0]?.scenes?.[0];
      if (!scene) return { error: 'No scene found', instances: engines.length };
      
      const meshes = scene.meshes.map(m => {
        const bi = m.getBoundingInfo();
        const min = bi.boundingBox.minimumWorld;
        const max = bi.boundingBox.maximumWorld;
        return {
          name: m.name,
          visible: m.isVisible,
          enabled: m.isEnabled(),
          sizeX: +(max.x - min.x).toFixed(1),
          sizeY: +(max.y - min.y).toFixed(2),
          sizeZ: +(max.z - min.z).toFixed(1),
          posY: +((min.y + max.y)/2).toFixed(2),
          mat: m.material?.name
        };
      });
      return {
        meshCount: meshes.length,
        largeMeshes: meshes.filter(m => m.sizeX > 20 && m.sizeZ > 20 && m.sizeY < 3)
      };
    })()`,
    returnByValue: true
  });
  console.log('DM Meshes audit:', JSON.stringify(res.result?.value, null, 2));

  // Capture screenshot of DM
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('C:/Users/User/.gemini/antigravity/brain/f7b02bd7-0421-4e62-9b5d-748ce35fedba/test-dm-wreck.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved test-dm-wreck.png');

  proc.kill();
}
run().catch(e => { console.error(e); proc.kill(); });

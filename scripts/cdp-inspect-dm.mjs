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
  console.log('Waiting for Chrome debugger endpoint...');
  let version = null;
  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {}
  }

  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const tabs = await listRes.json();
  const dmTab = tabs.find(t => t.url.includes('/dm')) || tabs[0];

  const ws = new WebSocket(dmTab.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  const logs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map(a => a.value || a.description).join(' ');
      logs.push(`[${msg.params.type}] ${args}`);
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

  console.log('Waiting for modal...');
  await wait(2000);

  // Click "Entrar en la mesa"
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (enterBtn) { enterBtn.click(); return 'Clicked enter'; }
      return 'No enter button';
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

  console.log('Waiting for "Preparando escenario..." to finish...');
  for (let i = 0; i < 40; i++) {
    await wait(500);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        return text.includes('Preparando escenario');
      })()`,
      returnByValue: true
    });
    if (!check.result.value) {
      console.log('Scene loaded after', (i + 1) * 0.5, 's');
      break;
    }
  }

  // Maximize map window so it matches user's screenshot
  await send('Runtime.evaluate', {
    expression: `(() => {
      const maxBtn = document.querySelector('#mapWindow [title*=\"Maximizar\"], #mapWindow button:nth-child(2)');
      // In user screenshot, the map is full view
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

  await wait(2000);

  // Inspect meshes
  const inspectRes = await send('Runtime.evaluate', {
    expression: `(() => {
      // Find all canvas and engines
      const engines = (window.BABYLON?.Engine?.Instances) || [];
      const canvas = document.querySelector('canvas.terrain-world');
      return {
        canvasFound: Boolean(canvas),
        canvasW: canvas?.width,
        canvasH: canvas?.height
      };
    })()`,
    returnByValue: true
  });
  console.log('Inspect result:', inspectRes.result.value);

  // Take screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/dm-live-screenshot.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved screenshot to output/dm-live-screenshot.png');

  console.log('--- Console Logs ---');
  console.log(logs.slice(-30).join('\n'));

  cleanup();
}

main().catch(e => {
  console.error('Error in main:', e);
  cleanup();
  process.exit(1);
});

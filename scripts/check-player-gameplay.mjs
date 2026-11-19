import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9231;
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
  const playerTab = tabs.find(t => t.url.includes('/player')) || tabs[0];
  const ws = new WebSocket(playerTab.webSocketDebuggerUrl);

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

  for (let i = 0; i < 40; i++) {
    await wait(1000);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        const contBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CONTINUAR'));
        if (contBtn && !contBtn.hidden) {
          contBtn.click();
          return 'clicked-continuar';
        }
        if (text.includes('Preparando escenario')) return 'loading';
        return 'loaded';
      })()`,
      returnByValue: true
    });
    if (check.result?.value === 'loaded' || check.result?.value === 'clicked-continuar') {
      await wait(1500);
      break;
    }
  }

  // Click "Elegir" for Trinity
  await send('Runtime.evaluate', {
    expression: `(() => {
      const join = document.getElementById('join');
      if (join) {
        const buttons = Array.from(join.querySelectorAll('button'));
        // Find Trinity button
        const trinityRow = Array.from(join.querySelectorAll('div, li, button')).find(el => el.textContent && el.textContent.includes('Trinity'));
        if (trinityRow) {
          const btn = trinityRow.querySelector('button') || trinityRow;
          btn.click();
        } else if (buttons[2]) {
          buttons[2].click();
        }
      }
    })()`
  });

  await wait(2500);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/player-in-game.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved output/player-in-game.png');

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

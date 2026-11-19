import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9229;
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
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = (msg.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
      console.log('[BROWSER CONSOLE]', msg.params.type, args);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
    }
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

  await wait(3000);

  // Take screenshot of player view
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('output/player-test.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved output/player-test.png');

  // Check retreatVisuals stats
  const stats = await send('Runtime.evaluate', {
    expression: `(() => {
      const w = window.world;
      return {
        sceneId: w?.sceneId,
        hasRetreatVisuals: !!w?.retreatVisuals,
        retreatStats: w?.retreatVisuals?.stats,
        materials: w?.terrainScene?.materials?.map(m => ({ name: m.name, class: m.getClassName(), diffuse: m.diffuseColor, albedo: m.albedoColor }))
      };
    })()`,
    returnByValue: true
  });

  console.log('World info:', JSON.stringify(stats.result?.value, null, 2));

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

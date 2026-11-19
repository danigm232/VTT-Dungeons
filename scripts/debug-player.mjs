import { spawn } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9240;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  '--no-sandbox',
  'about:blank'
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
  const playerTab = tabs[0];
  const ws = new WebSocket(playerTab.webSocketDebuggerUrl);

  const reqUrls = new Map();
  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Network.requestWillBeSent') {
      reqUrls.set(msg.params.requestId, msg.params.request.url);
    } else if (msg.method === 'Network.loadingFailed') {
      console.error('[LOAD FAILED]', reqUrls.get(msg.params.requestId), msg.params.errorText);
    } else if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        console.error('[HTTP ERROR]', msg.params.response.status, msg.params.response.url);
      }
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const args = (msg.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
      console.log('[CONSOLE]', msg.params.type, args);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[EXCEPTION]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
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
  await send('Network.enable');

  await send('Page.navigate', { url: 'http://localhost:3000/player' });

  for (let i = 0; i < 15; i++) {
    await wait(1000);
    const hasWorld = await send('Runtime.evaluate', {
      expression: `!!window.world`,
      returnByValue: true
    });
    console.log('Sec', i, 'hasWorld:', hasWorld.result?.value);
    if (hasWorld.result?.value) break;
  }

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

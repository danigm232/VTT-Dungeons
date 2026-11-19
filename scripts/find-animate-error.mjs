import { spawn } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9233;
const proc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
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

  await wait(2000);

  // Switch scene in DM to wreck-ship
  await send('Runtime.evaluate', {
    expression: `(() => {
      const dlg = document.getElementById('campUpdatesDialog');
      if (dlg) { try { dlg.close(); } catch {} dlg.remove(); }
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.textContent && b.textContent.includes('Entrar en la mesa'));
      if (enterBtn) enterBtn.click();
      const select = document.getElementById('scene');
      if (select) {
        select.value = 'wreck-ship';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });

  await wait(4000);

  // Check what error world.animate is throwing if any
  const errRes = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        window.world.animate(16);
        return 'No error in world.animate';
      } catch (e) {
        return { message: e.message, stack: e.stack };
      }
    })()`,
    returnByValue: true
  });
  console.log('Animate test result:', JSON.stringify(errRes.result?.value, null, 2));

  cleanup();
}

main().catch(e => {
  console.error(e);
  cleanup();
});

import { spawn } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, ['--remote-debugging-port=9253', '--headless=new', 'http://localhost:3000/player']);

async function run() {
  await new Promise(r => setTimeout(r, 3000));
  const list = await (await fetch('http://127.0.0.1:9253/json/list')).json();
  const tab = list.find(t => t.url.includes('player'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((res) => {
    const msgId = id++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === msgId) {
        ws.removeEventListener('message', handler);
        res(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 2000));

  // Click Trinity
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('#characters button.choice')).find(b => b.innerText.includes('Trinity'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  // Open inventory
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('inventoryButton');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // List all text inside #inventory
  const invData = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('inventory') || document.querySelector('.inventory-modal') || document.body;
      return {
        text: el.innerText
      };
    })()`,
    returnByValue: true
  });
  console.log('--- INVENTORY TEXT ---');
  console.log(invData.result?.value?.text);
  console.log('----------------------');

  proc.kill();
}

run().catch(e => { console.error(e); proc.kill(); });

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const wait = ms => new Promise(r => setTimeout(r, ms));

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9228',
  '--headless=new',
  '--disable-gpu-shader-disk-cache',
  '--window-size=1600,900',
  'http://localhost:3000/player'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9228/json/list');
    const tabs = await listRes.json();
    const playerTab = tabs.find(t => t.url.includes('/player')) || tabs[0];
    const ws = new WebSocket(playerTab.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise(r => {
      const mid = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === mid) { ws.removeEventListener('message', handler); r(msg.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: mid, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');
    await new Promise(r => setTimeout(r, 2000));

    // Choose Trinity
    await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('.character-card, button'));
        const t = cards.find(c => c.textContent && c.textContent.includes('Trinity'));
        if (t) t.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    // Wait until continue button is enabled, then click it
    for (let i = 0; i < 30; i++) {
      const isEnabled = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Continuar') || b.textContent.includes('CONTINUAR')));
          if (btn && !btn.disabled) {
            btn.click();
            return true;
          }
          return false;
        })()`,
        returnByValue: true
      });
      if (isEnabled.result.value) {
        console.log('Clicked enabled Continuar button');
        break;
      }
      await wait(500);
    }
    await wait(4000);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile('output/player-trinity-gameplay-deck.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved output/player-trinity-gameplay-deck.png');
  } catch (e) {
    console.error(e);
  } finally {
    chromeProc.kill();
    process.exit(0);
  }
}, 3000);

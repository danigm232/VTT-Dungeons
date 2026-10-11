import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:5173/campaigns/one-shot/playground/visual-preview.html');
  await page.waitForTimeout(3000);

  // Far
  await page.screenshot({ path: 'qa/audit-temple/temple-before-far.png' });

  // Mid (via interior toggle button)
  await page.click('#interior');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa/audit-temple/temple-before-mid.png' });

  // Close (closer camera by evaluating inside page)
  await page.evaluate(() => {
    // Click button to keep interior then change camera radius/target
    const canvases = document.querySelectorAll('canvas');
    // In visual-preview.html, engine and scene are in module scope, but active camera can be manipulated via mouse wheel or direct event
  });

  // Let's use mouse wheel to zoom in close to altar/nave
  await page.mouse.move(640, 360);
  for (let i = 0; i < 15; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'qa/audit-temple/temple-before-close.png' });

  await browser.close();
  console.log('Capture before: far, mid, close complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

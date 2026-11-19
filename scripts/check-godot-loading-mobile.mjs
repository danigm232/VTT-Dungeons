import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.GODOT_LOADING_URL??'http://127.0.0.1:47925';
const out=resolve('output/godot-skill-loading-20261114');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Users/User/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const checks=[];
try{
 const pages=[];
 for(const [character,label]of[['maria','Trinity'],['mike','Mike']]){
  const context=await browser.newContext({viewport:{width:390,height:700},hasTouch:true});const page=await context.newPage();pages.push(page);
  await page.goto(base);await page.locator('#character').selectOption(character);await page.locator('#connect').tap();await page.locator('#loading').waitFor({state:'visible'});
  try{await page.waitForFunction(()=>!document.querySelector('#continue').hidden,null,{timeout:90000});}catch(e){console.log(await page.locator('body').innerText());console.log(await page.evaluate(()=>({html:document.querySelector('#loading').innerHTML})));await page.screenshot({path:resolve(out,'mobile-failure.png')});throw e;}
  await page.screenshot({path:resolve(out,`mobile-${character}.png`)});
  const state=await page.evaluate(async()=>await(await fetch('/state?token='+localStorage.getItem('godot-loading-token'))).json());
  assert.equal(state.character,character);assert.ok(!state.participants.includes('mia'));checks.push({character,state});
 }
 const owner=pages[0],observer=pages[1];
 assert.ok(await owner.locator('#die').isVisible());assert.ok(await observer.locator('#die').isHidden());
 const forbidden=await observer.evaluate(async()=>{
  const token=localStorage.getItem('godot-loading-token');const s=await(await fetch('/state?token='+token)).json();return(await fetch('/roll',{method:'POST',body:JSON.stringify({token,entry:s.entry})})).status;
 });assert.equal(forbidden,409);
 await owner.locator('#die').tap();
 await owner.waitForFunction(()=>document.querySelector('.skill-die-tumble')?.getAttribute('display')!=='none');
 assert.equal(await owner.locator('.skill-die-tumble path').count(),20);
 const mesh=await owner.locator('.skill-die-tumble path').first().getAttribute('d');await owner.waitForTimeout(140);assert.notEqual(await owner.locator('.skill-die-tumble path').first().getAttribute('d'),mesh);
 await owner.screenshot({path:resolve(out,'mobile-rolling-d20.png')});
 await owner.waitForFunction(()=>document.querySelector('#result').textContent.includes('Resultado'));
 const rolled=await owner.evaluate(async()=>await(await fetch('/state?token='+localStorage.getItem('godot-loading-token'))).json());assert.ok(rolled.roll.natural>=1&&rolled.roll.natural<=20);assert.equal(rolled.canRoll,false);
 const duplicate=await owner.evaluate(async(entry)=>{const token=localStorage.getItem('godot-loading-token');return(await fetch('/roll',{method:'POST',body:JSON.stringify({token,entry})})).status;},rolled.entry);assert.equal(duplicate,409);
 await owner.reload();await owner.locator('#loading').waitFor({state:'visible'});assert.ok(await owner.locator('#die').isDisabled());
 await owner.screenshot({path:resolve(out,'mobile-result.png')});
 await owner.locator('#continue').tap();await observer.locator('#continue').tap();
 await owner.waitForFunction(()=>document.querySelector('#status').textContent==='Mapa listo');
 await observer.waitForFunction(()=>document.querySelector('#status').textContent==='Mapa listo');
 await writeFile(resolve(out,'mobile-tests.json'),JSON.stringify({base,checks,result:rolled.roll,projected20FaceDie:true,observerRejected:true,duplicateRejected:true,reconnectionRetainsRoll:true,realBootReady:true,sharedContinue:true,physicalPhones:false},null,2));
 console.log('PASS Godot HTTP real · Trinity/Mike · Mía excluida · d20 autorizado · observador y duplicado rechazados · reconexión · Continuar compartido');
}finally{await browser.close();}

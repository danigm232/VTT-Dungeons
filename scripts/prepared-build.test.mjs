import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { activateBuild } from './prepared-build.mjs';
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-build-audit-'));
  const stage = path.join(root, 'runtime', 'prepared-test');
  for (const file of ['web/apps/web/dm.html','web/apps/web/player.html','web/apps/web/projector.html','server/apps/server/index.js']) {
    const filename = path.join(stage, 'dist', file); await fs.mkdir(path.dirname(filename), { recursive:true }); await fs.writeFile(filename,'new');
  }
  await fs.writeFile(path.join(stage,'prepared.json'),JSON.stringify({root}));
  await fs.mkdir(path.join(root,'dist')); await fs.writeFile(path.join(root,'dist','former.txt'),'old');
  return { root, stage, saveRoot: path.join(root,'data','saves') };
}
test('installs a complete candidate and keeps the former build', async () => {
  const f = await fixture();
  try {
    await activateBuild(f.root,f.stage,f.saveRoot);
    assert.equal(await fs.readFile(path.join(f.root,'dist','web','apps','web','dm.html'),'utf8'),'new');
    const previous=(await fs.readdir(path.join(f.root,'runtime'))).find(name=>name.startsWith('previous-build-'));
    assert.equal(await fs.readFile(path.join(f.root,'runtime',previous,'former.txt'),'utf8'),'old');
  } finally { await fs.rm(f.root,{recursive:true,force:true}); }
});
test('rolls back the installed files if the final directory swap fails', async () => {
  const f = await fixture();
  try {
    await assert.rejects(activateBuild(f.root,f.stage,f.saveRoot,async(a,b)=>{
      if(a===path.join(f.stage,'dist'))throw new Error('disk failure');await fs.rename(a,b);
    }),/disk failure/);
    assert.equal(await fs.readFile(path.join(f.root,'dist','former.txt'),'utf8'),'old');
  } finally { await fs.rm(f.root,{recursive:true,force:true}); }
});
test('refuses activation while another campaign owns a live writer', async () => {
  const f = await fixture();
  try {
    const slot=path.join(f.saveRoot,'d8-night-private');await fs.mkdir(slot,{recursive:true});await fs.writeFile(path.join(slot,'writer.lock'),JSON.stringify({pid:process.pid}));
    await assert.rejects(activateBuild(f.root,f.stage,f.saveRoot),/sigue abierta/);
    assert.equal(await fs.readFile(path.join(f.root,'dist','former.txt'),'utf8'),'old');
  } finally { await fs.rm(f.root,{recursive:true,force:true}); }
});

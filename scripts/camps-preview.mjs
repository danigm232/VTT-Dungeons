import {spawn} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const child=spawn(process.execPath,[path.resolve(process.env.CAMPS_PREVIEW_SERVER_BUILD??'dist/camps-final-server','apps/server/index.js')],{
 cwd:root,windowsHide:true,stdio:'inherit',env:{...process.env,HOST:'127.0.0.1',PORT:process.env.CAMPS_PREVIEW_PORT??'4485',
 DM_PASSWORD:'',DUNGEONS_CAMPAIGN:'stormwreck-isle',DUNGEONS_DATA_DIR:path.resolve(process.env.CAMPS_PREVIEW_DATA??'data/camps-final-preview'),
 DUNGEONS_WEB_DIR:path.resolve(process.env.CAMPS_PREVIEW_WEB??'output/camps-final/web')}
});
child.on('exit',code=>process.exit(code??1));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));

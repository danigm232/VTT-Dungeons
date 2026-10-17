import express from 'express';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const app=express(),folder=path.resolve(process.env.CAMPS_REVIEW_OUTPUT??'output/camps-final');
app.post('/__capture',express.raw({type:'image/png',limit:'14mb'}),async(req,res)=>{
 const name=String(req.query.name??'');if(!/^[a-z0-9-]+\.png$/.test(name)||!Buffer.isBuffer(req.body))return res.sendStatus(400);
 await mkdir(folder,{recursive:true});await writeFile(path.join(folder,name),req.body);res.sendStatus(204);
});
app.post('/__report',express.json({limit:'2mb'}),async(req,res)=>{await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'visual-report.json'),JSON.stringify(req.body,null,2));res.sendStatus(204);});
app.use('/art',express.static('campaigns/camp-rests/public/art'));app.use('/art',express.static('campaigns/stormwreck-isle/public/art'));
app.use('/audio',express.static('campaigns/camp-rests/public/audio'));app.use('/audio',express.static('campaigns/stormwreck-isle/public/audio'));app.use('/evidence',express.static(folder));
const frozen=process.env.CAMPS_REVIEW_FROZEN==='1';
const port=Number(process.env.CAMPS_REVIEW_PORT??4482);
const vite=await createServer({configFile:false,server:{middlewareMode:true,host:'127.0.0.1',hmr:{host:'127.0.0.1',port:port+1},watch:frozen?null:{ignored:['**/output/**','**/data/**','**/docs/**']}},appType:'mpa'});app.use(vite.middlewares);
app.listen(port,'127.0.0.1',()=>console.log(`Campamentos: http://127.0.0.1:${port}/scripts/camps-review.html`));

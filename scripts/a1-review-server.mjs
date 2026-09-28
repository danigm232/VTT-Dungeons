import express from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const app=express();
const captures=path.resolve('output/a1-review');
app.post('/__capture',express.raw({type:'image/png',limit:'8mb'}),async(req,res)=>{
  const name=String(req.query.name??'');
  if(!/^a1-v7-(dia|noche)-(general|detail|detalle)-(exterior|celda-[1-6])\.png$/.test(name))return res.sendStatus(400);
  if(!Buffer.isBuffer(req.body)||req.body.length<100)return res.sendStatus(400);
  await mkdir(captures,{recursive:true});
  await writeFile(path.join(captures,name),req.body);
  res.sendStatus(204);
});
app.use('/art',express.static('campaigns/camp-rests/public/art'));
app.use(express.static('output/a1-review/site'));
const port=Number(process.env.A1_REVIEW_PORT??4475);
app.listen(port,'127.0.0.1',()=>console.log(`A1 review: http://127.0.0.1:${port}/scripts/a1-review.html`));

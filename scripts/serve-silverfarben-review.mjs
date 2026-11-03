import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Static art only: deliberately never imports the game, sockets or save store.
// Uses a separate loopback port and cannot occupy the real table's port 3000.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.SILVERFARBEN_REVIEW_PORT??4602);
if(!Number.isInteger(port)||port<1024||port>65535||port===3000)throw new Error('Invalid isolated review port');
const app=express();
app.use('/art',express.static(path.join(root,'campaigns/one-shot/public/art'),{
  etag:false,lastModified:false,maxAge:0,setHeaders(response){response.setHeader('Cache-Control','no-store');}
}));
app.get('/',(_request,response)=>response.redirect('/art/silverfarben-v3/review.html'));
const server=app.listen(port,'127.0.0.1',()=>console.log(`Revisión aislada: http://127.0.0.1:${port}/art/silverfarben-v3/review.html`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});

import {createServer} from 'node:http';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';

// Isolated UI fixture. It never serves local files or real report captures.
// Synthetic embedded diagrams let the comparison control be tested safely.
const swatch=colour=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="${colour}"/><path d="M640 0V720M0 360H1280" stroke="#fff" stroke-width="3"/><circle cx="640" cy="360" r="120" fill="#f0d5a2"/></svg>`);
const page='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba aislada del comparador</title><style>body{background:#14272e;color:#ececdf;font:16px system-ui;max-width:1100px;margin:auto;padding:24px}</style><h1>Control de comparación · imágenes sintéticas</h1>'+visualComparison({before:swatch('#34535e'),after:swatch('#646c40'),title:'Prueba del control: antes / después',width:1280,height:720})+visualComparisonAssets()+'</html>';
const server=createServer((req,res)=>{if(req.url!=='/comparison-test'){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(page);});
server.listen(4664,'127.0.0.1',()=>console.log('Synthetic UI fixture: http://127.0.0.1:4664/comparison-test'));

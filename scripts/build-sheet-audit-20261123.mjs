import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const dir='output/ficha-auditoria-20261123';
const expected=['01-resumen','02-combate','02-combate-desplazado','03-conjuros','04-inventario','05-historia','06-editar','06-editar-desplazado','07-mia-resumen','08-maria-resumen','09-mochila-independiente','10-compacto-resumen','11-compacto-combate','12-compacto-conjuros','13-compacto-inventario','14-compacto-historia','15-compacto-editar'];
const titles=['Resumen · Mike','Combate · Mike','Combate desplazado · Mike','Conjuros · Mike','Inventario · Mike','Historia · Mike','Editar · Mike','Editar desplazado · Mike','Resumen · Mia','Resumen · Maria','Mochila independiente · Mike','Compacto · Resumen','Compacto · Combate','Compacto · Conjuros','Compacto · Inventario','Compacto · Historia','Compacto · Editar'];
const images=expected.map((stem,i)=>{
 const name=stem+'.png', bytes=fs.readFileSync(path.join(dir,name));
 if(bytes.readUInt32BE(0)!==0x89504e47)throw Error('Invalid PNG '+name);
 return {file:name,title:titles[i],width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
fs.writeFileSync(path.join(dir,'capturas.json'),JSON.stringify({fecha:'2026-11-23',proyecto:'Godot Pecio, escena inicial, día despejado',perfil:'aislado de las partidas de la mesa',notas:'Capturas de estado actual para auditoría posterior, sin comparación antes/después.',images},null,2));
const cards=images.map(i=>`<figure><a href="${i.file}"><img src="${i.file}" alt="${i.title}" loading="lazy"></a><figcaption>${i.title} · ${i.width} × ${i.height}</figcaption></figure>`).join('\n');
fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ficha y mochila · capturas para auditoría</title><style>body{background:#111d20;color:#f3e5c8;font:17px/1.5 system-ui;max-width:1550px;margin:auto;padding:24px}h1{font-family:Georgia}a{color:#edc780}figure{margin:0 0 30px;padding:10px;background:#233338;border:1px solid #77633f;border-radius:8px}img{display:block;width:100%;height:auto}figcaption{padding:10px 4px;font-weight:600}</style><h1>Ficha de personaje y mochila</h1><p>Capturas del estado actual en Godot, preparadas el 23/11/2026 para una auditoría posterior. Haz clic en una imagen para verla a tamaño completo.</p><p>Mike protagoniza las pestañas; se incluyen Mia y Maria, la mochila independiente y la presentación compacta. Perfil de prueba aislado, escena inicial del Pecio, mediodía y despejado. El contenido y las existencias son los de ese perfil.</p>${cards}<p><a href="capturas.json">Datos y hashes de las capturas</a></p></html>`);
console.log('Galería creada: '+images.length+' capturas.');

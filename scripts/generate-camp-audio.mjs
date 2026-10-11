import fs from 'node:fs';
import path from 'node:path';

// Original, deterministic ambience; no downloaded samples or runtime network.
const out=path.resolve('campaigns/camp-rests/public/audio/camp-final-v1');
fs.mkdirSync(out,{recursive:true});
const rate=22050,seconds=32;
let seed=73491;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
function write(name,sample){
  const n=rate*seconds,data=Buffer.alloc(n*2),h=Buffer.alloc(44);
  for(let i=0;i<n;i++){const fade=Math.min(1,i/(rate*.15),(n-1-i)/(rate*.15));data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample(i/rate)*fade))*32767),i*2);}
  h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);
  fs.writeFileSync(path.join(out,name),Buffer.concat([h,data]));
}
const drops=[.9,3.8,6.2,7.1,10.6,14.2,14.8,19.6,24.2,27.4,30.6];
let damp=0;
write('sheltered-drips.wav',t=>{damp=damp*.99+noise()*.01;let v=damp*.07;for(const at of drops){const d=t-at;if(d>=0&&d<.5)v+=Math.sin(2*Math.PI*(850*d+210*Math.exp(-d*12)))*Math.exp(-d*15)*.23;}return v;});
let rumble=0;
write('distant-thunder.wav',t=>{rumble=rumble*.991+noise()*.009;const e=Math.exp(-(((t-7)/2.2)**2))+Math.exp(-(((t-23)/3)**2));return rumble*e*1.8+Math.sin(t*2*Math.PI*42)*e*.025;});
console.log('Ambientes originales de campamento preparados.');

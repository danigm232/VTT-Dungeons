import fs from 'node:fs';
import path from 'node:path';

const rate=22050,out=path.resolve('campaigns/stormwreck-isle/public/audio');fs.mkdirSync(out,{recursive:true});
let seed=0x51a7c0de;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
function wav(name,seconds,sample){const n=Math.floor(rate*seconds),data=Buffer.alloc(n*2),fade=Math.min(rate*.08,n/4);for(let i=0;i<n;i++){let v=sample(i/rate,i,n);const e=Math.min(1,i/fade,(n-1-i)/fade);v=Math.max(-1,Math.min(1,v*e));data.writeInt16LE(Math.round(v*32767),i*2);}const h=Buffer.alloc(44);h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);fs.writeFileSync(path.join(out,name),Buffer.concat([h,data]));}
const noise=()=>rand()*2-1;
wav('music-tempest.wav',64,(t)=>{const scale=[110,130.81,146.83,164.81,196,220,261.63,246.94],step=Math.floor(t/4)%scale.length,f=scale[step],pulse=Math.sin(2*Math.PI*f*t)*.07+Math.sin(2*Math.PI*f*.5*t)*.11;const drone=Math.sin(2*Math.PI*55*t)*.14+Math.sin(2*Math.PI*82.41*t)*.07;const bell=Math.exp(-((t%8)*1.3))*Math.sin(2*Math.PI*(392+(step%3)*49)*t)*.1;return (pulse+drone+bell)*(.72+.18*Math.sin(2*Math.PI*t/16));});
let oceanSmooth=0;wav('ambient-ocean.wav',16,(t)=>{oceanSmooth=oceanSmooth*.985+noise()*.015;const swell=Math.pow((Math.sin(2*Math.PI*t/5.33)+1)/2,3);return oceanSmooth*.58+swell*.13-.05;});
let windSmooth=0,windSlow=0;wav('ambient-wind.wav',16,()=>{windSmooth=windSmooth*.94+noise()*.06;windSlow=windSlow*.997+noise()*.003;return windSmooth*(.08+Math.abs(windSlow)*.38);});
wav('ambient-wood.wav',12,(t)=>{const phase=t%3.0,creak=phase<1.2?Math.sin(2*Math.PI*(70+phase*35)*t)*Math.sin(Math.PI*phase/1.2)*.18:0;return creak+noise()*.012;});
let stormSmooth=0;wav('ambient-storm.wav',18,(t)=>{stormSmooth=stormSmooth*.97+noise()*.03;const distant=Math.exp(-Math.pow((t%9)-1.2,2)*1.3)*noise()*.22;return stormSmooth*.18+distant;});
wav('sfx-thunder.wav',4,(t)=>{const crack=t<.18?noise()*(1-t/.18)*.85:0;const roll=t>.12?noise()*Math.exp(-(t-.12)*.8)*(.2+.2*Math.sin(t*31)):0;return crack+roll;});
wav('sfx-creak.wav',2.4,(t)=>Math.sin(2*Math.PI*(82+t*105)*t)*Math.sin(Math.PI*Math.min(1,t/1.8))*.32+noise()*.025);
wav('sfx-impact.wav',1.5,(t)=>noise()*Math.exp(-t*7)*.7+Math.sin(2*Math.PI*72*t)*Math.exp(-t*5)*.35);
console.log(`Audio original generado en ${out}`);

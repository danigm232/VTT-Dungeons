import {mkdir,writeFile} from 'node:fs/promises';
// Original synthesis, adapted from the project's sheltered-drips generator.
// No external samples. Run only for this versioned Mirror audio directory.
const dir='campaigns/one-shot/public/audio/d8-night/mirror-cave-v1',rate=22050;
await mkdir(dir,{recursive:true});let seed=491953;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
const stats=[];
async function wav(name,seconds,sample,peak=.48,loop=false){
 let count=Math.round(seconds*rate);const v=Float64Array.from({length:count},(_,i)=>sample(i/rate,i));
 if(loop){const seam=Math.round(rate*1.5);for(let i=0;i<seam;i++){const t=i/seam;v[i]=v[i]*t+v[count-seam+i]*(1-t);}count-=seam;}
 const max=Math.max(...Array.from({length:Math.ceil(count/10000)},(_,i)=>Math.max(...v.slice(i*10000,(i+1)*10000).map(Math.abs)))),scale=peak/Math.max(.00001,max),data=Buffer.alloc(count*2);let energy=0;
 for(let i=0;i<count;i++){const fade=loop?1:Math.min(1,i/(rate*.012),(count-1-i)/(rate*.08)),value=v[i]*scale*fade;data.writeInt16LE(Math.round(value*32767),i*2);energy+=value*value;}
 const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);
 await writeFile(`${dir}/${name}.wav`,Buffer.concat([h,data]));stats.push({name,seconds:count/rate,peak,rms:Math.sqrt(energy/count),sampleRate:rate,loop});
}
let low=0,slow=0;
await wav('chamber-air',36,(t)=>{const n=noise();low=low*.965+n*.035;slow=slow*.998+n*.002;return (low-slow)*(.7+.14*Math.sin(t*Math.PI*2/18)+.06*Math.cos(t*Math.PI*2/12));},.42,true);
for(const [name,pitch] of [['cave-drop-a',1],['cave-drop-b',.86]]){
 const drop=t=>t<0?0:Math.sin(2*Math.PI*(920*pitch*t-22*Math.exp(-t*28)))*Math.exp(-t*18)*.68+Math.sin(2*Math.PI*438*pitch*t)*Math.exp(-t*11)*.12;
 await wav(name,2.8,t=>{const a=t-.12;return drop(a)+drop(a-.17)*.21+drop(a-.36)*.10+drop(a-.61)*.045+drop(a-.95)*.018;},.55);
}
let strain=0;
await wav('ice-settle',3.6,(t)=>{strain=strain*.93+noise()*.07;const e=Math.sin(Math.min(1,t/2.7)*Math.PI)**2;return e*(strain*.25+Math.sin(2*Math.PI*(93*t+t*t*8))*Math.sin(t*23)*.028)+Math.sin(2*Math.PI*1900*t)*Math.exp(-(((t-.75)/.035)**2))*.018;},.46);
await writeFile(`${dir}/analysis.json`,JSON.stringify({original:true,stats},null,2));
console.log(JSON.stringify(stats));

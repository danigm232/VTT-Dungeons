// One-time source migration, deliberately idempotent.
import {readFile,writeFile} from 'node:fs/promises';
const folder='prototypes/godot-shared/characters/';
let source=await readFile(folder+'body_effects.gdshader','utf8');
if(!source.includes('uniform vec4 weights_a')){
 source=source.replace('uniform float intensity=0.8;','uniform float intensity=0.8;\nuniform vec4 weights_a=vec4(1.0);\nuniform vec4 weights_b=vec4(1.0);\nuniform float fear_weight=1.0;');
 const lines=source.split('\n');let stone='';
 for(let i=0;i<lines.length;i++){
  const match=lines[i].match(/if\(\(effect_bits&(\d+)\)!=0\)/);if(!match)continue;
  const bit=Number(match[1]),weight={1:'weights_a.x',2:'weights_a.y',4:'weights_a.z',8:'weights_a.w',16:'weights_b.x',32:'weights_b.y',64:'weights_b.z',128:'weights_b.w',256:'fear_weight'}[bit];
  if(bit===2){stone=' if((effect_bits&2)!=0){float cracks=1.0-smoothstep(.018,.055,abs(noise(q*17.0)-.5));float grey=dot(original.rgb,vec3(.3,.59,.11));float k=a*.97+rim*.5; vec3 mineral=mix(vec3(.45,.48,.47)*(grey+.4)*(.84+grain*.22),vec3(.11,.14,.15),cracks*.7);color=mix(color,mineral*k,weights_a.y);coverage=mix(coverage,k,weights_a.y);}';lines[i]='';continue;}
  // Weight the entire contribution, including its alpha-masked rim.
  lines[i]=lines[i].replace('{','{vec3 previous_color=color;float previous_coverage=coverage;').replace(/}\s*$/,'color=mix(previous_color,color,'+weight+');coverage=mix(previous_coverage,coverage,'+weight+');}');
 }
 source=lines.join('\n').replace(' coverage=clamp',stone+'\n coverage=clamp');
 await writeFile(folder+'body_effects.gdshader',source);
}
let gear=await readFile(folder+'gear_effects.gdshader','utf8');
if(!gear.includes('weights_a')){
 gear=gear.replace('uniform float amount=.8;','uniform float amount=.8;\nuniform vec4 weights_a=vec4(1.0);\nuniform vec4 weights_b=vec4(1.0);');
 gear=gear.replace('veins*.7*amount','veins*.7*amount*weights_a.x').replace('amount*.9','amount*.9*weights_a.y').replace('(veins*.8+grain*.15)*amount','(veins*.8+grain*.15)*amount*weights_a.z').replace('grain*amount*.7','grain*amount*.7*weights_a.w').replace('veins*amount);','veins*amount*weights_b.x);');
 await writeFile(folder+'gear_effects.gdshader',gear);
}

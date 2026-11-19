import {mkdir,writeFile} from 'node:fs/promises';
const folder='prototypes/godot-shared/sprites';
const colors={agarrada:'#c7b28c',restringida:'#c4a77a',asustada:'#a5b3cf',aturdida:'#dac79c',cegada:'#9dacc5',derribada:'#b0a18b',ensordecida:'#9cbfc6',hechizada:'#d8a5bf',incapacitada:'#b4b9ce',inconsciente:'#acc4cf',invisible:'#add3d5',paralizada:'#aebce1',petrificada:'#b3bdbd',envenenada:'#a0bd81',agotamiento:'#c2ab89',oculta:'#93aaa2'};
const anchors={agarrada:'torso',restringida:'torso',asustada:'head',aturdida:'head',cegada:'head',derribada:'ground',ensordecida:'head',hechizada:'head',incapacitada:'torso',inconsciente:'torso',invisible:'none',paralizada:'torso',petrificada:'torso',envenenada:'torso',agotamiento:'torso',oculta:'ground'};
const descriptions={agarrada:'Tensión y nudos en los antebrazos',restringida:'Ligaduras cruzadas sobre el torso',asustada:'Briznas frías junto a la cabeza',aturdida:'Órbita fragmentada y motas de desequilibrio',cegada:'Velo fino a la altura de los ojos',derribada:'Polvo y contacto junto al suelo',ensordecida:'Ondas amortiguadas junto a los oídos',hechizada:'Filamentos rosados y motas junto a las sienes',incapacitada:'Filamentos descendentes apagados',inconsciente:'Respiración tenue sobre el cuerpo tumbado',invisible:'Transparencia del propio cuerpo',paralizada:'Tensión cristalina en hombros y extremidades',petrificada:'Fisuras minerales y cuerpo desaturado',envenenada:'Vaho verdoso y gotas ascendentes',agotamiento:'Polvo descendente junto al cuerpo',oculta:'Sombra discreta en el apoyo'};
const art={};
function svg(key,phase,style){
 const color=colors[key],p=phase/8*Math.PI*2,d=Math.sin(p),drift=(phase/8);
 const paths=[];
 const line=(path,alpha=.65,width=2)=>{
  if(style==='mist')paths.push(`<path d="${path}" opacity="${alpha*.09}" stroke-width="${width+27}"/><path d="${path}" opacity="${alpha*.16}" stroke-width="${width+13}"/><path d="${path}" opacity="${alpha*.46}" stroke-width="${width+3.5}"/>`);
  else if(style==='runes')paths.push(`<path d="${path}" opacity="${alpha*.12}" stroke-width="${width+9}"/><path d="${path}" opacity="${alpha*.85}" stroke-width="${width+1}" stroke-dasharray="19 3 4 3"/><path d="${path}" opacity="${alpha*.32}" stroke-width=".8" stroke="white"/>`);
  else paths.push(`<path d="${path}" opacity="${alpha*.20}" stroke-width="${width+8}" transform="translate(-2 1)"/><path d="${path}" opacity="${alpha*.55}" stroke-width="${width+2}" stroke-dasharray="30 2 8 2 17 1"/><path d="${path}" opacity="${alpha*.35}" stroke-width="1.2" transform="translate(2 -2)" stroke-dasharray="7 4 19 5"/>`);
 };
 const dot=(x,y,r=1.7,a=.65)=>{
  if(style==='mist')paths.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r*6}" opacity="${a*.7}" fill="url(#haze)" stroke="none"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r*.8}" opacity="${a*.6}" fill="${color}" stroke="none"/>`);
  else if(style==='runes')paths.push(`<path d="M${x-r*1.8} ${y}l${r*1.8}-${r*2.5} ${r*1.8} ${r*2.5}-${r*1.8} ${r*2.5}z" opacity="${a*.8}" stroke-width="1.1"/>`);
  else paths.push(`<path d="m${x-r*2} ${y+r} ${r*3}-${r*2.5}m-${r*2} ${r*3} ${r*3}-${r*1.5}" opacity="${a*.8}" stroke-width="1.7"/>`);
 };
 if(key==='agarrada'){
  line('M34 101c-14-14-32 10-15 22s31-13 15-22m188 0c14-14 32 10 15 22s-31-13-15-22',.7,2.3);
  line('M20 120 3 140m233-20 17 20',.35,1.8);line('M38 116q8 9 14 8m166-8q-8 9-14 8',.55,1.5);
 }else if(key==='restringida'){
  line('M37 62q91 45 182 2M39 69q89 45 179 2',.6,2);
  line('M41 142q87 43 176 2M39 149q89 43 180 2',.66,2);
  line('m54 85 137 108m8-110L62 193',.35,1.4);
  line('m119 149 9-6 9 6-9 7z',.75,1.7);
 }else if(key==='paralizada'){
  for(const x of [49,207])line(`M${x} 31l-4 36 7 8-5 43 5 9-4 54`,.52+.06*d,1.8);
  line('M45 67h12m142 0h12M44 118h12m143 0h12',.65,1.2);
  for(let i=0;i<4;i++)dot(i%2?207:49,54+i*36,1.8,.45+.15*Math.sin(p+i));
 }else if(key==='petrificada'){
  line('m112 18-9 32 16 17-11 25 19 22-10 34 14 24-5 43',.48,1.2);
  line('m108 92-25 8-9 30m53-16 25-9 14 18m-47 25 26 7 8 20',.38,1.1);
  dot(100,48,1,.5);dot(147,178,1,.45);
 }else if(key==='envenenada'){
  for(const side of [-1,1]){
   const x=128+side*85;
   line(`M${x} 222C${x+side*28} 174 ${x-side*15} 133 ${x+side*7} ${83+3*d}`, .28,7);
   line(`M${x} 222C${x+side*28} 174 ${x-side*15} 133 ${x+side*7} ${83+3*d}`, .4,1.4);
   for(let i=0;i<3;i++)dot(x+Math.sin(p+i*2)*7,201-((i*49+drift*26)%144),1.2+i*.4,.52);
  }
 }else if(key==='hechizada'){
  line(`M29 ${113+d*2}C45 51 78 35 97 46M159 46c23-11 55 13 67 ${67-d*2}`,.43,1.6);
  line('M39 103q17-36 38-40m102 0q24 12 38 40',.25,3);
  for(let i=0;i<6;i++){const a=i*Math.PI/3+p*.3;dot(128+Math.cos(a)*93,114+Math.sin(a)*67,1.6,.6);}
 }else if(key==='aturdida'){
  line('M29 106c2-39 184-43 198-5m-164 19c41 13 97 13 131 0',.43,1.7);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3+p;dot(128+Math.cos(a)*97,98+Math.sin(a)*21,2.5,.7);}
 }else if(key==='cegada'){
  line('M39 126q89-14 178 0',.20,12);line('M38 122q90-14 180 0M40 131q88-13 176 0',.58,1.5);
  line('M48 115v21m160-21v21',.3,1.4);
 }else if(key==='ensordecida'){
  line('M48 78q-29 43-1 86M30 90q-17 31 0 62m178-74q29 43 1 86m17-74q17 31 0 62',.48,1.8);
  line('m31 144 29-40m136 0 29 40',.45,1.3);
 }else if(key==='asustada'){
  line(`M48 180q-36-53-11-105m-12 89q-19-34-7-58M208 180q36-53 11-105m12 89q19-34 7-58`,.32,2.2);
  for(let i=0;i<4;i++)dot(i%2?226:30,88+i*24+d*3,1.2,.4);
 }else if(key==='inconsciente'){
  line(`M69 ${137+d*3}q44-30 94-2m-71 19q35-16 56-5`,.28,2);
  dot(181,113-d*4,1.5,.28);
 }else if(key==='derribada'){
  line('M18 151q23 13 44 8m132 0q24 5 44-9',.35,1.4);
  for(let i=0;i<8;i++)dot(21+i*30,139+Math.sin(i*2+p)*8,.9+(i%3)*.4,.32);
 }else if(key==='incapacitada'||key==='agotamiento'){
  for(let i=0;i<4;i++){const x=44+i*56,y=43+((i*35+drift*19)%106);line(`M${x} ${y}q-7 19 1 34`,.25,1.5);dot(x,y+44,1.5,.35);}
 }else if(key==='oculta'){
  line('M31 152q43 23 78 16m37 0q45 3 78-20',.27,3);
 }
 if(key!=='invisible'){
  if(style==='mist')for(let i=0;i<5;i++){
   const x=32+(i*47)%195+Math.sin(p+i)*5,y=85+(i*29)%113-d*3;
   paths.unshift(`<ellipse cx="${x}" cy="${y}" rx="${18+i%3*5}" ry="${23+i%2*9}" fill="url(#haze)" stroke="none" opacity=".25"/>`);
  }
  if(style==='runes'&&key!=='derribada'&&key!=='oculta'){
   paths.unshift(`<ellipse cx="128" cy="128" rx="103" ry="${anchors[key]==='head'?48:101}" opacity=".17" stroke-width="1.3" stroke-dasharray="24 55 9 27"/>`);
   for(let i=0;i<4;i++){const a=i*Math.PI/2+p*.05,x=128+Math.cos(a)*103,y=128+Math.sin(a)*(anchors[key]==='head'?48:101);paths.push(`<path d="m${x-4} ${y-4} 4-5 4 5-4 5z" opacity=".35" stroke-width="1.1"/>`);}
  }
  if(style==='brush')for(let i=0;i<6;i++){
   const x=24+i*39,y=66+(i*47)%133;
   paths.unshift(`<path d="m${x} ${y} 9-6-3 9 7-3-9 14" stroke-width="${2+i%3}" opacity=".15"/>`);
  }
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><radialGradient id="haze"><stop stop-color="${color}" stop-opacity=".55"/><stop offset=".45" stop-color="${color}" stop-opacity=".18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</g></svg>`;
}
for(const key of Object.keys(colors))art[key]={anchor:anchors[key],color:colors[key],description:descriptions[key],variants:Object.fromEntries(['mist','runes','brush'].map(style=>[style,Array.from({length:8},(_,i)=>svg(key,i,style))]))};
const rigs={
 humanoid:{label:'Humanoide',head_y:.86,head_width:.42,torso_y:.51,torso_width:.57,torso_height:.60},
 silverfarben:{label:'Silverfarben · complexión esbelta',head_y:.86,head_width:.40,torso_y:.51,torso_width:.55,torso_height:.60},
 rogue:{label:'Trinity · mediana',head_y:.82,head_width:.48,torso_y:.49,torso_width:.65,torso_height:.57},
 cleric:{label:'Mía · enana',head_y:.80,head_width:.51,torso_y:.48,torso_width:.78,torso_height:.58},
 wizard:{label:'Mike · alto elfo',head_y:.86,head_width:.40,torso_y:.51,torso_width:.57,torso_height:.60},
 anteros:{label:'Anteros · capa',head_y:.86,head_width:.42,torso_y:.51,torso_width:.59,torso_height:.60},
 zombie:{label:'Marinero · cuerpo encorvado',head_y:.82,head_width:.43,torso_y:.48,torso_width:.58,torso_height:.59},
 harpy:{label:'Arpía · torso separado de las alas',head_y:.79,head_width:.38,torso_y:.47,torso_width:.46,torso_height:.53},
 quadruped:{label:'Cuadrúpedo · perfil configurable, pendiente de muestra propia',head_y:.62,head_width:.36,torso_y:.40,torso_width:.84,torso_height:.43}
};
await mkdir(folder,{recursive:true});
const styles={mist:{label:'Bruma y partículas',description:'Vaho localizado, transparencias suaves y motas; sin círculo permanente.'},runes:{label:'Runas y energía',description:'Filamentos luminosos, sellos fragmentados y pequeños signos; sin tapar la silueta.'},brush:{label:'Pincelada ilustrada',description:'Trazos secos, textura de pincel y pequeños destellos; acabado dibujado.'}};
const assignments={humanoid:{style:'brush'},silverfarben:{style:'runes',conditions:{agarrada:'brush',restringida:'brush',envenenada:'mist'}},rogue:{style:'brush',conditions:{envenenada:'mist',hechizada:'runes'}},cleric:{style:'runes',conditions:{envenenada:'mist',derribada:'brush'}},wizard:{style:'runes',conditions:{envenenada:'mist'}},anteros:{style:'runes',conditions:{agarrada:'brush',restringida:'brush'}},zombie:{style:'mist',conditions:{agarrada:'brush',restringida:'brush',petrificada:'brush'}},harpy:{style:'brush',conditions:{hechizada:'runes',paralizada:'runes',envenenada:'mist'}}};
await writeFile(folder+'/condition-art.json',JSON.stringify({version:3,frames:8,frameMs:160,provenance:'Original vector paths authored in scripts/build-condition-overlay-art.mjs; existing character art unchanged; REF-01/REF-03 for quiet tactical readability, no commercial assets',aliases:{apresada:'restringida'},styles,assignments,rigs,art},null,2)+'\n');
console.log('Condition art: 3 distinct treatments, 16 states, 8 phases; actor-specific rigs and selectable assignments.');

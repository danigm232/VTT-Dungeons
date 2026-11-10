import {createRequire} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const sharp=createRequire(import.meta.url)(process.env.DUNGEONS_SHARP_MODULE??'sharp');
const root=resolve(import.meta.dirname,'..');
if(!process.argv[2])throw new Error('Uso: node scripts/prepare-skill-animation-art.mjs <directorio de PNG originales>');
const base=resolve(process.argv[2]);
const items=JSON.parse(await readFile(resolve(root,process.argv[3]??'docs/design/SKILL_ANIMATION_V3_SOURCES_20261107.json'),'utf8'));
const version=process.argv[4]??'v3';
const metadata={};
for(const [id,spec] of Object.entries(items)) {
 const source=resolve(base,'exec-'+spec.file+'.png');
 const size=await sharp(source).metadata();
 const cols=spec.cols??6,rows=spec.rows??6;
 const width=Math.floor(size.width/cols)*cols,height=Math.floor(size.height/rows)*rows;
 const pipeline=sharp(source).resize(width,height,{fit:'fill'});
 const {data,info}=await pipeline.clone().ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cw=width/cols,ch=height/rows,frames=[];
 const labels=new Int32Array(width*height),queue=new Int32Array(labels.length),components=[];
 for(let pixel=0;pixel<labels.length;pixel++) {
  if(labels[pixel]||data[pixel*4+3]<32)continue;
  const label=components.length+1;let head=0,tail=1,left=width,right=0,top=height,bottom=0;
  queue[0]=pixel;labels[pixel]=label;
  while(head<tail) {
   const j=queue[head++],x=j%width,y=Math.floor(j/width);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
   for(const k of [x>0?j-1:-1,x+1<width?j+1:-1,y>0?j-width:-1,y+1<height?j+width:-1])if(k>=0&&!labels[k]&&data[k*4+3]>=32){labels[k]=label;queue[tail++]=k;}
  }
  components.push({label,area:tail,left,right,top,bottom,seed:[pixel%width,Math.floor(pixel/width)]});
 }
 const selected=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
  const prints=spec.disconnected??(id==='environment'&&row===1&&col>=2);
  const candidates=components.filter(c=>c.area>(prints?20:1500)&&Math.floor((c.left+c.right)/2/cw)===col&&Math.floor((c.top+c.bottom)/2/ch)===row).sort((a,b)=>b.area-a.area);
  const paired=spec.paired??(id==='handshake'||id==='medicine-pair');
  const keep=prints?candidates:candidates.slice(0,paired?2:1);
  if(!keep.length)throw new Error(`Missing pose ${id} ${row} ${col}`);
  selected.push(new Set(keep.map(c=>c.label)));
  const left=Math.min(...keep.map(c=>c.left)),right=Math.max(...keep.map(c=>c.right)),top=Math.min(...keep.map(c=>c.top)),bottom=Math.max(...keep.map(c=>c.bottom));
  let footLeft=width,footRight=0;
  for(let y=Math.max(top,bottom-Math.max(6,Math.round((bottom-top)*.13)));y<bottom;y++)for(let x=left;x<(paired?Math.min(right,col*cw+cw*.46):right);x++) {
   if(!selected.at(-1).has(labels[y*width+x]))continue;
   footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x+1);
  }
  frames.push({bounds:[left,top,right-left,bottom-top],pivot:((footLeft+footRight)/2-col*cw)/cw,alphaSeeds:keep.map(c=>[c.seed[0]-left,c.seed[1]-top])});
 }
 const refRow=spec.refRow??0;
 const hs=frames.slice(refRow*cols,(refRow+1)*cols).map(f=>f.bounds[3]).sort((a,b)=>a-b);
 const heroHeights=[];
 if(spec.paired||id==='handshake'||id==='medicine-pair')for(let row=0;row<rows;row++) {
  let reference=0;
  for(let col=0;col<(spec.heroReference==='max'?cols:1);col++){
   let top=ch,bottom=0;
   for(let y=0;y<ch;y++)for(let x=0;x<cw*.46;x++) {
    if(!selected[row*cols+col].has(labels[(row*ch+y)*width+col*cw+x]))continue;
    top=Math.min(top,y);bottom=Math.max(bottom,y+1);
   }reference=Math.max(reference,bottom-top);
  }heroHeights.push(reference);
 }
 if(spec.pairedRowGroups)for(let row=0;row<rows;row+=spec.pairedRowGroups){const height=Math.max(...heroHeights.slice(row,row+spec.pairedRowGroups));for(let i=0;i<spec.pairedRowGroups;i++)heroHeights[row+i]=height;}
 if(id==='animal-reach')for(let row=0;row<rows;row++)heroHeights.push(frames[row*cols].bounds[3]);
 const rowHeights=Array.from({length:rows},(_,row)=>frames[row*cols].bounds[3]);
 metadata[id]={width,height,cellWidth:cw,cellHeight:ch,columns:cols,rows,referenceHeight:hs[Math.floor(hs.length/2)],frames,original:source,...(heroHeights.length?{heroHeights}:{}),...(version!=='v3'?{rowHeights}:{})};
 await pipeline.webp({quality:version==='v3'?94:91,alphaQuality:100}).toFile(resolve(root,'apps/web/ui/art/skill-'+id+'-'+version+'.webp'));
}
await writeFile(resolve(root,'apps/web/ui/art/skill-animation-'+version+'.json'),JSON.stringify(metadata,null,2));
console.log(Object.keys(metadata).join(', '));

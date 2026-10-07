/** Keep only alpha-connected silhouettes belonging to this pose. A rectangular
 * atlas crop alone includes nearby boots/hair when authored rows overlap. */
export function isolateAtlasRGBA(pixels: Uint8ClampedArray, width: number, height: number, seeds: readonly (readonly [number,number])[]) {
  const kept=new Uint8Array(width*height), queue=new Int32Array(width*height);let head=0,tail=0;
  const add=(x:number,y:number)=>{if(x<0||y<0||x>=width||y>=height)return;const i=y*width+x;if(kept[i]||pixels[i*4+3]!<32)return;kept[i]=1;queue[tail++]=i;};
  for(const [x,y] of seeds)add(x,y);
  while(head<tail){const i=queue[head++]!,x=i%width,y=Math.floor(i/width);add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
  // Preserve the antialiased edge, but not an unrelated disconnected fragment.
  const result=new Uint8ClampedArray(pixels);
  for(let i=0;i<kept.length;i++)if(!kept[i]){const x=i%width,y=Math.floor(i/width);if(!((x>0&&kept[i-1])||(x+1<width&&kept[i+1])||(y>0&&kept[i-width])||(y+1<height&&kept[i+width])))result[i*4+3]=0;}
  return result;
}

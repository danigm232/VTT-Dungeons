import type {BillboardFrame} from './world-billboards';
export type IceSample={strength:number;height:number};
/** A short, frosted planar reflection. Surface sampling clips every strip to
 * ice (including a puddle beside the feet); snow never reflects the actor. */
export function iceReflectionGeometry(frame:BillboardFrame,ground:{x:number;y:number;z:number},right:{x:number;z:number},toward:{x:number;z:number},tilt:number,sample:(p:{x:number;y:number;z:number})=>IceSample,uv:number[]){
 const positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[],normals:number[]=[];
 const length=Math.min(2.2,frame.worldHeight/Math.max(.7,Math.tan(tilt)))* (frame.grounded?.4:1);
 for(let row=0;row<=12;row++)for(let side=0;side<=2;side++){
  const t=row/12,u=side/2,across=frame.offsetX+(u-frame.anchorX)*frame.worldWidth;
  const x=ground.x+(frame.worldOffset?.x??0)+right.x*across+toward.x*t*length,z=ground.z+(frame.worldOffset?.z??0)+right.z*across+toward.z*t*length;
  const ice=sample({x,y:ground.y,z});
  positions.push(x,ice.height+.006,z);normals.push(0,1,0);
  uvs.push(uv[0]!+(uv[2]!-uv[0]!)*u,uv[1]!+(uv[5]!-uv[1]!)*t);
  const alpha=Math.max(0,Math.min(.30,ice.strength))*Math.pow(1-t,.65)*(side===1?1:.78);
  colors.push(.66,.82,1,alpha);
  if(row<12&&side<2){const k=row*3+side;indices.push(k,k+3,k+1,k+1,k+3,k+4);}
 }
 return {positions,uvs,colors,indices,normals};
}

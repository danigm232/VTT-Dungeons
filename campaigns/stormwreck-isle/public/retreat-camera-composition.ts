/** Shared scene dimensions. The existing camera controller owns angles,
 * manual zoom, combat framing and restoration; this module never moves it. */
export type RetreatViewSize={width:number;depth:number;height:number};
export const RETREAT_ZONE_VIEWS:Record<string,{target:[number,number,number];orthoHalf:number;size:RetreatViewSize}>={
 overview:{target:[91,13,80],orthoHalf:42,size:{width:160,depth:76,height:33}},
 caves:{target:[111,20,61],orthoHalf:22,size:{width:40,depth:20,height:10}},
 beach:{target:[24,.3,111],orthoHalf:17,size:{width:35,depth:26,height:15}},
 a1:{target:[108,10,93],orthoHalf:43,size:{width:32,depth:23,height:12}},
 a2:{target:[160,15,68],orthoHalf:8,size:{width:15,depth:15,height:18}},
 a3:{target:[121,18,60],orthoHalf:8,size:{width:15,depth:14,height:5}},
 a4:{target:[102,18,60],orthoHalf:8,size:{width:17,depth:12,height:5}},
 a5:{target:[42,27,67],orthoHalf:8,size:{width:19,depth:15,height:7}}
};
export function retreatViewSize(surfaceId:string|undefined,overview=false):RetreatViewSize{
 return {...(RETREAT_ZONE_VIEWS[overview?'overview':surfaceId??'beach']??RETREAT_ZONE_VIEWS.beach)!.size};
}

/** Convert the audited full-screen 16 m / 30 m envelope into the camera's
 * safe-area half-height. HUD space must not expose extra world at the edges. */
export function retreatPlayerCameraHalfHeight(width:number,height:number,safeHeight:number){
 const safe=Math.max(1,Math.min(height,safeHeight));
 return Math.min(8*safe/Math.max(1,height),15*safe/Math.max(1,width));
}

/** At a broad A2 zoom, include the load below the house using the same camera.
 * Close inspection stays on the actor. No changes to angle, zoom or C2 limits.
 * Billboards use camera-up metres, so their head margin is projected directly. */
export function retreatWinchContextY(baseY:number,floorY:number,actorHeight:number,anchorY:number,halfHeight:number,beta:number,palletY:number,forwardOffset:number){
 if(![baseY,floorY,actorHeight,anchorY,halfHeight,beta,palletY,forwardOffset].every(Number.isFinite)||halfHeight<=4.2)return baseY;
 const vertical=Math.max(.1,Math.sin(beta)),head=floorY*vertical+Math.max(.3,actorHeight)*Math.max(.5,Math.min(1,anchorY)),load=palletY*vertical-forwardOffset*Math.cos(beta);
 const desired=Math.min(baseY,(head+load)/(2*vertical)),u=Math.max(0,Math.min(1,(halfHeight-4.2)/3.3)),blend=u*u*(3-2*u);
 const candidate=baseY+(desired-baseY)*blend,minForHead=(head+.04-halfHeight*.995)/vertical;
 return Math.min(baseY,Math.max(candidate,minForHead));
}

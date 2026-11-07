import type {Motion} from '../../../engine/client/skill-micro-scene';

/** The vignette's key light is above-left. Contact and cast shadows share it. */
export function drawSkillGroundShadow(ctx:CanvasRenderingContext2D,x:number,y:number,width:number,depth=5,elevation=0,opacity=1) {
  const fade=Math.max(.08,1-elevation/180)*opacity;
  if(fade<=0||width<=0)return;
  ctx.save();ctx.translate(x,y);ctx.globalAlpha*=fade;
  const length=width*.5+Math.max(0,elevation)*.12;
  const cast=ctx.createLinearGradient(-width*.2,0,length,depth*2);
  cast.addColorStop(0,'#07121565');cast.addColorStop(1,'#07121500');
  ctx.fillStyle=cast;ctx.beginPath();ctx.moveTo(-width*.4,-1);ctx.lineTo(width*.3,-1);
  ctx.quadraticCurveTo(width*.5+length,depth*2,width*.2+length,depth*2.4);ctx.lineTo(-width*.25,depth);ctx.closePath();ctx.fill();
  const contact=ctx.createRadialGradient(0,0,0,0,0,width*.55);
  contact.addColorStop(0,'#051014b5');contact.addColorStop(.5,'#07141775');contact.addColorStop(1,'#07141700');
  ctx.scale(1,depth/(width*.55));ctx.fillStyle=contact;ctx.beginPath();ctx.arc(0,0,width*.55,0,Math.PI*2);ctx.fill();ctx.restore();
}

export const skillPropFootprints:Readonly<Record<string,{width:number;depth?:number;floating?:boolean}>>={
  guard:{width:35},'sleepy-guard':{width:35},merchant:{width:38},bandit:{width:34},traveler:{width:34},patient:{width:40},audience:{width:125,depth:7},
  table:{width:90,depth:8},mechanism:{width:88,depth:7},heraldry:{width:60,depth:6},altar:{width:86,depth:7},
  'plant-broad':{width:42},'plant-narrow':{width:32},bush:{width:82,depth:7},pebble:{width:17,depth:2},sign:{width:26},horse:{width:133,depth:9},
  crystal:{width:38,depth:5,floating:true},owl:{width:16,floating:true},'coin-roll':{width:7,depth:1.5,floating:true},
  goblin:{width:25},kobold:{width:22},mouse:{width:19,depth:2},'perception-guest':{width:30}
};

export function drawSkillPropShadow(ctx:CanvasRenderingContext2D,art:string,x:number,y:number,pose:Motion) {
  const footprint=skillPropFootprints[art];if(!footprint||(pose.opacity??1)<=0)return;
  const scale=pose.scale??1;
  const groundY=202,elevation=footprint.floating?Math.max(0,groundY-y-(pose.y??0)):0;
  drawSkillGroundShadow(ctx,x+(pose.x??0),groundY,footprint.width*scale,footprint.depth??4,elevation,pose.opacity??1);
}

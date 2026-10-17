import type { PublicCampaignDefinition } from '../../../engine/shared/campaign.js';

const root='/art/tokens/cafe-v50/';
// Alpha-verified row bounds, rather than assumed uniform image-generator cells.
// This prevents the neighboring orientation leaking into drinking frames.
const horseRows=[[9,185],[204,172],[381,151],[542,179],[720,187],[913,164],[1099,151],[1262,205]] as const;
const directions=['n','ne','e','se','s','sw','w','nw'] as const;
export function installCafeSprites(definition:PublicCampaignDefinition){
  definition.tokens['cafe-horse']={url:root+'horse-drinking-8-directions.png',logicalWidth:112,logicalHeight:96,worldHeightMeters:1.45,anchorX:.5,anchorY:.98};
  const states:NonNullable<PublicCampaignDefinition['tokenAnimations'][string]>={};
  for(const [row,direction] of directions.entries()){
    const [y,height]=horseRows[row]!,cycle={frames:Array.from({length:4},(_,column)=>({url:root+'horse-drinking-8-directions.png',x:column*256,y,width:256,height,logicalWidth:256/height*96,logicalHeight:96,anchorX:.5,anchorY:.98})),fps:3};
    states[`drink-${direction}`]=cycle;states[`idle-${direction}`]=cycle;states[`direction-${direction}`]=cycle;
  }
  states.drink=states['drink-n']!;states.idle=states.drink;states.moving=states['direction-s']!;
  states.react={frames:states.drink.frames.slice(0,1),fps:1};definition.tokenAnimations['cafe-horse']=states;
  for(const [row,id] of ['patron','bartender'].entries()){
    const cycle={frames:Array.from({length:4},(_,column)=>({url:root+'seated-men-drinking.png',x:column*384,y:row*508,width:384,height:508,logicalWidth:64,logicalHeight:86,anchorX:.5,anchorY:.98})),fps:1.4};
    definition.tokenAnimations[id]!.drink=cycle;definition.tokenAnimations[id]!.sit={frames:cycle.frames.slice(0,1),fps:1};
  }
  for(const [row,id] of ['patron','bartender','patron-woman'].entries())for(const direction of directions){
    const side=direction==='s'?'front':direction==='n'||direction==='ne'||direction==='nw'?'rear':direction==='w'||direction==='sw'?'left':'right';
    const cycle={frames:Array.from({length:3},(_,column)=>({url:`/art/v52/patrons-${side}.png`,x:column*418,y:row*418,width:418,height:418,logicalWidth:70,logicalHeight:86,anchorX:.5,anchorY:.99})),fps:1.4};
    definition.tokenAnimations[id]![`drink-${direction}`]=cycle;definition.tokenAnimations[id]![`sit-${direction}`]={frames:cycle.frames.slice(0,1),fps:1};
  }
  for(const [row,id] of ['rogue','silverfarben-hotel'].entries()){
    const y=Math.round(row*887/2),height=Math.round((row+1)*887/2)-y;
    const frames=Array.from({length:4},(_,column)=>{const x=Math.round(column*1774/4);return{url:'/art/v52/prayer.png',x,y,width:Math.round((column+1)*1774/4)-x,height,logicalWidth:70,logicalHeight:86,anchorX:.5,anchorY:.99};});
    definition.tokenAnimations[id]!.pray={frames:[frames[1]!,frames[2]!,frames[3]!,frames[2]!,frames[3]!,frames[2]!,frames[3]!,frames[2]!,frames[3]!],fps:1.5};
  }
  const lead={frames:Array.from({length:3},(_,column)=>({url:'/art/v52/margaret-lead.png',x:column*724,y:0,width:724,height:724,logicalWidth:66,logicalHeight:86,anchorX:.5,anchorY:.99})),fps:1.4};
  definition.tokenAnimations.margaret!['guide-cow']=lead;
  for(const direction of directions)definition.tokenAnimations.margaret![`guide-cow-${direction}`]={...lead,flipX:['e','ne','se'].includes(direction)};
}

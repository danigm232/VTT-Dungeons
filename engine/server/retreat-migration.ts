import type {DurablePayload} from './persistence/schema.js';
import type {CompiledCampaign} from './campaign.js';
import oldTerrain from '../../campaigns/stormwreck-isle/public/retreat-terrain.json' with {type:'json'};

/** One-time geometry migration. Preserve outcomes, resources, visibility and
 * door state; relocate only addresses in the replaced dragon-rest layout. */
export function migrateRetreatAssembly(payload:DurablePayload,campaign:CompiledCampaign){
 if(campaign.public.campaignId!=='stormwreck-isle'||(payload.retreatGridVersion??1)>=2)return;
 const scene=campaign.public.scenes.find(s=>s.id==='dragon-rest');if(!scene?.terrain?.edgePaths?.length)return;
 const relocate=(actor:{id:string;sceneId?:string;surfaceId:string;cell:{col:number;row:number}})=>{
  if((actor.sceneId??payload.sceneId)!=='dragon-rest')return;
  const authored=scene.stageActors?.find(a=>a.id===actor.id)??campaign.privateActors?.find(a=>a.id===actor.id&&a.sceneId==='dragon-rest');
  if(authored){actor.cell={...authored.cell};actor.surfaceId=authored.surfaceId??'beach';return;}
  const old=oldTerrain.surfaces.find(s=>s.id===actor.surfaceId)?.tiles??[],next=scene.terrain!.surfaces.find(s=>s.id===actor.surfaceId)?.tiles??scene.terrain!.surfaces[0]!.tiles;
  const span=(ts:typeof old,axis:'col'|'row'):[number,number]=>[Math.min(...ts.map(t=>t.cell[axis])),Math.max(...ts.map(t=>t.cell[axis]))];
  const [a,b]=span(old,'col'),[c,d]=span(old,'row'),[e,f]=span(next,'col'),[g,h]=span(next,'row');
  const x=e+(Number.isFinite(a)?Math.max(0,Math.min(1,(actor.cell.col-a)/Math.max(1,b-a))):.5)*(f-e),y=g+(Number.isFinite(c)?Math.max(0,Math.min(1,(actor.cell.row-c)/Math.max(1,d-c))):.5)*(h-g);
  actor.cell={...next.reduce((best,t)=>Math.hypot(t.cell.col-x,t.cell.row-y)<Math.hypot(best.cell.col-x,best.cell.row-y)?t:best).cell};
  if(!scene.terrain!.surfaces.some(s=>s.id===actor.surfaceId))actor.surfaceId='beach';
 };
 for(const actor of payload.characters)relocate(actor);
 for(const actor of payload.npcs??[])relocate(actor);
 if(payload.creature)relocate(payload.creature);
 for(const saved of payload.scenes.find(s=>s.sceneId==='dragon-rest')?.objects??[]){const authored=scene.props.find(p=>p.id===saved.id);if(authored){saved.cell={...authored.cell};saved.surfaceId=authored.surfaceId;}}
 // A newly authored interaction point is harmless and remains a manual action.
 payload.npcs??=[];
 for(const actor of scene.stageActors??[])if(!payload.npcs.some(n=>n.id===actor.id))payload.npcs.push({id:actor.id,sceneId:scene.id,surfaceId:actor.surfaceId??scene.surfaceId,cell:{...actor.cell},facing:'south',hp:10,maxHp:10,combatEnabled:false,visible:true});
 payload.retreatGridVersion=2;
}

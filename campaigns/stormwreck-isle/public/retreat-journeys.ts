import type {MapAddress,PortDefinition,StageActorInteractionDefinition} from '../../../engine/server/campaign.js';
import navigation from './retreat-island-navigation.json' with {type:'json'};
import assembly from './retreat-zones/global-layout.json' with {type:'json'};
import manifest from './retreat-island.json' with {type:'json'};
const enabled=manifest.journeysEnabled&&manifest.availableStage>=3;
type Anchor=keyof typeof navigation.anchors;
const address=(mapId:string,zoneId:string,surfaceId:string,col:number,row:number):MapAddress=>({mapId,zoneId,surfaceId,cell:{col,row}});
function departure(anchor:Anchor|'boat'):MapAddress{
 const point=anchor==='boat'?assembly.landmarks.boat:navigation.anchors[anchor];if(!point)throw Error('Falta ancla construida de viaje: '+anchor);
 return {mapId:'dragon-rest',zoneId:anchor,surfaceId:point.surfaceId,cell:{...point.cell}};
}
/** CANON references cover the complete regional trip. Optional VTT stops do
 * not advance that duration, resolve tides, grant rest or stand in for B/D. */
export const retreatJourneyReferences={
 pleamarLand:{kilometres:10.5,seconds:8400,source:'PDF oficial p.17',tide:'El DM decide la disponibilidad de las calas por marea.'},
 observatoryInland:{kilometres:5.25,seconds:4500,source:'PDF oficial p.29',terrain:'Interior rocoso; terreno difícil.'},
 observatoryCoast:{kilometres:9,seconds:7200,source:'PDF oficial p.29'},
 boat:{kilometres:7.5,seconds:12000,source:'PDF oficial pp.17 y29'},
 wreckBoat:{kilometres:4,seconds:6000,source:'PDF oficial p.23',portId:'travel-pecio-boat'}
};
export const retreatPreparedDestinations=[
 {intent:'EXIT_PLEAMAR',name:'Cuevas de Pleamar',areas:'B1–B6',status:'prepared',mapId:null,entry:null},
 {intent:'EXIT_OBSERVATORIO',name:'Observatorio del Acantilado',areas:'D1–D6',status:'prepared',mapId:null,entry:null},
 {intent:'TRAVEL_PECIO_BOAT',name:'Pecio del Rosa de los Vientos',status:'available',mapId:'wreck-ship',portId:'travel-pecio-boat'}
] as const;
const definitions=[
 {key:'pleamar-low',anchor:'pleamar-low',intent:'EXIT_PLEAMAR',target:'exit-pleamar',map:'camp-coastal-refuge',cell:[12,18],medium:'road',label:'Pleamar · parada opcional en el refugio costero',back:'Volver al Retiro · senda baja de Pleamar'},
 {key:'pleamar-high',anchor:'pleamar-high',intent:'EXIT_PLEAMAR',target:'exit-pleamar',map:'camp-forest-pleamar',cell:[12,19],medium:'road',label:'Pleamar · parada opcional en el bosque',back:'Volver al Retiro · senda alta de Pleamar'},
 {key:'observatory-inland',anchor:'observatory-inland',intent:'EXIT_OBSERVATORIO',target:'exit-observatorio',map:'camp-cliffs-observatory',cell:[12,18],medium:'road',label:'Observatorio · parada opcional por el interior',back:'Volver al Retiro · interior rocoso'},
 {key:'observatory-coast',anchor:'observatory-coast',intent:'EXIT_OBSERVATORIO',target:'exit-observatorio',map:'camp-cliffs-observatory',cell:[22,10],medium:'road',label:'Observatorio · parada opcional por la costa',back:'Volver al Retiro · cornisa costera'},
 {key:'boat-pleamar',anchor:'boat',intent:'EXIT_PLEAMAR',target:'travel-pecio-boat',map:'camp-coastal-refuge',cell:[12,2],medium:'swim',label:'Barca hacia Pleamar · parada opcional en la costa',back:'Volver al embarcadero del Retiro en barca'},
 {key:'boat-observatory',anchor:'boat',intent:'EXIT_OBSERVATORIO',target:'travel-pecio-boat',map:'camp-cliffs-observatory',cell:[12,2],medium:'swim',label:'Barca hacia el Observatorio · parada opcional costera',back:'Volver al embarcadero del Retiro en barca'}
] as const;
export const retreatJourneyRoutes=definitions.map(r=>({id:'retreat-journey-'+r.key,intent:r.intent,medium:r.medium==='road'?'land':'boat',optionalStop:r.map,finalDestinationStatus:'prepared',content:'VTT_AMBIENCE'}));
export const retreatJourneyPorts:PortDefinition[]=enabled?definitions.map(r=>({
 id:'retreat-journey-'+r.key,from:departure(r.anchor),to:address(r.map,'arrival-'+r.key,'ground',r.cell[0],r.cell[1]),
 mode:r.medium,return:'adjudicated',autoDirection:'manual',rememberReturn:true,interactionTargetId:r.target,label:r.label,returnLabel:r.back
})):[];
export const retreatJourneyInteractions:StageActorInteractionDefinition[]=enabled?definitions.filter(r=>r.anchor!=='boat').map(r=>({
 sceneId:'dragon-rest',targetId:r.target,surfaceId:departure(r.anchor).surfaceId,siteAnchor:true,cells:[departure(r.anchor).cell],
 nearbyLabel:r.intent==='EXIT_PLEAMAR'?'Continuar hacia Pleamar':'Continuar hacia el Observatorio',responseAnimation:'idle',
 notice:'El grupo prepara la continuación. El DM confirma la ruta, el tiempo y cualquier acontecimiento del viaje.'
})):[];
export function withRetreatJourneyNotices(original:StageActorInteractionDefinition[]){
 if(!enabled)return original;
 const notices:Record<string,string>={
  'exit-pleamar':'Puedes seguir la senda baja por las calas o tomar la subida hacia la ruta alta. El DM decide la marea y dirige la expedición.',
  'exit-observatorio':'El camino continúa hacia una bifurcación entre el interior rocoso y la cornisa costera. El DM dirige la expedición.',
  'travel-pecio-boat':'La barca permite preparar un viaje al pecio o una aproximación por mar hacia Pleamar o el Observatorio. El DM confirma destino, tiempo y acontecimientos.'
 };
 return original.map(r=>notices[r.targetId]?{...r,notice:notices[r.targetId]!}:r);
}

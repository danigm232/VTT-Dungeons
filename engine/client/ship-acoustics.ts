import type { AudioState, Cell } from '../shared/protocol.js';
import { wreckCabinAt } from './wreck-cabins.js';

export type ShipListener = { sceneId:string; surfaceId:string; cell:Cell };
const outside={ocean:1,wind:1,wood:1,storm:1};
/** Local listening perspective only. Never changes DM volume, playback,
 * offsets, finite repeats or saves, and is inert in every other campaign. */
export function shipAmbienceGains(listener:ShipListener|null){
  if(listener?.sceneId!=='wreck-ship')return outside;
  if(listener.surfaceId==='hold-air')return {ocean:.62,wind:.04,wood:.36,storm:.25};
  if(listener.surfaceId==='lower-deck')return {ocean:.82,wind:.22,wood:.8,storm:.6};
  if(listener.surfaceId==='crow')return {ocean:.72,wind:1,wood:.55,storm:1};
  if(wreckCabinAt(listener.cell,listener.surfaceId))return {ocean:.72,wind:.35,wood:1,storm:.65};
  return outside;
}
export function shipPerspectiveAudio(state:AudioState,listener:ShipListener|null):AudioState{
  const gains=shipAmbienceGains(listener);if(gains===outside)return state;
  const layers={...state.layers};
  for(const channel of ['ocean','wind','wood','storm'] as const)layers[channel]={...layers[channel],volume:layers[channel].volume*gains[channel]};
  return {...state,layers};
}

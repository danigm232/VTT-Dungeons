import type {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import terrain from './retreat-terrain-v2.json' with {type:'json'};

// The orthographic camera sits far away from the tactical floor. Applying the
// camp's exponential fog over that camera distance can hide the entire retreat.
// Protect the existing navigable extent and actor/architecture height; fog still
// covers the distant environment. No weather value or navigation data changes.
const tiles=terrain.surfaces.flatMap(surface=>surface.tiles),size=terrain.tileMeters;
const x=[Math.min(...tiles.map(t=>t.cell.col))*size,(Math.max(...tiles.map(t=>t.cell.col))+1)*size];
const z=[Math.min(...tiles.map(t=>t.cell.row))*size,(Math.max(...tiles.map(t=>t.cell.row))+1)*size];
const y=[Math.min(...tiles.flatMap(t=>t.corners))-1,Math.max(...tiles.flatMap(t=>t.corners))+20];
export const retreatWeatherReserve=Object.freeze(x.flatMap(a=>y.flatMap(b=>z.map(c=>Object.freeze(new Vector3(a,b,c))))));

export function preserveRetreatWeatherVisibility(scene:Scene,density:number){
 const camera=scene.activeCamera;if(!camera||!Number.isFinite(density)||density<=.0001)return;
 camera.getViewMatrix();
 // Babylon's fog shader uses Euclidean view distance, including lateral offset.
 const start=Math.max(...retreatWeatherReserve.map(p=>Vector3.Distance(camera.globalPosition,p)))+5;
 scene.fogMode=3; // Existing linear fog shader; retain the camp's weather colour.
 scene.fogStart=start;scene.fogEnd=start+80+240*(1-Math.max(0,Math.min(1,density)));
}

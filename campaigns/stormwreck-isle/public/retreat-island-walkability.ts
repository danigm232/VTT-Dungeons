import type { TerrainDefinition } from '../../../engine/shared/terrain.js';
import verified from './retreat-forest-walkability.json' with {type:'json'};

/**
 * Measured movement on the existing two forest clearings. Never propagate
 * a staircase's height by column across the surrounding cliff or empty air.
 */
const cellKey = (col: number, row: number) => `${col},${row}`;

/** Retain every authored path record; append only physically verified ground.
 * Version-3 saves on the obsolete blanket expansion are repaired separately. */
export function expandRetreatIslandWalkability(source: TerrainDefinition): TerrainDefinition {
  const terrain = structuredClone(source);
  const additions=new Set<string>();
  for(const record of verified.cells){
    const surface=terrain.surfaces.find(s=>s.id===record.surfaceId);if(!surface)throw Error('Retiro: falta superficie '+record.surfaceId);
    if(surface.tiles.some(t=>cellKey(t.cell.col,t.cell.row)===cellKey(record.cell.col,record.cell.row)))continue;
    if(terrain.obstacles?.some(o=>o.surfaceId===surface.id&&cellKey(o.cell.col,o.cell.row)===cellKey(record.cell.col,record.cell.row)))continue;
    const h=record.height;
    surface.tiles.push({cell:{...record.cell},corners:[h,h,h,h],kind:'floor',materialId:'retreat-earth',movementCost:1,medium:'solid'});
    additions.add(surface.id+':'+cellKey(record.cell.col,record.cell.row));
  }
  // The old blanket expansion copied staircase heights across empty space.
  // Use the measured forest floor instead. Add only real adjacent connections
  // to the existing path surfaces; their anchors and manual travel IDs stay put.
  for(const surface of terrain.surfaces)for(const tile of surface.tiles){
    if(!additions.has(surface.id+':'+cellKey(tile.cell.col,tile.cell.row)))continue;
    for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]])for(const other of terrain.surfaces){
      if(other.id===surface.id||other.visualOnly)continue;
      const neighbor=other.tiles.find(t=>t.cell.col===tile.cell.col+dx!&&t.cell.row===tile.cell.row+dz!);
      if(!neighbor||neighbor.corners.some(h=>Math.abs(h-tile.corners[0])>.5))continue;
      const from={surfaceId:surface.id,cell:{...tile.cell}},to={surfaceId:other.id,cell:{...neighbor.cell}};
      const mode=neighbor.corners.every(h=>Math.abs(h-tile.corners[0])<=.1)?'ramp':'stair';
      terrain.transitions.push({from,to,mode});
    }
  }
  return terrain;
}

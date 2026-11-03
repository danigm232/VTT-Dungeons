import type {TerrainDefinition} from '../../../engine/shared/terrain.js';
import {surfacePoint} from '../../../engine/shared/terrain.js';
import patch from './retreat-r3-navigation.json' with {type:'json'};
import assembly from './retreat-zones/global-layout.json' with {type:'json'};
/** Append measured extensions through the existing terrain owner. Visibility
 * of the grid has no influence on this persistent graph or on door rules. */
export function adaptRetreatCorrectionsNavigation(source:TerrainDefinition):TerrainDefinition{
 const replacements=new Map(patch.surfaces.map(s=>[s.id,s])),changed=new Set([...patch.edgePaths.flatMap(p=>[key(p.from),key(p.to)]),...patch.blockedEdges.flatMap(p=>[key({surfaceId:p.surfaceId,cell:p.from}),key({surfaceId:p.surfaceId,cell:p.to})])]);
 const terrain:TerrainDefinition={...source,surfaces:source.surfaces.map(s=>(replacements.get(s.id)??s) as TerrainDefinition['surfaces'][number]),
  edgePaths:[...(source.edgePaths??[]).filter(p=>!changed.has(key(p.from))||!changed.has(key(p.to))),...patch.edgePaths as NonNullable<TerrainDefinition['edgePaths']>],
  blockedEdges:[...(source.blockedEdges??[]).filter(p=>!changed.has(key({surfaceId:p.surfaceId,cell:p.from}))||!changed.has(key({surfaceId:p.surfaceId,cell:p.to}))),...patch.blockedEdges]};
 const addresses=new Set(terrain.surfaces.flatMap(s=>s.tiles.map(t=>key({surfaceId:s.id,cell:t.cell}))));
 terrain.edgePaths=terrain.edgePaths?.filter(p=>addresses.has(key(p.from))&&addresses.has(key(p.to))).map(p=>({...p,points:[surfacePoint(terrain,p.from),...p.points.slice(1,-1),surfacePoint(terrain,p.to)]}));
 terrain.blockedEdges=terrain.blockedEdges?.filter(p=>addresses.has(key({surfaceId:p.surfaceId,cell:p.from}))&&addresses.has(key({surfaceId:p.surfaceId,cell:p.to})));
 terrain.obstacles=terrain.obstacles?.filter(o=>!addresses.has(key(o)));
 // Old prop cells may be removed when a bench/tree now occupies them. Keep
 // transitions only between real floor records; original doors/travel IDs stay.
 terrain.transitions=source.transitions.filter(t=>addresses.has(key(t.from))&&addresses.has(key(t.to)));
 const existing=new Set(source.surfaces.flatMap(s=>s.tiles.map(t=>key({surfaceId:s.id,cell:t.cell})))),pairs=new Set(terrain.transitions.map(t=>[key(t.from),key(t.to)].sort().join('|')));
 for(const surface of terrain.surfaces)for(const tile of surface.tiles){
  const from={surfaceId:surface.id,cell:tile.cell};if(existing.has(key(from)))continue;
  for(const other of terrain.surfaces){
   if(other.id===surface.id||other.visualOnly)continue;
   for(const neighbor of other.tiles){
    if(Math.abs(neighbor.cell.col-tile.cell.col)+Math.abs(neighbor.cell.row-tile.cell.row)!==1)continue;
    if([...tile.corners,...neighbor.corners].some(h=>Math.abs(h-tile.corners[0])>.5))continue;
    const to={surfaceId:other.id,cell:neighbor.cell},pair=[key(from),key(to)].sort().join('|');if(pairs.has(pair))continue;
    // Adjacent squares on different surfaces can still have a wall between
    // them. Check the swept body before adding a cross-surface connection.
    // In particular the extended library must keep its one real door.
    const a=surfacePoint(terrain,from),b=surfacePoint(terrain,to),boxes=assembly.collisionBoxes.filter(box=>box.zone===from.surfaceId||box.zone===to.surfaceId),n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.025));
    let clear=true;for(let i=0;i<=n&&clear;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[2]+(b[2]-a[2])*i/n;for(const box of boxes){const [x0,x1,z0,z1]=box.bounds;if(Math.max(x0!-x,0,x-x1!)**2+Math.max(z0!-z,0,z-z1!)**2<.09006){clear=false;break;}}}
    if(!clear)continue;
    terrain.transitions.push({from,to,mode:Math.max(...neighbor.corners.map(h=>Math.abs(h-tile.corners[0])))>.1?'stair':'ramp'});pairs.add(pair);
   }
  }
 }
 return terrain;
}
function key(a:{surfaceId:string;cell:{col:number;row:number}}){return `${a.surfaceId}:${a.cell.col},${a.cell.row}`;}

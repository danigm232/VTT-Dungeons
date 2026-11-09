import {surfacePoint, type SurfaceAddress, type TerrainDefinition} from '../../../engine/shared/terrain.js';

/** A2's western threshold shares a level landing with both cliff stairways.
 * Widen the existing approach to the same two-cell width as the upper stair.
 * The original cell addresses, door and elevations remain. */
export const WINCH_JUNCTION = {
 tile: {surfaceId:'a2',cell:{col:103,row:45}},
 upper: {surfaceId:'upper',cell:{col:102,row:45}},
 cliff: {surfaceId:'cliff',cell:{col:103,row:46}},
 floor: {minX:154.5,maxX:159,minZ:66,maxZ:69,height:15,originalMinX:155.25,originalMinZ:67.5},
} as const satisfies {tile:SurfaceAddress;upper:SurfaceAddress;cliff:SurfaceAddress;floor:Record<string,number>};

const same=(a:SurfaceAddress,b:SurfaceAddress)=>a.surfaceId===b.surfaceId&&a.cell.col===b.cell.col&&a.cell.row===b.cell.row;

export function adaptRetreatWinchJunction(source:TerrainDefinition):TerrainDefinition{
 const target=WINCH_JUNCTION.tile;
 let found=false;
 const surfaces=source.surfaces.map(surface=>{
  if(surface.id!==target.surfaceId)return surface;
  const tiles=surface.tiles.map(tile=>{
   if(tile.cell.col!==target.cell.col||tile.cell.row!==target.cell.row)return tile;
   found=true;
   const {polygon:_polygon,anchor:_anchor,...fullTile}=tile;
   return fullTile;
  });
  const template=tiles.find(tile=>tile.cell.col===target.cell.col&&tile.cell.row===target.cell.row);
  if(!template)return surface;
  for(const col of [103,104,105]){
   if(tiles.some(tile=>tile.cell.col===col&&tile.cell.row===44))throw Error('Retiro A2: ya existe una casilla en la ampliación');
   // The oak wall begins at x=158.73. Show only the part outside the wall;
   // the physical stopping point stays 0.48 m from its collider.
   tiles.push({...template,cell:{col,row:44},...col===105?{polygon:[[0,0],[.82,0],[.82,1],[0,1]] as [number,number][]}: {}});
  }
  return {...surface,tiles};
 });
 if(!found)throw Error('Retiro A2: no se encuentra la casilla del descansillo');
 const hasUpper=source.surfaces.some(s=>s.id===WINCH_JUNCTION.upper.surfaceId&&s.tiles.some(t=>t.cell.col===WINCH_JUNCTION.upper.cell.col&&t.cell.row===WINCH_JUNCTION.upper.cell.row));
 if(!hasUpper)throw Error('Retiro A2: no se encuentra el último escalón');
 const transitions=[...source.transitions];
 for(const row of [44,45]){
  const from={surfaceId:'upper',cell:{col:102,row}},to={surfaceId:'a2',cell:{col:103,row}};
  if(!transitions.some(edge=>same(edge.from,to)&&same(edge.to,from)||same(edge.to,to)&&same(edge.from,from)))transitions.push({from,to,mode:'stair'});
 }
 // The new outside cell must never connect through the house's west wall.
 const wallEdge={surfaceId:'a2',from:{col:105,row:44},to:{col:106,row:44}};
 const blockedEdges=[...(source.blockedEdges??[])];
 if(!blockedEdges.some(e=>e.surfaceId==='a2'&&(e.from.col===105&&e.from.row===44&&e.to.col===106&&e.to.row===44||e.to.col===105&&e.to.row===44&&e.from.col===106&&e.from.row===44)))blockedEdges.push(wallEdge);
 const terrain:TerrainDefinition={...source,surfaces,transitions,blockedEdges};
 terrain.edgePaths=(source.edgePaths??[]).map(edge=>{
  if(!same(edge.from,target)&&!same(edge.to,target))return edge;
  // The former half-cell used a displaced stopping point. Keep the existing
  // route but update its endpoints; the lower-landing crossing is now straight.
  if(same(edge.from,WINCH_JUNCTION.cliff)||same(edge.to,WINCH_JUNCTION.cliff))return {...edge,points:[surfacePoint(terrain,edge.from),surfacePoint(terrain,edge.to)]};
  return {...edge,points:[surfacePoint(terrain,edge.from),...edge.points.slice(1,-1),surfacePoint(terrain,edge.to)]};
 });
 for(const row of [44,45]){
  const from={surfaceId:'upper',cell:{col:102,row}},to={surfaceId:'a2',cell:{col:103,row}};
  if(!terrain.edgePaths.some(edge=>same(edge.from,to)&&same(edge.to,from)||same(edge.to,to)&&same(edge.from,from))){
   terrain.edgePaths.push({from,to,points:[surfacePoint(terrain,from),[WINCH_JUNCTION.floor.minX,WINCH_JUNCTION.floor.height,(row+.5)*source.tileMeters],surfacePoint(terrain,to)]});
  }
 }
 return terrain;
}

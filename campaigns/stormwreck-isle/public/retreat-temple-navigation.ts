import type {TerrainDefinition} from '../../../engine/shared/terrain.js';
import patch from './retreat-temple-navigation.json' with {type:'json'};
/** A5 alone follows the authorised wider terrace and four perimeter columns.
 * Existing addresses, all other surfaces, doors and travel connections survive. */
export function adaptRetreatTempleNavigation(terrain:TerrainDefinition):TerrainDefinition{
 const addresses=new Set(patch.surface.tiles.map(t=>`${t.cell.col},${t.cell.row}`));
 return {...terrain,surfaces:terrain.surfaces.map(s=>s.id==='a5'?patch.surface as TerrainDefinition['surfaces'][number]:s),
  edgePaths:[...(terrain.edgePaths??[]).filter(p=>p.from.surfaceId!=='a5'||p.to.surfaceId!=='a5'),...patch.edgePaths as NonNullable<TerrainDefinition['edgePaths']>],
  blockedEdges:[...(terrain.blockedEdges??[]).filter(p=>p.surfaceId!=='a5'),...patch.blockedEdges],
  obstacles:terrain.obstacles?.filter(p=>p.surfaceId!=='a5'||!addresses.has(`${p.cell.col},${p.cell.row}`))};
}

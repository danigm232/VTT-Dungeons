import { describe,it,expect,afterEach } from 'vitest';
import { NullEngine,Scene } from '@babylonjs/core';
import { buildTerrain3D } from './terrain3d.js';
import { buildShipTorch,buildShipPropVisual } from './ship-props3d.js';
import { WRECK_STRUCTURE as S,WRECK_CABINS,wreckListHeight,wreckBeamAt,wreckHullPlan,planArea } from '../shared/wreck-structure.js';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { terrainTile,surfaceHeight } from '../shared/terrain.js';
import type { PublicProp } from '../shared/protocol.js';
import { buildHarpyNest,nestWalkDistance } from './wreck-nest.js';
import { buildDragonRemains } from './wreck-dragon-bones.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';

const engines:NullEngine[]=[];
afterEach(()=>engines.splice(0).forEach(e=>e.dispose()));
const makeScene=()=>{const engine=new NullEngine();engines.push(engine);return new Scene(engine);};
const terrain=wreckRuntimeScenes[0]!.terrain!;
describe('reconstrucción estructural del pecio',()=>{
  it('construye un cuenco irregular de fibras sin invadir el anillo transitable de la cofa',()=>{
    const scene=makeScene(),meshes=buildHarpyNest(scene);
    expect(meshes.length).toBe(7);expect(meshes.every(m=>m.metadata.bowl&&!m.isPickable)).toBe(true);
    let min=Infinity,max=-Infinity;
    for(const m of meshes){const p=m.getVerticesData('position')!;for(let i=0;i<p.length;i+=3){expect(Math.hypot(p[i]!-S.origin.x,p[i+2]!-S.origin.z)).toBeLessThanOrEqual(S.nestRadius+.001);min=Math.min(min,p[i+1]!);max=Math.max(max,p[i+1]!);}}
    expect(max-min).toBeGreaterThan(.70);expect(max-min).toBeLessThan(1.5);
    for(const m of meshes){const p=m.getVerticesData('position')!;for(let i=0;i<p.length;i+=3)if(nestWalkDistance(p[i]!-S.origin.x,p[i+2]!-S.origin.z)<.295)expect(p[i+1]!-S.crowHeight-wreckListHeight(p[i+2]!)).toBeLessThanOrEqual(.141);}
  });
  it('tiene cráneo, cavidades y costillas volumétricas dentro de las rocas bloqueadas',()=>{
    const scene=makeScene(),meshes=buildDragonRemains(scene,terrain),cells=terrain.obstacles!.filter(o=>['reef-south-west','dragon-bone-stern'].includes(o.obstacleId)).map(o=>o.cell);
    expect(meshes.length).toBe(3);expect(meshes.every(m=>m.metadata.anatomy)).toBe(true);
    expect(meshes.some(m=>m.material?.name.includes('cavities'))).toBe(true);
    for(const m of meshes){const p=m.getVerticesData('position')!;for(let i=0;i<p.length;i+=3)expect(cells.some(c=>p[i]!>=c.col*1.5-.001&&p[i]!<=(c.col+1)*1.5+.001&&p[i+2]!>=c.row*1.5-.001&&p[i+2]!<=(c.row+1)*1.5+.001)).toBe(true);}
  });
  it('cierra C8/C9, conserva la entrada y aplica acabados sin añadir luz artificial',()=>{
    const scene=makeScene(),view=buildTerrain3D(scene,terrain,{shipDeck:true,batchTiles:true});
    for(const surface of ['lower-deck','hold-air'])expect(view.structures.some(m=>m.metadata?.kind==='interior-floor-closure'&&m.metadata.deckSurfaceId===surface)).toBe(true);
    expect(view.structures.filter(m=>m.metadata?.kind==='stair-bottom').length).toBe(2);
    expect(view.deckDetails.some(m=>m.metadata?.kind==='stern-breach-reveal')).toBe(true);
    const finishes=scene.materials.filter(m=>m.name.startsWith('wreck-finish:')) as StandardMaterial[];
    expect(finishes.length).toBeGreaterThan(10);expect(finishes.every(m=>m.lightmapTexture&&m.useLightmapAsShadowmap&&m.emissiveColor.equalsFloats(0,0,0))).toBe(true);
    expect(scene.getMeshByName('terrain-batch:lower-deck:wet-wood')?.getVerticesData('uv2')).toBeTruthy();
    expect(view.deckDetails.filter(m=>m.metadata?.kind==='weather-decal').length).toBe(5);
    expect(scene.imageProcessingConfiguration.colorCurvesEnabled).toBe(true);
    expect(scene.lights.filter(l=>l.name.startsWith('light:')).every(l=>l.intensity===0)).toBe(true);
  });
  it('reduce proporciones sin cambiar la casilla y integra los camarotes bajo C2 y C3',()=>{
    expect(S.length).toBe(61.5);expect(S.tileMeters).toBe(1.5);
    expect(Math.atan(S.listSlope)*180/Math.PI).toBeLessThan(1);
    for(const [id,b] of Object.entries(WRECK_CABINS)){
      const surface=terrain.surfaces.find(s=>s.id===(id==='c4'||id==='c5'?'c3':'c2'))!;
      for(let col=b.minCol;col<=b.maxCol;col++)for(let row=b.minRow;row<=b.maxRow;row++){
        const cell={col,row},x=(col+.5)*S.tileMeters-S.origin.x,z=(row+.5)*S.tileMeters-S.origin.z;
        expect(Math.abs(z),`${id}:${col},${row} dentro del casco`).toBeLessThan(wreckBeamAt(x));
        const mast=terrain.occluders?.some(o=>o.id===`${surface.id}-mast`&&o.cell.col===col&&o.cell.row===row);
        expect(surface.tiles.some(t=>t.cell.col===col&&t.cell.row===row)||mast,`${id}:${col},${row} bajo cubierta`).toBe(true);
      }
    }
    for(const s of terrain.surfaces.filter(s=>['main','c2','c3'].includes(s.id)))for(const t of s.tiles.filter(t=>t.kind!=='stair')){
      expect(surfaceHeight(terrain,{surfaceId:s.id,cell:t.cell})).toBeCloseTo((s.id==='main'?0:3)+wreckListHeight((t.cell.row+.5)*1.5),5);
    }
  });
  it('comparte una silueta naval convexa y recorta suelos sin perder los centros transitables',()=>{
    expect(wreckBeamAt(31)).toBeLessThan(2);expect(wreckBeamAt(-29.5)).toBeGreaterThan(5);expect(wreckBeamAt(0)).toBeGreaterThan(10);
    expect(planArea(wreckHullPlan())).toBeLessThan(S.length*22);
    for(const s of terrain.surfaces.filter(s=>!s.visualOnly&&s.id!=='sea'))for(const tile of s.tiles){
      const p=tile.polygon;if(!p)continue;
      expect(p.length).toBeGreaterThanOrEqual(3);expect(p.flat().every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);
      expect(planArea(p.map(([x,z])=>({x,z})))).toBeGreaterThan(.01);
      // Convex footprint contains the authoritative foot/pick point.
      const signs=p.map(([x,z],i)=>{const q=p[(i+1)%p.length]!;return (q[0]-x)*(.5-z)-(q[1]-z)*(.5-x);});
      expect(signs.every(n=>n>=-.00001)||signs.every(n=>n<=.00001),`${s.id}:${tile.cell.col},${tile.cell.row}`).toBe(true);
    }
  });
  it('conserva el gradiente canónico de 15–45 cm y usa la misma cota que el mar',()=>{
    const lower=terrain.surfaces.find(s=>s.id==='lower-deck')!.tiles.filter(t=>t.kind!=='stair');
    const depth=lower.flatMap(t=>t.corners.map(y=>S.seaHeight-y));
    expect(Math.min(...depth)).toBeCloseTo(.15,2);expect(Math.max(...depth)).toBeCloseTo(.45,2);
    const sea=terrain.surfaces.find(s=>s.id==='sea')!.tiles[0]!;
    expect(surfaceHeight(terrain,{surfaceId:'sea',cell:sea.cell})).toBe(S.seaHeight);
  });
  it('mantiene niveles retirables después de combinar meshes y no instala el océano antiguo',()=>{
    const scene=makeScene(),view=buildTerrain3D(scene,terrain,{shipDeck:true,batchTiles:true});
    expect(scene.getMeshByName('ship-water')).toBeNull();expect(scene.getMeshByName('wreck-ocean')).not.toBeNull();
    const interiors=view.structures.filter(m=>m.name.startsWith('wreck-interior'));
    expect(interiors.length).toBeGreaterThan(8);
    expect(interiors.every(m=>['main','lower-deck','hold-air'].includes(m.metadata.deckSurfaceId))).toBe(true);
    expect(view.structures.some(m=>m.metadata?.kind==='hatch-lid')).toBe(true);
    expect(view.structures.some(m=>m.name==='structure:c1-hatch')).toBe(false);
    const landing=view.structures.find(m=>m.metadata?.kind==='stair-landing-preview')!;
    expect(landing).toBeTruthy();expect(landing.metadata.bottom).toBeLessThan(-3);
    const walls=view.occluders.filter(m=>m.name.startsWith('wreck:cabin-bulkheads:'));
    expect(walls.length).toBeGreaterThan(4);expect(walls.every(m=>m.metadata.cabinIds.length&&Number.isFinite(m.metadata.plane))).toBe(true);
    expect([...view.structures,...view.occluders].every(m=>!m.isPickable&&!m.checkCollisions)).toBe(true);
    for(const prop of wreckRuntimeScenes[0]!.props)for(const c of prop.baseFootprint)
      expect(terrainTile(terrain,{surfaceId:prop.surfaceId??'main',cell:{col:prop.cell.col+c.col,row:prop.cell.row+c.row}}),prop.id).toBeTruthy();
  });
  it('representa la antorcha apagada sin crear luz ni usar un indicador plano',()=>{
    const scene=makeScene(),before=scene.lights.length,torch=buildShipTorch(scene);
    expect(scene.lights.length).toBe(before);expect(torch.getChildMeshes().length).toBeGreaterThan(4);
    expect(torch.getChildMeshes().every(m=>!m.isPickable)).toBe(true);
  });
  it('no rellena la cocina con objetos ausentes del capítulo',()=>{
    const scene=makeScene(),def=wreckRuntimeScenes[0]!.props.find(p=>p.id==='c5-counter-blockout')!;
    const p={...def,footprint:def.baseFootprint,structure:'intact'} as PublicProp;
    const names=buildShipPropVisual(scene,p,4.5,1.5).getChildMeshes().map(m=>m.name);
    expect(names.some(n=>/cooking-pot|crockery|dish/.test(n))).toBe(false);
  });
});

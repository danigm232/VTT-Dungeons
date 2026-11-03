import {describe,expect,it} from 'vitest';
import {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Viewport} from '@babylonjs/core/Maths/math.viewport.js';
import {WorldRenderer} from '../../apps/web/world';
import {d8CellWorldPoint,d8GridWorldPoint,d8PickCell} from './d8-camera';
import {d8SceneGrid,d8SpatialNavigation} from '../../campaigns/one-shot/public/pack';
import {D8NIGHT} from '../../campaigns/one-shot/playground/d8night.config';
import {combatSafeProjection} from './combat-camera';
import {Graphics} from 'pixi.js';

describe('one ground-space contract for grid, feet, targeting and pointer',()=>{
  it('keeps feet inside the drawn/picked cell across D8 maps, camera tilt/orbit, zoom and safe HUD offsets',()=>{
    for(const sceneId of ['mirror','temple','cafe'] as const){
      const grid=d8SceneGrid(sceneId),terrain=d8SpatialNavigation(sceneId).terrain,size=D8NIGHT.maps[sceneId].MAP.size as [number,number];
      const tile=terrain.surfaces[0]!.tiles[Math.floor(terrain.surfaces[0]!.tiles.length/2)]!;
      const foot=d8CellWorldPoint(tile.cell,size,grid,terrain),center=new Vector3(foot.x,foot.y,foot.z);
      for(const tilt of [5,15,25,35])for(const yaw of [-30,0,30])for(const zoom of [1,3]){
        const alpha=Math.PI/2+yaw*Math.PI/180,beta=(90-tilt)*Math.PI/180;
        const eye=center.add(new Vector3(Math.cos(alpha)*Math.sin(beta),Math.cos(beta),Math.sin(alpha)*Math.sin(beta)).scale(100));
        const view=Matrix.LookAtLH(eye,center,Vector3.Up()),raw=Matrix.OrthoLH(30/zoom,18/zoom,-100,1000);
        const screen={width:1200,height:720},safe={left:12,top:160,width:1176,height:440};
        const projection=Matrix.FromArray(combatSafeProjection(raw.m,screen,safe,true));
        const pixel=Vector3.Project(center,Matrix.Identity(),view.multiply(projection),new Viewport(0,0,screen.width,screen.height));
        expect(d8PickCell(pixel,screen,view,projection,size,grid,terrain)).toEqual(tile.cell);
        const corner=d8GridWorldPoint(tile.cell.col,tile.cell.row,size,grid),next=d8GridWorldPoint(tile.cell.col+1,tile.cell.row+1,size,grid);
        expect(foot.x).toBeCloseTo((corner.x+next.x)/2);expect(foot.z).toBeCloseTo((corner.z+next.z)/2);
      }
    }
  });
  it('projects the actual native actor anchor, not a second logical-cell approximation',()=>{
    const renderer:any=Object.create(WorldRenderer.prototype),view=Matrix.LookAtLH(new Vector3(4,8,10),Vector3.Zero(),Vector3.Up()),projection=Matrix.OrthoLH(20,12,.1,1000);
    const world=new Vector3(1.2,2.4,-3.1),viewport=new Viewport(0,0,1,1);
    Object.assign(renderer,{d8Scene:{activeCamera:{viewport},getTransformMatrix:()=>view.multiply(projection)},app:{screen:{width:1200,height:720}},interpolatedWorldPosition:()=>world});
    const actual=renderer.interpolatedScreenPoint({cell:{col:0,row:0},seatId:'chair'});
    const expected=Vector3.Project(world,Matrix.Identity(),view.multiply(projection),viewport.toGlobal(1200,720));
    expect(actual.x).toBeCloseTo(expected.x);expect(actual.y).toBeCloseTo(expected.y);
  });
  it('honours a non-base surface when locating native feet',()=>{
    const terrain=structuredClone(d8SpatialNavigation('temple').terrain),tile=structuredClone(terrain.surfaces[0]!.tiles[0]!);
    tile.corners=[3,3,3,3];terrain.surfaces.push({...terrain.surfaces[0]!,id:'upper',tiles:[tile]});
    const position=d8CellWorldPoint(tile.cell,[30,30],d8SceneGrid('temple'),terrain,'upper');
    expect(position.y).toBeCloseTo(3.045);
  });
  it('outlines occupied cells for targeting outside combat too, but never hidden actors',()=>{
    const renderer:any=Object.create(WorldRenderer.prototype),selection=new Graphics();
    Object.defineProperty(renderer,'scene',{value:{grid:{originX:0,originY:0,tileSize:64}}});
    const actor={id:'hero',cell:{col:1,row:1},color:'#ffffff'},hidden={id:'hidden',cell:{col:8,row:8},color:'#ffffff'};
    Object.assign(renderer,{selection,sceneId:'flat',localId:'hero',selectedObject:null,snapshot:{entities:[actor,hidden],combat:{active:false}},attackRangePreview:null,tokenViews:new Map(),entityVisibleFromFocus:(e:any)=>e.id!=='hidden',interpolatedScreenPoint:(e:any)=>({x:(e.cell.col+.5)*64,y:(e.cell.row+.5)*64})});
    renderer.drawSelection();expect(selection.width).toBe(0);
    renderer.attackRangePreview={originId:'hero'};renderer.drawSelection();
    expect(selection.getLocalBounds().maxX).toBeLessThan(132);expect(selection.width).toBeGreaterThan(60);
    renderer.attackRangePreview=null;renderer.snapshot.combat.active=true;renderer.drawSelection();expect(selection.width).toBeGreaterThan(60);
    renderer.snapshot.combat.active=false;renderer.drawSelection();expect(selection.width).toBe(0);selection.destroy();
  });
});

import {describe,it,expect,vi} from 'vitest';
import {WorldRenderer} from '../../apps/web/world';
import {validSharedCameraFrame} from '../shared/camera';
const tile=(height:number)=>({cell:{col:3,row:4},corners:[height,height,height,height]});
function renderer(role='dm'){
  const view=Object.create(WorldRenderer.prototype) as any;
  const scene={surfaceId:'main',grid:{cols:20,rows:20},terrain:{tileMeters:1.5,surfaces:[{id:'main',tiles:[tile(0)]},{id:'lower',tiles:[tile(-3)]},{id:'hold',tiles:[tile(-6)]}]}};Object.defineProperty(view,'scene',{value:scene});
  Object.assign(view,{sceneId:'wreck-ship',options:{cameraRole:role},updateCamera:vi.fn(),sceneOverview:false,dmLocation:null,dmFollowId:null,snapshot:{entities:[]},sharedCameraFrames:new Map(),cameraFrameChangeHandler:vi.fn()});return view;
}
describe('camera without a game-piece',()=>{
  it('opens an empty room and overlapping floors through a local focus without changing entities or selecting a ficha',()=>{
    const view=renderer(),before=structuredClone(view.snapshot);view.exploreDmCell({col:3,row:4},'main');
    expect(view.snapshot).toEqual(before);expect(view.navigationFocus()).toMatchObject({id:'__dm_camera__',cell:{col:3,row:4},surfaceId:'main'});
    expect(view.dmAdjacentLayer({col:3,row:4},-1)).toBe('lower');view.exploreDmCell({col:3,row:4},'lower');expect(view.dmAdjacentLayer({col:3,row:4},-1)).toBe('hold');expect(view.dmAdjacentLayer({col:3,row:4},1)).toBe('main');
    view.setSelectedEntity(null);expect(view.navigationFocus().surfaceId).toBe('lower');
    expect(view.interpolatedWorldPosition(view.navigationFocus()).y).toBe(-3);
  });
  it('shares the same empty interior and ground height with the projector and rejects malformed locations',()=>{
    const dm=renderer();dm.exploreDmCell({col:3,row:4},'hold');dm.resolveCameraFraming(5,{x:5.25,y:-5.2,z:6.75},'__dm_camera__');
    const frame=dm.getSharedCameraFrame();expect(validSharedCameraFrame(frame)).toBe(true);expect(frame.focusId).toBeNull();
    const projector=renderer('projector');projector.sharedCameraFrames.set('wreck-ship',frame);expect(projector.navigationFocus().surfaceId).toBe('hold');expect(projector.interpolatedWorldPosition(projector.navigationFocus()).y).toBe(-6);
    for(const bad of [{...frame.location,point:{x:NaN,y:0,z:0}},{...frame.location,cell:{col:-1,row:4}},{...frame.location,surfaceId:'../private'}])expect(validSharedCameraFrame({...frame,location:bad})).toBe(false);
    const player=renderer('player');player.exploreDmCell({col:3,row:4},'hold');expect(player.dmLocation).toBeNull();
  });
});

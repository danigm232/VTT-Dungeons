import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {preserveRetreatWeatherVisibility,retreatWeatherReserve} from '../../campaigns/stormwreck-isle/public/retreat-weather-visibility';

describe('Retreat saved-weather visibility',()=>{
 it('keeps the complete existing tactical reserve before the fog at every allowed angle and camera distance',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),camera=new ArcRotateCamera('camera',0,0,160,new Vector3(84,18,78),scene);scene.activeCamera=camera;
  for(const tilt of [5,10,15,20,25])for(const yaw of [-30,-15,0,15,30])for(const radius of [40,100,160,600]){
   camera.alpha=Math.PI/2+yaw*Math.PI/180;camera.beta=Math.PI/2-tilt*Math.PI/180;camera.radius=radius;
   preserveRetreatWeatherVisibility(scene,.85);
   expect(scene.fogMode).toBe(3);expect(scene.fogEnd).toBeGreaterThan(scene.fogStart);
   for(const p of retreatWeatherReserve)expect(scene.fogStart).toBeGreaterThan(Vector3.Distance(camera.globalPosition,p));
  }
  scene.dispose();engine.dispose();
 });
 it('retains saved fog strength and colour and makes stronger fog close the background sooner',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);scene.activeCamera=new ArcRotateCamera('camera',0,1,160,Vector3.Zero(),scene);
  scene.fogDensity=.85*.018;scene.fogColor=new Color3(.3,.4,.5);
  preserveRetreatWeatherVisibility(scene,.2);const end=scene.fogEnd,start=scene.fogStart;
  preserveRetreatWeatherVisibility(scene,.85);expect(scene.fogEnd).toBeLessThan(end);expect(scene.fogStart).toBe(start);
  expect(scene.fogDensity).toBe(.85*.018);expect(scene.fogColor.asArray()).toEqual([.3,.4,.5]);scene.dispose();engine.dispose();
 });
 it('leaves clear-weather presentation unchanged and safely ignores an absent camera or invalid density',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);scene.fogMode=2;scene.fogStart=11;scene.fogEnd=22;
  preserveRetreatWeatherVisibility(scene,.85);scene.activeCamera=new ArcRotateCamera('camera',0,1,160,Vector3.Zero(),scene);
  for(const value of [0,NaN,-1])preserveRetreatWeatherVisibility(scene,value);
  expect(scene.fogMode).toBe(2);expect(scene.fogStart).toBe(11);expect(scene.fogEnd).toBe(22);scene.dispose();engine.dispose();
 });
});

import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import type { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { EnvironmentState } from '../shared/protocol.js';
import type { ClimateState } from '../shared/game-time.js';
import { WRECK_CABINS, WRECK_STRUCTURE as S } from '../shared/wreck-structure.js';
import { advanceWeatherSurface } from './weather-surface.js';
import { CampShadows } from '../../campaigns/camp-rests/public/camp-surface-effects.js';

const deposition={wet:0,snow:0,puddles:0,flood:0};
export function wreckWeatherCovered(x:number,z:number,surface='main',height=0) {
  if(['lower-deck','hold-air'].includes(surface))return true;
  if(['c2','c3','crow','sea'].includes(surface)||height>2.55)return false;
  return Object.values(WRECK_CABINS).some(r=>x>=r.minCol*1.5&&x<=(r.maxCol+1)*1.5&&z>=r.minRow*1.5&&z<=(r.maxRow+1)*1.5);
}
class WreckSurfaceWeather extends MaterialPluginBase {
  constructor(material:StandardMaterial,private amount:typeof deposition){super(material,'WreckSurfaceWeather',191,{},true,true);this.doNotSerialize=true;}
  getUniforms(){return {ubo:[{name:'wreckDeposition',size:4,type:'vec4'}],fragment:'#ifndef UNIFORMBUFFERS\nuniform vec4 wreckDeposition;\n#endif'};}
  bindForSubMesh(buffer:UniformBuffer){buffer.updateFloat4('wreckDeposition',this.amount.wet,this.amount.snow,this.amount.puddles,this.amount.flood);}
  getCustomCode(type:string){if(type!=='fragment')return null;
    const shelter=Object.values(WRECK_CABINS).map(r=>`if(vPositionW.y<2.55 && vPositionW.x>${(r.minCol*1.5).toFixed(2)} && vPositionW.x<${((r.maxCol+1)*1.5).toFixed(2)} && vPositionW.z>${(r.minRow*1.5).toFixed(2)} && vPositionW.z<${((r.maxRow+1)*1.5).toFixed(2)}) exposed=0.;`).join('\n');
    const name=this._material.name;
    const timber=/wreck-rebuild:(shell|frames|splinter-oak)|rowboat:salt-worn-hull|wreck-interior:(wet-timber|exposed-grain)|wreck-breach:/.test(name);
    const mineral=/wreck-reef-strata|dragon-remains:(eroded-ivory|salt-cracks|distant-ivory)/.test(name);
    const splash=/rowboat:/.test(name)?.15:mineral?.92:.58;
    const contact=timber||mineral?`{
      float wrack=sin(vPositionW.x*3.9+vPositionW.z*5.1)*sin(vPositionW.x*1.3-vPositionW.z*1.7);
      float tide=vPositionW.y-(${S.seaHeight.toFixed(2)})+wrack*${(splash*.19).toFixed(3)};
      float damp=1.-smoothstep(${(splash*.12).toFixed(3)},${splash.toFixed(3)},tide);
      float salt=(1.-smoothstep(.015,${(splash*.16+.03).toFixed(3)},abs(tide-${(splash*.84).toFixed(3)})))*smoothstep(.1,.8,wrack);
      baseColor.rgb*=mix(vec3(1.),vec3(.61,.76,.75),damp*.82);
      baseColor.rgb+=vec3(.088,.103,.083)*salt*(1.-abs(normalW.y)*.55);
    }`:'';
    return {CUSTOM_FRAGMENT_BEFORE_LIGHTS:`
      ${contact}
      if(wreckDeposition.x!=0. || wreckDeposition.y>0.){
        float exposed=step(-0.10,vPositionW.y); ${shelter}
        baseColor.rgb*=1.-wreckDeposition.x*exposed*.25;
        if(wreckDeposition.y>0.){
          float grain=fract(sin(dot(floor(vPositionW.xz*6.),vec2(12.9898,78.233)))*43758.5453);
          float upward=smoothstep(.24,.78,normalW.y);
          float snow=exposed*upward*clamp(wreckDeposition.y*1.65-grain*.48,0.,1.);
          baseColor.rgb=mix(baseColor.rgb,vec3(.83,.89,.92)/max(diffuseColor,vec3(.08)),snow);
        }
      }
    `};
  }
}
/** Same bounded shadow/deposition systems as camps, without lighting the wreck's
 * abandoned lamps. Interior darkness and authoritative climate remain intact. */
export function createWreckEnvironment(scene:Scene,compact=false){
  const sun=scene.getLightByName('ship-key-light') as DirectionalLight;
  const shadows=new CampShadows(scene,sun,compact,m=>!m.metadata?.nativeBillboard&&!m.metadata?.scenicLayer&&!/actor:|weather:|water|ocean|foam|wake|wash|shimmer|darkness|shadow|weather-decal|algae|bubble|fish|salt-and-rot/i.test(m.name),true,true),amount={...deposition},applied=new Set<StandardMaterial>();
  // Material construction can notify before subclass initialization finishes.
  // Queue additions and prepare them on the next update, rather than scanning
  // every scene material on every frame or patching half-constructed objects.
  const pending=[...scene.materials];
  const added=scene.onNewMaterialAddedObservable.add(material=>pending.push(material));
  scene.onDisposeObservable.addOnce(()=>{scene.onNewMaterialAddedObservable.remove(added);pending.length=0;applied.clear();});
  function prepare(){for(const material of pending)if(material instanceof StandardMaterial&&!applied.has(material)&&!material.disableLighting&&!/water|ocean|sea|shimmer|darkness|contact|foam|shadow/i.test(material.name)&&scene.materials.includes(material)){
    new WreckSurfaceWeather(material,amount);applied.add(material);
  }pending.length=0;}
  prepare();
  return {amount,shadows,prepare,update(time:number,seconds:number,environment:EnvironmentState,climate:ClimateState|undefined,focus:Vector3,sources:PointLight[],animating=false){
    if(climate)Object.assign(amount,{wet:climate.wetness,snow:climate.snowCoverage,puddles:climate.puddleCoverage,flood:climate.floodLevel});
    else Object.assign(amount,advanceWeatherSurface(amount.wet,amount.snow,environment.precipitation??(environment.storm?'rain':'none'),(environment.precipitationLevel??2)/3,seconds));
    Object.assign(deposition,amount);prepare();shadows.update(time,sources,focus,animating);
    scene.metadata={...scene.metadata,wreckClimate:{...amount}};
  }};
}

import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import type { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { EnvironmentState } from '../shared/protocol.js';
import type { ClimateState } from '../shared/game-time.js';
import { WRECK_CABINS } from '../shared/wreck-structure.js';
import { advanceWeatherSurface } from './weather-surface.js';
import { CampShadows } from '../../campaigns/camp-rests/public/camp-surface-effects.js';

const deposition={wet:0,snow:0,puddles:0,flood:0};
export function wreckWeatherCovered(x:number,z:number,surface='main',height=0) {
  if(['lower-deck','hold-air'].includes(surface))return true;
  if(['c2','c3','crow','sea'].includes(surface)||height>2.55)return false;
  return Object.values(WRECK_CABINS).some(r=>x>=r.minCol*1.5&&x<=(r.maxCol+1)*1.5&&z>=r.minRow*1.5&&z<=(r.maxRow+1)*1.5);
}
class WreckSurfaceWeather extends MaterialPluginBase {
  constructor(material:StandardMaterial,private amount:typeof deposition){super(material,'WreckSurfaceWeather',191,{},true,true);}
  getUniforms(){return {ubo:[{name:'wreckDeposition',size:4,type:'vec4'}],fragment:'#ifndef UNIFORMBUFFERS\nuniform vec4 wreckDeposition;\n#endif'};}
  bindForSubMesh(buffer:UniformBuffer){buffer.updateFloat4('wreckDeposition',this.amount.wet,this.amount.snow,this.amount.puddles,this.amount.flood);}
  getCustomCode(type:string){if(type!=='fragment')return null;
    const shelter=Object.values(WRECK_CABINS).map(r=>`if(vPositionW.y<2.55 && vPositionW.x>${(r.minCol*1.5).toFixed(2)} && vPositionW.x<${((r.maxCol+1)*1.5).toFixed(2)} && vPositionW.z>${(r.minRow*1.5).toFixed(2)} && vPositionW.z<${((r.maxRow+1)*1.5).toFixed(2)}) exposed=0.;`).join('\n');
    return {CUSTOM_FRAGMENT_BEFORE_LIGHTS:`
      float exposed=step(-0.10,vPositionW.y); ${shelter}
      float grain=fract(sin(dot(floor(vPositionW.xz*6.),vec2(12.9898,78.233)))*43758.5453);
      float upward=smoothstep(.24,.78,normalW.y);
      float snow=exposed*upward*clamp(wreckDeposition.y*1.65-grain*.48,0.,1.);
      baseColor.rgb*=1.-wreckDeposition.x*exposed*.25;
      baseColor.rgb=mix(baseColor.rgb,vec3(.83,.89,.92)/max(diffuseColor,vec3(.08)),snow);
    `};
  }
}
/** Same bounded shadow/deposition systems as camps, without lighting the wreck's
 * abandoned lamps. Interior darkness and authoritative climate remain intact. */
export function createWreckEnvironment(scene:Scene,compact=false){
  const sun=scene.getLightByName('ship-key-light') as DirectionalLight;
  const shadows=new CampShadows(scene,sun,compact,m=>!m.metadata?.nativeBillboard&&!/actor:|weather:|water|ocean|foam|wake|wash|shimmer|darkness|shadow|weather-decal|algae|bubble|fish|salt-and-rot/i.test(m.name),true),amount={...deposition},applied=new Set<StandardMaterial>();
  function prepare(){for(const material of scene.materials)if(material instanceof StandardMaterial&&!applied.has(material)&&!material.disableLighting&&!/water|ocean|sea|shimmer|darkness|contact|foam|shadow/i.test(material.name)){
    new WreckSurfaceWeather(material,amount);applied.add(material);
  }}
  prepare();
  return {amount,shadows,update(time:number,seconds:number,environment:EnvironmentState,climate:ClimateState|undefined,focus:Vector3,sources:PointLight[],animating=false){
    if(climate)Object.assign(amount,{wet:climate.wetness,snow:climate.snowCoverage,puddles:climate.puddleCoverage,flood:climate.floodLevel});
    else Object.assign(amount,advanceWeatherSurface(amount.wet,amount.snow,environment.precipitation??(environment.storm?'rain':'none'),(environment.precipitationLevel??2)/3,seconds));
    Object.assign(deposition,amount);prepare();shadows.update(time,sources,focus,animating);
    scene.metadata={...scene.metadata,wreckClimate:{...amount}};
  }};
}

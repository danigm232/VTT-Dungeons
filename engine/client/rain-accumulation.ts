import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { PublicSceneDefinition } from '../shared/campaign.js';
import type { ClimateState } from '../shared/game-time.js';
import { WRECK_CABINS } from '../shared/wreck-structure.js';
import { A1_ROOMS } from '../../campaigns/camp-rests/public/a1-layout.js';

type Amount={wet:number;puddles:number;snow:number;time:number;rain:number};
type Cover=(x:number,z:number,y?:number)=>boolean;
/** Continuous world-space pools, not a water rectangle or per-tile mosaic.
 * Pigment, ripples and grazing-angle sheen use existing lighting/shadows;
 * this layer never emits light, alters navigation, or fills sheltered rooms. */
class RainSurfacePlugin extends MaterialPluginBase {
  constructor(material:StandardMaterial,private amount:Amount,private shelter:string,private snowEnabled=false,private skipZeroPools=false){super(material,'RainAccumulation',195,{},true,true);this.doNotSerialize=true;}
  getUniforms(){return {ubo:[{name:'rainSurface',size:4,type:'vec4'},{name:'rainFall',size:1,type:'float'}],fragment:'#ifndef UNIFORMBUFFERS\nuniform vec4 rainSurface;\nuniform float rainFall;\n#endif'};}
  bindForSubMesh(buffer:UniformBuffer){
    // Material-wide data only. Rewriting a shared UBO for every submesh/face
    // can stall WebGL on each upload (especially six point-shadow faces).
    buffer.updateFloat4('rainSurface',this.amount.wet,this.amount.puddles,this.amount.snow,this.amount.time);
    buffer.updateFloat('rainFall',this.amount.rain);
  }
  getCustomCode(type:string){if(type!=='fragment')return null;
    const whenContributing=(test:string)=>this.skipZeroPools?`if(${test}){`:'';
    const endContribution=this.skipZeroPools?'}':'';
    return {CUSTOM_FRAGMENT_DEFINITIONS:`
      float rainHash(vec2 p){vec3 h=fract(vec3(p.xyx)*.1031);h+=dot(h,h.yzx+33.33);return fract((h.x+h.y)*h.z);}
      float rainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rainHash(i),rainHash(i+vec2(1.,0.)),f.x),mix(rainHash(i+vec2(0.,1.)),rainHash(i+1.),f.x),f.y);}
    `,CUSTOM_FRAGMENT_BEFORE_FOG:`
      #ifdef NORMAL
      ${this.snowEnabled ? `
      if(rainSurface.z>.001){
        float rainExposure=1.; ${this.shelter??''}
        float snowTop=smoothstep(.25,.8,normalize(vNormalW).y);
        float snowGrain=rainNoise(vPositionW.xz*4.0);
        float snowCover=smoothstep(snowGrain*.42,snowGrain*.42+.12,rainSurface.z)*snowTop*rainExposure;
        float snowLight=max(.04,dot(color.rgb,vec3(.2126,.7152,.0722)));
        color.rgb=mix(color.rgb,vec3(.86,.93,.98)*min(1.,sqrt(snowLight)*1.25),snowCover);
      }` : ''}
      if((rainSurface.x>.001 || rainSurface.y>.001) && rainSurface.z<.999){
      float rainExposure=1.; ${this.shelter??''}
      ${whenContributing('rainExposure>0.')}
      vec3 rainNormal=normalize(vNormalW);
      float rainTop=smoothstep(.75,.97,rainNormal.y);
      float rainFresnel=pow(1.-max(0.,dot(rainNormal,viewDirectionW)),3.);
      float rainLit=clamp(dot(color.rgb,vec3(.2126,.7152,.0722)),0.,1.);
      // The pool and ripples contribute zero on sheltered or steep surfaces.
      ${whenContributing('rainTop>0.')}
      float rainBasin=rainNoise(vPositionW.xz*.74)*.72+rainNoise(vPositionW.xz*2.35)*.28;
      float rainPool=(1.-smoothstep(rainSurface.y*.58-.045,rainSurface.y*.58+.045,rainBasin))*rainTop*rainExposure*(1.-rainSurface.z);
      ${whenContributing('rainPool>0.')}
      vec2 rainCell=floor(vPositionW.xz/1.7),rainCenter=(rainCell+vec2(rainHash(rainCell),rainHash(rainCell+37.)))*1.7;
      float rainDistance=length(vPositionW.xz-rainCenter),rainPhase=fract(rainSurface.w*.65+rainHash(rainCell+11.));
      float rainRing=(1.-smoothstep(.016,.053,abs(rainDistance-rainPhase*.75)))*(1.-rainPhase)*rainFall;
      vec3 rainWater=color.rgb*vec3(.34,.49,.55)+vec3(.16,.30,.36)*sqrt(rainLit)*(.35+rainFresnel*.65+rainRing*.9);
      color.rgb=mix(color.rgb,rainWater,rainPool*.88);
      ${endContribution}
      ${endContribution}
      // Damp objects acquire restrained light-dependent varnish even where
      // sloping/vertical surfaces cannot retain a standing pool.
      color.rgb+=rainExposure*rainSurface.x*(1.-rainSurface.z)*rainFresnel*rainLit*.045;
      ${endContribution}
      }
      #endif
    `};
  }
}
export class RainAccumulation {
  readonly amount:Amount={wet:0,puddles:0,snow:0,time:0,rain:0};
  private applied=new Set<StandardMaterial>();
  constructor(private scene:Scene,private definition:PublicSceneDefinition){}
  update(time:number,climate:ClimateState,rain:number,covered?:Cover){
    Object.assign(this.amount,{time:rain>0?time:0,wet:climate.wetness,puddles:climate.puddleCoverage,snow:climate.snowCoverage,rain});
    this.prepare();
    this.scene.metadata={...this.scene.metadata,rainAccumulation:{...this.amount,materials:this.applied.size}};
  }
  /** New material variants must receive the live climate plugin before their
   * first draw. Its campaign state cannot be serialized into a generic clone. */
  prepare(){
    for(const material of this.scene.materials)if(material instanceof StandardMaterial&&!this.applied.has(material)&&!material.disableLighting&&!/water|ocean|sea|shimmer|darkness|contact|foam|shadow|flame|glow|ember|bubble/i.test(material.name)){
      let shelter=rainShelterCode(this.scene,this.definition);
      if(this.definition.id==='wreck-ship'&&/rowboat/i.test(material.name))shelter=shelter.replace('vPositionW.y<-.20','vPositionW.y<-3.05');
      const wreck=this.definition.id==='wreck-ship';
      new RainSurfacePlugin(material,this.amount,shelter,Boolean(this.definition.terrain&&!this.definition.camp&&!wreck&&!this.scene.metadata?.d8Vtt),wreck);this.applied.add(material);
    }
  }
}
/** Fragment-level shelter is necessary for large shared floors: classifying
 * their centre would dry the whole exterior or flood the whole interior. */
export function rainShelterCode(scene:Scene,definition:PublicSceneDefinition){
  const rect=(x0:number,x1:number,z0:number,z1:number,y:number)=>`if(vPositionW.y<${y.toFixed(3)} && vPositionW.x>${x0.toFixed(3)} && vPositionW.x<${x1.toFixed(3)} && vPositionW.z>${z0.toFixed(3)} && vPositionW.z<${z1.toFixed(3)}) rainExposure=0.;`;
  if(definition.id==='wreck-ship')return 'if(vPositionW.y<-.20) rainExposure=0.;\n'+Object.values(WRECK_CABINS).map(r=>rect(r.minCol*1.5,(r.maxCol+1)*1.5,r.minRow*1.5,(r.maxRow+1)*1.5,2.55)).join('\n');
  if(definition.id==='mirror')return 'rainExposure=0.;';
  if(definition.camp?.visualProfile==='rooms')return A1_ROOMS.flatMap(room=>{
    const body=room.cells.filter(c=>c.col!==room.entry.col||c.row!==room.entry.row);
    return [rect(Math.min(...body.map(c=>c.col))*1.5,(Math.max(...body.map(c=>c.col))+1)*1.5,Math.min(...body.map(c=>c.row))*1.5,(Math.max(...body.map(c=>c.row))+1)*1.5,3),rect(room.entry.col*1.5,(room.entry.col+1)*1.5,room.entry.row*1.5,(room.entry.row+1)*1.5,3)];
  }).join('\n');
  if(definition.camp)return definition.camp.interactionPoints.filter(p=>p.kind==='tent'&&p.objectCell).map(p=>{const x=(p.objectCell!.col+.5)*1.5,z=(p.objectCell!.row+.5)*1.5;return `if(abs(vPositionW.x-${x})<3.35 && abs(vPositionW.z-${z})<3.35 && vPositionW.y<2.35-abs(vPositionW.x-${x})*.74) rainExposure=0.;`;}).join('\n');
  return scene.meshes.filter(m=>m.metadata?.interiorRoof).slice(0,32).map(m=>{
    const r=m.metadata.interiorRoof;m.computeWorldMatrix(true);const y=m.getBoundingInfo().boundingBox.minimumWorld.y-.05;
    if(![r.x,r.z,y].every(Number.isFinite))return '';
    return r.radius?`if(vPositionW.y<${y.toFixed(3)} && distance(vPositionW.xz,vec2(${Number(r.x).toFixed(3)},${Number(r.z).toFixed(3)}))<${Number(r.radius).toFixed(3)}) rainExposure=0.;`:rect(r.x-r.w/2,r.x+r.w/2,r.z-r.d/2,r.z+r.d/2,y);
  }).join('\n');
}

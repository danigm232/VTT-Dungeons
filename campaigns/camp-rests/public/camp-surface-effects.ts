import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import type { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { EnvironmentState } from '../../../engine/shared/protocol.js';
import type { ClimateState } from '../../../engine/shared/game-time.js';
import { advanceWeatherSurface } from '../../../engine/client/weather-surface.js';
import { A1_ROOMS } from './a1-layout.js';

const deposition = new Map<string, { wet: number; snow: number; puddles: number; flood: number }>();
/** These predicates also keep precipitation out of the same physical roofs. */
export function campCovered(definition: PublicSceneDefinition, x: number, z: number) {
  if (definition.camp?.visualProfile === 'rooms') return A1_ROOMS.some(r => r.cells.some(c => x >= c.col * 1.5 && x <= (c.col + 1) * 1.5 && z >= c.row * 1.5 && z <= (c.row + 1) * 1.5));
  return definition.camp?.interactionPoints.some(p => p.kind === 'tent' && p.objectCell && Math.abs(x - (p.objectCell.col + .5) * 1.5) <= 3.35 && Math.abs(z - (p.objectCell.row + .5) * 1.5) <= 3.35) ?? false;
}

class CampSurfacePlugin extends MaterialPluginBase {
  constructor(material: StandardMaterial, private amount: { wet: number; snow: number; puddles: number; flood: number }, private cover: string) { super(material, 'CampSurfaceWeather', 190, {}, true, true); }
  getUniforms() { return { ubo: [{ name: 'campDeposition', size: 4, type: 'vec4' }], fragment: '#ifndef UNIFORMBUFFERS\nuniform vec4 campDeposition;\n#endif' }; }
  bindForSubMesh(buffer: UniformBuffer) { buffer.updateFloat4('campDeposition', this.amount.wet, this.amount.snow, this.amount.puddles, this.amount.flood); }
  getCustomCode(type: string) {
    if (type !== 'fragment') return null;
    return { CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
      float campExposure = 1.0;
      ${this.cover}
      float campGrain = fract(sin(dot(floor(vPositionW.xz*5.0),vec2(12.9898,78.233)))*43758.5453);
      float campTop = smoothstep(0.20,0.72,normalW.y);
      float campSnow = campExposure*campTop*clamp(campDeposition.y*1.6-campGrain*0.48,0.0,1.0);
      float campLow = 1.0-smoothstep(0.04,0.18,vPositionW.y);
      float campWater = campExposure*campTop*campLow*clamp(max(campDeposition.z,campDeposition.w)-campGrain*0.5,0.0,1.0);
      baseColor.rgb = mix(baseColor.rgb*(1.0-campDeposition.x*campExposure*0.22),vec3(0.86,0.93,0.98)/max(diffuseColor,vec3(0.08)),campSnow);
      baseColor.rgb = mix(baseColor.rgb,vec3(0.10,0.29,0.34),campWater*0.34);
    ` };
  }
}

/** A single bounded shader layer per existing material; no extra draw pass. */
export function createCampSurfaceEffects(scene: Scene, definition: PublicSceneDefinition) {
  const amount = { ...(deposition.get(definition.id) ?? { wet: 0, snow: 0, puddles: 0, flood: 0 }) };
  let cover = '';
  if (definition.camp!.visualProfile === 'rooms') for (const room of A1_ROOMS) {
    const body=room.cells.filter(c=>c.col!==room.entry.col||c.row!==room.entry.row);
    const rects=[{x0:Math.min(...body.map(c=>c.col))*1.5,x1:(Math.max(...body.map(c=>c.col))+1)*1.5,z0:Math.min(...body.map(c=>c.row))*1.5,z1:(Math.max(...body.map(c=>c.row))+1)*1.5},{x0:room.entry.col*1.5,x1:(room.entry.col+1)*1.5,z0:room.entry.row*1.5,z1:(room.entry.row+1)*1.5}];
    for(const r of rects)cover += `if(vPositionW.x>=${r.x0.toFixed(2)} && vPositionW.x<=${r.x1.toFixed(2)} && vPositionW.z>=${r.z0.toFixed(2)} && vPositionW.z<=${r.z1.toFixed(2)} && vPositionW.y<3.0) campExposure=0.0;\n`;
  }
  else for (const p of definition.camp!.interactionPoints.filter(p => p.kind === 'tent')) {
    const x = (p.objectCell!.col+.5)*1.5, z = (p.objectCell!.row+.5)*1.5;
    // Leave the sagging canvas above the sheltered volume: its lowest folds
    // must receive snow as well as the ridge and stitched edges.
    cover += `if(abs(vPositionW.x-${x.toFixed(2)})<3.35 && abs(vPositionW.z-${z.toFixed(2)})<3.35 && vPositionW.y<2.35-abs(vPositionW.x-${x.toFixed(2)})*0.74) campExposure=0.0;\n`;
  }
  const applied = new Set<StandardMaterial>();
  function prepare() {
    for (const material of scene.materials) if (material instanceof StandardMaterial && !applied.has(material) && !material.disableLighting && !/water|sea|ocean|stream|flame|ember|coal-heat|glow|halo|aurora|crystal|contact|bounce/i.test(material.name)) {
      new CampSurfacePlugin(material, amount, cover); applied.add(material);
    }
  }
  prepare();
  return { amount, covered: (x: number,z: number) => campCovered(definition,x,z), update(seconds: number, environment?: EnvironmentState, climate?: ClimateState) {
    if (climate) Object.assign(amount, { wet: climate.wetness, snow: climate.snowCoverage, puddles: climate.puddleCoverage, flood: climate.floodLevel });
    else {
      const kind = environment?.precipitation ?? (environment?.storm ? 'rain' : 'none');
      Object.assign(amount, advanceWeatherSurface(amount.wet,amount.snow,kind,(environment?.precipitationLevel??2)/3,seconds));
    }
    deposition.set(definition.id,{...amount}); prepare();
  }};
}

/** Charcoal pieces and hot fissures remain visible after the flame subsides. */
export function createCampCoals(scene: Scene, root: TransformNode, at: Vector3, radius = .65) {
  const ash = new StandardMaterial('camp:coal-ash',scene), heat = new StandardMaterial('camp:coal-heat',scene);
  ash.diffuseColor=Color3.FromHexString('#25211e');ash.specularColor=Color3.Black();
  heat.diffuseColor=Color3.FromHexString('#802719');heat.specularColor=Color3.Black();
  const parts:Mesh[]=[];
  for(let i=0;i<16;i++){
    const a=i*2.399,r=radius*Math.sqrt((i+.5)/16),x=at.x+Math.cos(a)*r,z=at.z+Math.sin(a)*r;
    const coal=MeshBuilder.CreateSphere('camp:charcoal',{diameter:radius*.32,segments:5},scene);coal.position.set(x,at.y+.08,z);coal.scaling.set(1,.38,.75);coal.material=ash;parts.push(coal);
    const crack=MeshBuilder.CreateBox('camp:hot-fissure',{width:radius*.2,height:.012,depth:radius*.045},scene);crack.position.set(x,at.y+.12,z);crack.rotation.y=a;crack.material=heat;parts.push(crack);
  }
  const mesh=Mesh.MergeMeshes(parts,true,true,undefined,false,true)!;mesh.name='camp:coal-bed';mesh.parent=root;mesh.isPickable=false;mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};
  return { mesh, update(time:number, strength:number) { heat.emissiveColor=Color3.FromHexString('#f74d15').scale(strength*(.55+.1*Math.sin(time*3.1)));heat.diffuseColor=Color3.FromHexString(strength>.05?'#802719':'#29211e'); } };
}

/** Sun/moon plus the nearest active warm source. Includes every real prop. */
const lightTargets = new WeakMap<PointLight, PointLight['includedOnlyMeshes']>();
export function includeCampActors(light: PointLight, belongs: (mesh: Mesh)=>boolean, scene: Scene) {
  let scenery = lightTargets.get(light);
  if (!scenery) { scenery = light.includedOnlyMeshes.filter(m=>!m.metadata?.nativeBillboard); lightTargets.set(light,scenery); }
  light.includedOnlyMeshes = [...scenery,...scene.meshes.filter((m):m is Mesh=>m instanceof Mesh && m.metadata?.nativeBillboard && belongs(m))];
}

export class CampShadows {
  private sunMap?: ShadowGenerator;
  private localMap?: ShadowGenerator;
  private localLight?: PointLight;
  private meshes: Mesh[] = [];
  private meshCount = -1;
  private lastRefresh = -Infinity;
  private shadowFocus?: Vector3;
  constructor(private scene: Scene, private sun: DirectionalLight, private compact: boolean,
    private accepts?: (mesh: Mesh) => boolean, private economicalFilters=false) {
    // Camera far planes cover distant scenery. A shadow map needs only the
    // diorama's depth; using 10 km here erased small furniture shadows.
    sun.shadowMinZ=.1;sun.shadowMaxZ=110;
    if(typeof window!=='undefined')this.sunMap=this.map(sun,compact?512:1024);
    this.prepare();scene.onDisposeObservable.addOnce(()=>{this.sunMap?.dispose();this.localMap?.dispose();});
  }
  private map(light: DirectionalLight|PointLight,size:number) {
    const map=new ShadowGenerator(size,light);map.bias=light===this.sun?.0015:.005;map.normalBias=light===this.sun?.04:.08;map.forceBackFacesOnly=false;map.getShadowMap()!.refreshRate=0;map.setDarkness(.08);
    // Cube maps near low flames need a depth offset large enough to avoid
    // self-shadow stripes on the ground and thin cloth at the compact size.
    if(this.economicalFilters){
      // Wreck point lights already render six faces. Single-sample crisp
      // torch shadows avoid adding Poisson's many reads to every fragment.
      // Daylight retains hardware PCF (Babylon handles WebGL1 fallback).
      if(light===this.sun){map.usePercentageCloserFiltering=true;map.filteringQuality=ShadowGenerator.QUALITY_LOW;}
    }else{
      if(this.compact)map.usePoissonSampling=true;
      if(!this.compact){map.usePercentageCloserFiltering=true;map.filteringQuality=ShadowGenerator.QUALITY_LOW;}
    }
    return map;
  }
  private prepare() {
    this.meshCount=this.scene.meshes.length;
    this.meshes=this.scene.meshes.filter((m):m is Mesh=>m instanceof Mesh && (this.accepts ? this.accepts(m) : !/^actor:|weather:|halo|contact|bounce|flame|embers|coal-bed|ripple|aurora|cloud|ocean|sea-|stream|surf|water|wind|ambient-life/i.test(m.name)));
    for(const m of this.meshes){m.receiveShadows=true;m.computeWorldMatrix(true);}
    if(this.sunMap){this.sunMap.getShadowMap()!.renderList=[];for(const m of this.meshes)if(!/terrain-batch|continuous-ground|organic-ground|groundsheet|carpet/i.test(m.name))this.sunMap.addShadowCaster(m,false);}
  }
  invalidate() { this.sunMap?.getShadowMap()?.resetRefreshCounter();this.localMap?.getShadowMap()?.resetRefreshCounter(); }
  update(time:number, sources:PointLight[],focus:Vector3,animating=false) {
    if(!this.shadowFocus||Vector3.DistanceSquared(focus,this.shadowFocus)>9){
      this.shadowFocus=focus.clone();this.sun.position.copyFrom(focus.subtract(this.sun.direction.normalizeToNew().scale(45)));this.invalidate();
    }
    if(this.meshCount!==this.scene.meshes.length){this.prepare();this.invalidate();}
    const light=sources.filter(l=>l.intensity>.02 && Vector3.Distance(l.position,focus)<l.range+1).sort((a,b)=>Vector3.DistanceSquared(a.position,focus)-Vector3.DistanceSquared(b.position,focus))[0];
    if(light!==this.localLight){this.localMap?.dispose();this.localMap=undefined;this.localLight=light;
      if(light && typeof window!=='undefined'){light.shadowMinZ=.08;light.shadowMaxZ=light.range;this.localMap=this.map(light,this.compact?192:384);}
      this.invalidate();
    }
    if(this.localMap && light){this.localMap.getShadowMap()!.renderList=this.meshes.filter(m=>m.isVisible && m.isEnabled() && (!light.includedOnlyMeshes.length||light.includedOnlyMeshes.includes(m)) && Vector3.Distance(m.getBoundingInfo().boundingBox.centerWorld,light.position)<light.range+7);}
    // Moving wildlife and opened cloth need to update their real silhouettes too.
    if(time-this.lastRefresh>(animating?1/6:.5)){this.lastRefresh=time;this.invalidate();}
  }
}

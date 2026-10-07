import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { EnvironmentState } from '../shared/protocol';

export function weatherParticleBudget(level: number) { return [0,64,128,192][Math.max(0,Math.min(3,Math.round(level)))]!; }
/** Bounded world-space precipitation. One geometry per type, shared instances;
 * no rules, damage or alternate game state. Usable by every Babylon campaign. */
export class WorldWeather {
  private rain; private snow; private drops:InstancedMesh[]=[]; private flakes:InstancedMesh[]=[]; private elapsed=0;
  private offsets=Array.from({length:192},(_,i)=>[127.1,311.7,74.7].map(seed=>{const n=Math.sin((i+1)*seed+23.17)*43758.5453;return n-Math.floor(n);}));
  constructor(private scene: Scene) {
    const paint=(name:string,color:Color3)=>{const m=new StandardMaterial(name,scene);m.disableLighting=true;m.emissiveColor=color;m.specularColor=Color3.Black();return m;};
    this.rain=MeshBuilder.CreateBox('weather:rain',{width:.035,height:.60,depth:.035},scene);
    this.snow=MeshBuilder.CreateSphere('weather:snow',{diameter:.065,segments:3},scene);
    this.rain.material=paint('weather:rain:paint',new Color3(.64,.78,.90));this.rain.material.alpha=.65;
    this.snow.material=paint('weather:snow:paint',new Color3(.85,.94,1));
    for(const mesh of [this.rain,this.snow]){mesh.isVisible=false;mesh.isPickable=false;mesh.metadata={tokenOccluder:false};scene.getGlowLayerByName?.('glow')?.addExcludedMesh(mesh);}
  }
  update(environment: EnvironmentState, focus: Vector3, indoor: boolean, deltaMs: number, coverageMeters=24, covered?: (x:number,z:number)=>boolean) {
    this.elapsed+=Math.min(deltaMs,100)/1000;
    const kind=environment.precipitation??(environment.storm?'rain':'none'), budget=indoor&&!covered?0:weatherParticleBudget(kind==='none'?0:environment.precipitationLevel??2);
    const particles=kind==='snow'?this.flakes:this.drops,base=kind==='snow'?this.snow:this.rain;
    while(particles.length<budget){const mesh=base.createInstance(`weather:${kind==='snow'?'flake':'drop'}:${particles.length}`);mesh.isPickable=false;mesh.metadata={tokenOccluder:false};particles.push(mesh);}
    const wind=environment.windIntensity??(environment.storm ? .7 : 0), t=this.elapsed,span=Math.max(12,Math.min(100,coverageMeters)),visualScale=Math.max(1,span/24);
    for(let i=0;i<Math.max(this.drops.length,this.flakes.length);i++){
      const drop=this.drops[i],flake=this.flakes[i];if(drop)drop.isVisible=kind==='rain'&&i<budget;if(flake)flake.isVisible=kind==='snow'&&i<budget;
      if(i>=budget)continue;
      const offset=this.offsets[i]!;
      const x=((offset[0]!*span+t*wind*2)%span)-span/2,z=((offset[1]!*span+t*wind*.7)%span)-span/2;
      const y=10-((offset[2]!*10+t*(kind==='rain'?12:1.2))%10);
      const mesh=(kind==='snow'?flake:drop)!;mesh.position.set(focus.x+x,focus.y+y,focus.z+z);mesh.rotation.z=kind==='rain'?-.12-wind*.35:0;
      mesh.scaling.setAll(visualScale*(kind==='snow'?.7+Math.sin(i)*.25:1));
      if(kind==='snow')mesh.position.x+=Math.sin(t*.8+i)*.4;
      if(covered?.(mesh.position.x,mesh.position.z))mesh.isVisible=false;
    }
  }
  dispose(){for(const mesh of [...this.drops,...this.flakes])mesh.dispose();for(const mesh of [this.rain,this.snow]){mesh.material?.dispose();mesh.dispose();}}
}

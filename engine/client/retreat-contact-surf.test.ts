import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {retreatWaterHeight,traceRetreatWaterline,installRetreatContactSurf} from '../../campaigns/stormwreck-isle/public/retreat-contact-surf.js';
import {refineRetreatLighting} from '../../campaigns/stormwreck-isle/public/retreat-refinement-lighting.js';
import {Light} from '@babylonjs/core/Lights/light.js';
describe('Retreat L1 contact surf',()=>{
 it('keeps the same two room fills and their restricted meshes, with consistent falloff across near and distant materials',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),table=MeshBuilder.CreateBox('dining table',{},scene);table.metadata={retreatZone:'a3'};const outside=MeshBuilder.CreateBox('outside original cell',{},scene);const controller=refineRetreatLighting(scene,true,5,true),fill=scene.getLightByName('retreat:existing-interior-fill:a3')!;
  expect(scene.lights.length).toBe(2);expect(fill.falloffType).toBe(Light.FALLOFF_STANDARD);expect(fill.includedOnlyMeshes).toContain(table);expect(fill.includedOnlyMeshes).not.toContain(outside);expect(fill.intensity).toBe(.36);expect(controller.stats.newShadowMaps).toBe(0);expect(controller.stats.additionalPolishLights).toBe(0);engine.dispose();
 });
 it('samples the native water grid after its existing world translation and wave update',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),root=new TransformNode('A1 translation',scene);root.position.set(72,9,72);const sea=MeshBuilder.CreateGround('sea',{width:20,height:20,subdivisions:4,updatable:true},scene);sea.parent=root;sea.position.y=-9.15;const p=sea.getVerticesData('position')!;for(let i=0;i<p.length;i+=3)p[i+1]=p[i]!*.01+p[i+2]!*.02;sea.updateVerticesData('position',p);
  expect(retreatWaterHeight(sea,74,75)).toBeCloseTo(-.15+.02+.06);for(let i=1;i<p.length;i+=3)p[i]=.23;sea.updateVerticesData('position',p);expect(retreatWaterHeight(sea,74,75)).toBeCloseTo(.08);engine.dispose();
 });
 it('traces the real rock contact and reuses existing foam without adding colliders, lights or textures',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),rock=MeshBuilder.CreateBox('coastal rock',{width:10,height:5,depth:2},scene);rock.position.set(6,0,100);rock.metadata={stoneStage:3};rock.computeWorldMatrix(true);const points=traceRetreatWaterline(scene,m=>m===rock,2,10);expect(points.length).toBe(5);expect(points.every(p=>Math.abs(p.point.z-101)<.001&&p.out.z>.99)).toBe(true);
  const sea=MeshBuilder.CreateGround('sea',{width:360,height:360,subdivisions:4,updatable:true},scene);const material=new StandardMaterial('a1:shore-wash-v2',scene),textures=scene.textures.length,lights=scene.lights.length;const surf=installRetreatContactSurf(scene,sea)!;expect(surf).toBeTruthy();expect(surf.mesh.material).toBe(material);expect(surf.mesh.isPickable).toBe(false);expect(surf.mesh.checkCollisions).toBe(false);expect(surf.mesh.metadata.tokenOccluder).toBe(false);expect(scene.textures.length).toBe(textures);expect(scene.lights.length).toBe(lights);expect(surf.stats.maxWidth).toBe(1.35);engine.dispose();
 });
});

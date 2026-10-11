import { describe, it, expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { animateInteractionPart, interactionContact, interactionParts, interactionTiming, registerInteractionPart, restoreInteractionPart } from './interaction-animation';
import { interactionActorVertex } from './interaction-actor-pose';
import { WorldBillboards, type BillboardFrame } from './world-billboards';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { activitiesForCampPoint } from '../shared/camp-activities';
import { publicCampaignSchema } from '../shared/campaign';

describe('reusable paired interaction animation', () => {
  it('takes an existing fuel log from its pile and deposits it at the hearth',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),parent=new TransformNode('woodpile',scene);
    parent.position.set(7,0,5);parent.rotation.y=.5;parent.computeWorldMatrix(true);
    const log=MeshBuilder.CreateBox('spare-log',{size:.2},scene);log.parent=parent;log.position.set(-1,.2,1);
    const contact=new Vector3(7,.32,5),hand=new Vector3(6.8,.9,5.3);
    registerInteractionPart(scene,'hearth','fuel-log',log,{contact});const part=interactionParts(scene,'hearth')[0]!;
    animateInteractionPart(part,'tend-fire',interactionTiming(1500,5000),hand);log.computeWorldMatrix(true);
    expect(Vector3.Distance(log.getAbsolutePosition(),hand)).toBeLessThan(1e-6);
    animateInteractionPart(part,'tend-fire',interactionTiming(3500,5000),hand);log.computeWorldMatrix(true);
    expect(Vector3.Distance(log.getAbsolutePosition(),contact)).toBeLessThan(1e-6);
    restoreInteractionPart(part);expect(log.position).toEqual(part.position);
    expect(scene.meshes).toHaveLength(1);scene.dispose();engine.dispose();
  });
  it('lets a future map select activities without depending on the old roster IDs',()=>{
    expect(activitiesForCampPoint({kind:'personal',ownerCharacterId:'future-wizard',activities:['study','inspect','study']}).map(a=>a.id)).toEqual(['study','inspect']);
  });
  it('rejects authoring overrides that would apply seat/chest mutations to a different kind of object',()=>{
    const schema=publicCampaignSchema.shape.scenes.element.shape.camp.unwrap().shape.interactionPoints.element;
    const point={id:'future-point',label:'Libro',kind:'personal',cell:{col:1,row:1},surfaceId:'ground',description:'Libro de otro mapa.'};
    expect(schema.safeParse({...point,activities:['study','inspect']}).success).toBe(true);
    expect(schema.safeParse({...point,activities:['sit']}).success).toBe(false);
    expect(schema.safeParse({...point,activities:['chest-toggle']}).success).toBe(false);
  });
  it('has matching approach/contact/release without pop or replay outside its interval', () => {
    expect(interactionTiming(-1,5000).active).toBe(false);
    expect(interactionTiming(0,5000)).toMatchObject({reach:0,work:0,active:true});
    expect(interactionTiming(1500,5000)).toMatchObject({reach:1,work:1});
    expect(interactionTiming(5000,5000)).toMatchObject({reach:0,work:0,active:false});
  });
  it('reuses page animation in an unrelated future map with scaled, rotated furniture', () => {
    const engine=new NullEngine(),scene=new Scene(engine),table=new TransformNode('future-table',scene);
    table.position.set(7,2,9);table.scaling.setAll(2);table.rotation.y=.8;
    const page=MeshBuilder.CreateBox('not-a-camp-name',{width:.8,height:.015,depth:.5},scene);page.parent=table;page.position.y=.8;
    registerInteractionPart(scene,'future-library','page',page);
    const part=interactionParts(scene,'future-library')[0]!,base=page.getVerticesData('position')!.slice();
    const contact=interactionContact(scene,'future-library','study')!;
    expect(contact.y).toBeCloseTo(3.6);expect(contact.x).toBe(7);expect(contact.z).toBe(9);
    animateInteractionPart(part,'study',interactionTiming(1500,5000));
    expect(page.getVerticesData('position')).not.toEqual(base);
    restoreInteractionPart(part);expect(page.getVerticesData('position')).toEqual(base);
    page.dispose();expect(interactionParts(scene,'future-library')).toHaveLength(0);
    scene.dispose();expect(interactionParts(scene,'future-library')).toHaveLength(0);engine.dispose();
  });
  it('keeps hammock suspension endpoints fixed and restores cloth exactly',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    const hammock=MeshBuilder.CreateGround('future-hammock',{width:1,height:2,subdivisions:8},scene);
    registerInteractionPart(scene,'future-bed','hammock',hammock);
    const part=interactionParts(scene,'future-bed')[0]!,base=hammock.getVerticesData('position')!.slice();
    animateInteractionPart(part,'rest',interactionTiming(2500,6500));
    const now=hammock.getVerticesData('position')!;
    for(let i=0;i<base.length;i+=3)if(Math.abs(base[i+2]!)>.999){expect(now[i]).toBeCloseTo(base[i]!);expect(now[i+1]).toBeCloseTo(base[i+1]!);}
    expect(now).not.toEqual(base);restoreInteractionPart(part);expect(hammock.getVerticesData('position')).toEqual(base);
    scene.dispose();engine.dispose();
  });
  it('picks up the original object, keeps its resting contact stable and returns it exactly',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    const book=MeshBuilder.CreateBox('future-book',{size:.5},scene);book.position.set(5,.8,6);
    registerInteractionPart(scene,'future-book','book',book,{grip:book.position.clone()});
    const part=interactionParts(scene,'future-book')[0]!,contact=interactionContact(scene,'future-book','study')!;
    const hand=new Vector3(4.2,.6,6.4);
    animateInteractionPart(part,'study',interactionTiming(1500,5000),hand);
    expect(Vector3.Distance(book.position,hand)).toBeLessThan(1e-6);
    expect(interactionContact(scene,'future-book','study')).toEqual(contact);
    restoreInteractionPart(part);expect(book.position).toEqual(part.position);
    scene.dispose();engine.dispose();
  });
  it('articulates painted arms but keeps boots fixed with alpha padding and either camera-facing side',()=>{
    for(const facingX of [-1,0,1])for(const action of ['warm','cook','tend-fire','study','pray','tools','prepare-bed','rest','guard','shelter','inspect','chest-toggle'] as const){
      const pose={action,timing:interactionTiming(1700,5000),facingX,anchorY:.9,heightFraction:.7};
      for(const u of [.25,.5,.75])expect(interactionActorVertex(u,.9,pose)).toEqual({x:u-.5,y:.5-.9});
      expect(interactionActorVertex(.75,.9-.59*.7,pose)).not.toEqual(interactionActorVertex(.75,.9-.59*.7));
      expect(interactionActorVertex(.75,.5,{...pose,timing:interactionTiming(5000,5000)})).toEqual(interactionActorVertex(.75,.5));
    }
  });
  it('restores an articulated billboard to a flat walking pose and retains atlas cropping',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),camera=new ArcRotateCamera('camera',.8,.9,40,Vector3.Zero(),scene);
    const renderer=new WorldBillboards(scene,()=>new Texture(null,scene));
    const frame:BillboardFrame={url:'/future.png',sourceWidth:1024,sourceHeight:512,x:256,y:0,width:256,height:512,worldWidth:.8,worldHeight:1.6,anchorX:.5,anchorY:.9,offsetX:0,offsetY:0,flipX:false,alpha:1,tint:0xffffff};
    renderer.sync('future',Vector3.Zero(),camera,{...frame,interactionPose:{action:'cook',timing:interactionTiming(1500,5000),facingX:1,anchorY:.9,heightFraction:.7}},null,true,false);
    const mesh=scene.getMeshByName('actor:future:body')!,animated=mesh.getVerticesData('position')!.slice();
    expect(mesh.getTotalVertices()).toBe(117);
    renderer.sync('future',Vector3.Zero(),camera,frame,null,true,false);
    expect(mesh.getVerticesData('position')).not.toEqual(animated);
    const uv=mesh.getVerticesData('uv')!;expect(Math.min(...uv.filter((_,i)=>i%2===0))).toBeGreaterThan(.25);expect(Math.max(...uv.filter((_,i)=>i%2===0))).toBeLessThan(.5);
    renderer.dispose();expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
  });
});

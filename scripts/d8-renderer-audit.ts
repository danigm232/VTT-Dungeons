import {createRequire} from 'node:module';
import * as B from '@babylonjs/core';
import {createD8Scene} from '../campaigns/one-shot/playground/renderer';
import {D8NIGHT,D8_VERSION} from '../campaigns/one-shot/playground/d8night.config';
import {oneShotCampaignDefinition} from '../campaigns/one-shot/public/pack';
import {CAMERA_DEFAULT_TILT,CAMERA_MIN_TILT} from '../engine/client/camera-profile';

// Build the real scene with a NullEngine. This validates geometry/material
// state and cutaway transitions; it is not a GPU screenshot or FPS benchmark.
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.D8_AUDIT_CANVAS_MODULE??'@napi-rs/canvas');
(globalThis as any).OffscreenCanvas=function(width:number,height:number){return createCanvas(width,height);};
const key=(r:any)=>[r.x,r.z,r.w,r.d,r.radius??0].join(':');
const failures:string[]=[];
const requestedMap=process.env.D8_AUDIT_MAP;
if(requestedMap&&!D8NIGHT.maps[requestedMap])throw new Error(`Unknown D8 audit map: ${requestedMap}`);
for(const id of Object.keys(D8NIGHT.maps).filter(id=>!requestedMap||id===requestedMap)){
  const engine=new B.NullEngine({renderWidth:1280,renderHeight:720,textureSize:512});
  const scene=createD8Scene(engine,createCanvas(1280,720),{config:D8NIGHT,version:D8_VERSION,babylon:B,integrated:true,mapId:id});
  try{
    for(const m of scene.meshes)m.computeWorldMatrix(true);
    const districtHouses=scene.transformNodes.filter((node:any)=>node.metadata?.roofEnvelope);
    for(const node of districtHouses){
      node.computeWorldMatrix(true);const roof=(node.metadata as any).roofEnvelope;
      for(const end of [-1,1]){
        const start=B.Vector3.TransformCoordinates(new B.Vector3(0,roof.eaveY+(roof.ridgeY-roof.eaveY)*.5,end*(roof.depth/2+.45)),node.getWorldMatrix());
        const direction=B.Vector3.TransformNormal(new B.Vector3(0,0,-end),node.getWorldMatrix()).normalize();
        const ray=new B.Ray(start,direction,.62),hits=ray.intersectsMeshes(scene.meshes.filter((mesh:any)=>mesh.metadata?.exteriorBuilding));
        if(!hits.length)failures.push(`${id}: decorative house at ${node.position.x},${node.position.z} has an open gable (${end})`);
      }
    }
    const roofs=scene.meshes.filter((m:any)=>m.metadata?.interiorRoof);
    const rooms=[...new Map(roofs.map((m:any)=>[key(m.metadata.interiorRoof),m.metadata.interiorRoof])).values()] as any[];
    const context=scene.metadata.d8Vtt;
    const profile=oneShotCampaignDefinition.scenes.find(s=>s.id===id)!;
    const props=profile.props.map(p=>({...p,state:p.initialState,structure:'intact'}));
    const view={props,entities:[],seats:profile.stageActors,environment:{timeOfDay:'sunset',windIntensity:.35,precipitation:'none'},cameraPosition:new B.Vector3(0,8,25),focus:{x:100,y:0,z:100}};
    context.setViewContext(view);
    if(id==='temple'){
      const panes=scene.meshes.filter(mesh=>/templeWall(EntranceGlass|ClerestoryGlass)/.test(mesh.name));
      if(panes.length!==7||panes.some(mesh=>!mesh.material||mesh.material.alpha<.45||mesh.material.alpha>=.85||!mesh.metadata?.stainedGlass||mesh.metadata?.tokenOccluder!==false))failures.push('temple: missing translucent stained-glass clerestory/entrance closure');
      for(const pane of panes){const material=pane.material as any;if(!material.diffuseTexture||material.diffuseTexture!==material.emissiveTexture||pane.metadata?.stainedGlassRepeat<1||Math.max(...(pane.getVerticesData('uv')??[]))<pane.metadata?.stainedGlassRepeat-.001)failures.push('temple: untextured or stretched stained glass');}
      const windowCanvas=(panes[0]?.material as any)?.diffuseTexture?.getContext().canvas;
      if(windowCanvas){const pixels=windowCanvas.getContext('2d').getImageData(0,0,512,512).data,colors=new Set<number>();for(let i=0;i<pixels.length;i+=64)colors.add((pixels[i]>>4)*256+(pixels[i+1]>>4)*16+(pixels[i+2]>>4));if(colors.size<12)failures.push('temple: blank/black stained-glass pattern');}
      if(windowCanvas?.toBuffer)require('node:fs').writeFileSync('runtime/d8-v55-stained-glass.png',windowCanvas.toBuffer('image/png'));
      for(const side of [-1,1]){
        const ray=new B.Ray(new B.Vector3(side*15.3,4.2,13.05),new B.Vector3(-side,0,0),2);
        if(!ray.intersectsMeshes(scene.meshes.filter((mesh:any)=>mesh.metadata?.buildingEnvelope)).length)failures.push('temple: open side between vestibule wall and roof');
      }
      const sunlight=scene.lights.filter((light:any)=>light.metadata?.sunlight),shafts=scene.meshes.filter((mesh:any)=>mesh.metadata?.sunlight);
      if(sunlight.length!==6||shafts.length!==9)failures.push('temple: sunlight rig is incomplete');
      const projections=sunlight.filter((light:any)=>light.metadata?.stainedGlassProjection);
      if(projections.length!==3||projections.some((light:any)=>!light.projectionTexture||light.projectionTexture.name!=='sanctuary_stainedClerestory_texture'))failures.push('temple: colored window projection is missing');
      for(const light of sunlight)if(light.diffuse.r<=light.diffuse.b)failures.push('temple: window sunlight still blue');
      for(const shaft of shafts)if(shaft.material&&'emissiveColor' in shaft.material&&(shaft.material as any).emissiveColor.r<=(shaft.material as any).emissiveColor.b)failures.push('temple: decorative sunlight shaft still blue');
      context.setViewContext({...view,environment:{...view.environment,timeOfDay:'night'}});scene.onBeforeRenderObservable.notifyObservers(scene);
      if(sunlight.some(light=>light.intensity!==0)||shafts.some(mesh=>mesh.visibility!==0))failures.push('temple: sunlight remains on at night');
      context.setViewContext(view);scene.onBeforeRenderObservable.notifyObservers(scene);
      if(sunlight.some(light=>light.intensity<=0)||shafts.some(mesh=>mesh.visibility<=0))failures.push('temple: sunlight did not return at sunset');

      // Both chambers share one architectural cutaway. The outer facade,
      // assigned to the vestibule, must not become opaque again from the nave.
      const outerFacade=scene.meshes.filter(mesh=>mesh.metadata?.buildingEnvelope
        &&mesh.metadata?.cutawayRoom?.id==='temple-vestibule'
        &&mesh.getBoundingInfo().boundingBox.centerWorld.z>17.5);
      if(!outerFacade.length)failures.push('temple: outer vestibule facade is missing from cutaway audit');
      const settleAt=(focus:any,cameraPosition:B.Vector3)=>{
        const next={...view,focus,cameraPosition};
        for(let i=0;i<24;i++)context.setViewContext(next);
      };
      settleAt({x:0,y:0,z:-.5},new B.Vector3(0,8,29));
      if(outerFacade.some(mesh=>mesh.isEnabled()&&mesh.isVisible&&mesh.visibility>.15))failures.push('temple: exterior vestibule wall reappears and blocks the nave');
      const naveBackWall=scene.meshes.filter(mesh=>mesh.metadata?.buildingEnvelope
        &&mesh.metadata?.cutawayRoom?.id==='temple-nave'
        &&mesh.getBoundingInfo().boundingBox.centerWorld.z< -8.4);
      settleAt({x:0,y:0,z:13.125},new B.Vector3(0,8,-20));
      if(naveBackWall.some(mesh=>mesh.isEnabled()&&mesh.isVisible&&mesh.visibility>.15))failures.push('temple: exterior nave wall reappears and blocks the vestibule');
      settleAt({x:0,y:0,z:29},new B.Vector3(0,8,42));
      if([...outerFacade,...naveBackWall].some(mesh=>mesh.isEnabled()&&mesh.visibility<.99))failures.push('temple: exterior walls did not restore outside');
    }
    const hiddenOutside=roofs.filter((m:any)=>!m.isEnabled()).length;
    if(hiddenOutside)failures.push(`${id}: ${hiddenOutside} roof meshes hidden outside`);
    const doors=scene.meshes.filter((mesh:any)=>mesh.metadata?.nativeDoorLeaf);
    if(rooms.length&&!doors.length)failures.push(`${id}: no opaque native door leaf`);
    for(const door of doors)if(!door.isEnabled()||door.visibility<.99)failures.push(`${id}: native door hidden outside`);
    for(const window of D8NIGHT.maps[id].MAP.windows??[]){
      const glass=scene.meshes.filter((mesh:any)=>mesh.metadata?.windowId===window.id);
      if(!glass.length)failures.push(`${id}: missing interactive glass for ${window.id}`);
      if(window.z<0&&glass.filter(mesh=>mesh.name==='artWindowLead').length!==5)failures.push(`${id}: ${window.id} has unregistered rear-window leading`);
      context.setViewContext({...view,props:props.map(prop=>prop.id===window.id?{...prop,structure:'destroyed'}:prop)});
      if(glass.some(mesh=>mesh.isEnabled()))failures.push(`${id}: ${window.id} still visible after breaking`);
      context.setViewContext(view);
      if(glass.some(mesh=>!mesh.isEnabled()))failures.push(`${id}: ${window.id} did not restore intact glass`);
    }
    if(id==='cafe'&&scene.meshes.some((mesh:any)=>/^artWindow/.test(mesh.name)&&!mesh.metadata?.windowId))failures.push('cafe: some rear window decorations do not belong to a breakable window');
    if(id==='cafe'){
      const flames=scene.meshes.filter(mesh=>mesh.name==='cafeHearthFlame');
      if(flames.length!==14||flames.some(mesh=>!mesh.isEnabled()||!mesh.isVisible||mesh.getBoundingInfo().boundingBox.maximumWorld.y<1))failures.push('cafe: hearth flames hidden or buried below the hearth');
      if(scene.meshes.some(mesh=>mesh.name==='d8-horizon-cafe-side-verge'))failures.push('cafe: blue-green side slabs still present');
      const shell=D8NIGHT.maps.cafe.MAP.tavernEnvelope,room=rooms.find(room=>room.id==='cafe-main-room'),cover=roofs.filter((mesh:any)=>mesh.metadata.interiorRoof.id==='cafe-main-room');
      if(!room||cover.length<4||room.d>=shell.frontZ-shell.backZ||room.w>=shell.rightX-shell.leftX)failures.push('cafe: roof uses exterior footprint instead of the real interior floor');
      const outside=[{x:.75,y:0,z:shell.frontZ+.20},{x:.75,y:0,z:shell.frontZ-.05},{x:shell.leftX+.05,y:0,z:0},{x:shell.rightX-.05,y:0,z:0},{x:0,y:0,z:shell.backZ+.05}];
      for(const focus of outside){context.setViewContext({...view,focus});if(cover.some(mesh=>!mesh.isEnabled()||!mesh.isVisible||mesh.visibility<.99||!mesh.material||mesh.material.alpha<.99))failures.push(`cafe: roof missing outside at ${focus.x},${focus.z}`);}
      const opaque=scene.meshes.filter(mesh=>mesh.isEnabled()&&mesh.isVisible&&mesh.visibility>.99&&mesh.metadata?.buildingEnvelope&&(mesh.material?.alpha??1)>.99);
      for(const x of [-10,-5,0,5,10])for(const z of [-6,-3,0,3,6]){
        const ray=new B.Ray(new B.Vector3(x,10,z),new B.Vector3(0,-1,0),8);
        if(!ray.intersectsMeshes(cover).length)failures.push(`cafe: uncovered roof at ${x},${z}`);
      }
      const rise=Math.tan(.32)*shell.width/2;
      for(const end of [-1,1])for(const x of [-10,-6,0,6,10]){
        const z=end<0?shell.backZ:shell.frontZ,y=shell.height+rise*(1-Math.abs(x)/(shell.width/2))*.5;
        const ray=new B.Ray(new B.Vector3(x,y,z+end*1.2),new B.Vector3(0,0,-end),2.4),hits=ray.intersectsMeshes(cover);
        if(!hits.length||!(hits[0]!.pickedMesh?.material as any)?.diffuseTexture)failures.push(`cafe: open/untextured wooden gable at ${x},${z}`);
      }
      // Sample the solid panels, avoiding only the deliberately authored door/windows.
      for(const z of [shell.backZ,shell.frontZ])for(const x of [-11,-10,-9,-7,-5,-3,-2,2,3,5,6,7,9,10,11]){
        for(const y of [.5,1.1,2.9]){
          const sign=z<0?-1:1,ray=new B.Ray(new B.Vector3(x,y,z+sign),new B.Vector3(0,0,-sign),2),hits=ray.intersectsMeshes(opaque);
          if(!hits.length)failures.push(`cafe: facade gap at ${x},${y},${z}`);
        }
      }
      for(const x of [shell.leftX,shell.rightX])for(const z of [-6,-3,0,3,6]){
        const sign=x<0?-1:1,ray=new B.Ray(new B.Vector3(x+sign,2,z),new B.Vector3(-sign,0,0),2);
        const hits=ray.intersectsMeshes(opaque);if(!hits.length)failures.push(`cafe: side-wall gap at ${x},${z}`);
      }
      for(const focus of [{x:0,y:0,z:0},...outside]){context.setViewContext({...view,focus});const inside=focus.x===0&&focus.z===0;if(cover.some(mesh=>mesh.isEnabled()===inside))failures.push('cafe: complete roof did not toggle on entry/exit');}
      context.setViewContext(view);
    }
    if(id==='garden'){
      if(scene.meshes.filter(mesh=>mesh.metadata?.evergreenCrown).length!==12)failures.push('garden: missing fir foliage');
      if(!scene.meshes.some(mesh=>mesh.name==='lanternPost'&&mesh.isEnabled()))failures.push('garden: missing lantern support');
      const house=D8NIGHT.maps.garden.MAP.objects.find((object:any)=>object.asset==='house'&&object.playable),[x,z]=house.position,[w,d]=house.size;
      const houseRoofs=roofs.filter((mesh:any)=>Math.hypot(mesh.metadata.interiorRoof.x-x,mesh.metadata.interiorRoof.z-z)<.01);
      if(houseRoofs.length<9)failures.push('garden: incomplete house roof/gable/eaves');
      const outside=[{x:x-1.2,y:0,z:z+d/2+.7},{x:x-1.2,y:0,z:z+d/2-.05},{x:x-w/2+.05,y:0,z},{x:x+w/2-.05,y:0,z},{x,y:0,z:z-d/2+.05}];
      for(const focus of outside){
        context.setViewContext({...view,focus,cameraPosition:new B.Vector3(x+8,8,z+16)});
        if(houseRoofs.some(mesh=>!mesh.isEnabled()||!mesh.isVisible||mesh.visibility<.99||!mesh.material||mesh.material.alpha<.99))failures.push(`garden: missing exterior roof at ${focus.x},${focus.z}`);
      }
      for(const dx of [-w*.35,0,w*.35])for(const dz of [-d*.35,0,d*.35]){
        const ray=new B.Ray(new B.Vector3(x+dx,7,z+dz),new B.Vector3(0,-1,0),5);
        if(!ray.intersectsMeshes(houseRoofs.filter(mesh=>mesh.name==='roofA'||mesh.name==='roofB')).length)failures.push(`garden: uncovered roof surface at ${dx},${dz}`);
      }
      for(const focus of [{x,y:0,z},...outside]){
        context.setViewContext({...view,focus,cameraPosition:new B.Vector3(x-8,8,z+16)});
        const inside=focus.x===x&&focus.z===z;
        if(houseRoofs.some(mesh=>mesh.isEnabled()===inside))failures.push('garden: roof did not restore after leaving Fritz');
      }
      context.setViewContext(view);
    }
    context.setViewContext({...view,focus:{x:D8NIGHT.maps[id].spawn[0],y:0,z:D8NIGHT.maps[id].spawn[2]}});
    const spawnHidden=roofs.filter((m:any)=>!m.isEnabled()).length;
    if(spawnHidden)failures.push(`${id}: ${spawnHidden} roof pieces hidden at exterior spawn`);
    if(id==='temple'&&rooms.length!==2)failures.push('temple: vestibule and nave are not separate rooms');
    let visibleInside=0;
    for(const room of rooms){
      context.setViewContext({...view,focus:{x:room.x,y:0,z:room.z}});
      visibleInside+=roofs.filter((m:any)=>key(m.metadata.interiorRoof)===key(room)&&m.isEnabled()).length;
      if(id==='temple')for(const mesh of roofs){const other=(mesh.metadata as any).interiorRoof,shouldHide=key(other)===key(room)||other.hideWhenInside?.includes(room.id);if(mesh.isEnabled()===Boolean(shouldHide))failures.push(`temple: incorrect roof visibility from ${room.id}`);}
    }
    if(visibleInside)failures.push(`${id}: ${visibleInside} roof meshes remain visible inside`);
    context.setViewContext(view);
    const invalid=scene.meshes.filter(m=>m.getTotalVertices()>0&&[...m.getBoundingInfo().boundingBox.minimumWorld.asArray(),...m.getBoundingInfo().boundingBox.maximumWorld.asArray()].some(n=>!Number.isFinite(n))).length;
    const local=scene.lights.filter(l=>l.getClassName()==='PointLight'||l.getClassName()==='SpotLight');
    const stale=local.reduce((n,l)=>n+l.includedOnlyMeshes.filter(m=>m.isDisposed()).length,0);
    if(invalid)failures.push(`${id}: ${invalid} nonfinite mesh bounds`);
    if(stale)failures.push(`${id}: ${stale} disposed meshes in light membership`);
    const shadowMaps=scene.lights.filter(l=>Boolean(l.getShadowGenerator())).length;
    const keyLight=scene.lights.find(light=>light.name===`v19_key_${id}`);
    if(shadowMaps<2)failures.push(`${id}: no local shadow map`);
    if(['temple','cafe'].includes(id)&&keyLight&&keyLight.diffuse.r<=keyLight.diffuse.b)failures.push(`${id}: sunset key is still blue`);
    const rugs=scene.meshes.filter(mesh=>mesh.name==='runner');
    for(let i=0;i<rugs.length;i++)for(let j=i+1;j<rugs.length;j++){
      const a=rugs[i]!.getBoundingInfo().boundingBox,b=rugs[j]!.getBoundingInfo().boundingBox;
      if(Math.min(a.maximumWorld.x,b.maximumWorld.x)-Math.max(a.minimumWorld.x,b.minimumWorld.x)>.1&&Math.min(a.maximumWorld.z,b.maximumWorld.z)-Math.max(a.minimumWorld.z,b.minimumWorld.z)>.1&&Math.abs(a.centerWorld.y-b.centerWorld.y)<.005)failures.push(`${id}: coplanar crossing rugs`);
    }
    const overhead=scene.meshes.filter(m=>/houseDoorLintel|houseBeamTop|ceilingJoist|cutawayEave|sanctuaryAisleArch|templeGate(Lintel|Crown)/.test(m.name));
    const uncovered=overhead.filter(m=>!m.metadata?.interiorRoof).map(m=>m.name);
    if(uncovered.length)failures.push(`${id}: overhead pieces without room: ${uncovered.join(', ')}`);
    console.log(JSON.stringify({map:id,meshes:scene.meshes.length,rooms:rooms.length,roofMeshes:roofs.length,hiddenOutside,visibleInside,localLights:local.length,shadowMaps,shadowCasterCounts:scene.lights.filter(l=>l.getShadowGenerator()).map(l=>l.getShadowGenerator()!.getShadowMap()!.renderList?.length??0),sunsetKey:keyLight?.diffuse.asArray(),contactShadows:scene.meshes.filter(m=>/sceneryContactShadow/.test(m.name)).length,invalidBounds:invalid,staleLightMeshes:stale,uncoveredOverhead:uncovered}));
  }finally{scene.dispose();engine.dispose();}
}
// Exercise the standalone input/render callback without a DOM GUI or a GPU.
class Control{
  onPointerClickObservable=new B.Observable();
  addControl(){}
}
const GUI={Control:{HORIZONTAL_ALIGNMENT_LEFT:0,VERTICAL_ALIGNMENT_TOP:0,VERTICAL_ALIGNMENT_BOTTOM:0},AdvancedDynamicTexture:{CreateFullscreenUI:()=>new Control()},StackPanel:Control,TextBlock:Control,Rectangle:Control,Button:{CreateSimpleButton:()=>new Control()}};
const standaloneEngine=new B.NullEngine({renderWidth:1280,renderHeight:720,textureSize:512});
const standalone=createD8Scene(standaloneEngine,createCanvas(1280,720),{config:D8NIGHT,version:D8_VERSION,babylon:{...B,GUI},mapId:'garden'});
try{
  const camera=standalone.activeCamera as B.ArcRotateCamera,player=standalone.getMeshByName('player')!;
  camera.beta=1;player.position.set(-10,0,6);standalone.onBeforeRenderObservable.notifyObservers(standalone);
  player.position.set(7.2,0,-3);standalone.onBeforeRenderObservable.notifyObservers(standalone);
  const entryTilt=90-camera.beta*180/Math.PI;
  camera.beta=.96;const manualAlpha=camera.alpha,manualRadius=camera.radius;
  standalone.onBeforeRenderObservable.notifyObservers(standalone);const manualBeta=camera.beta;
  if(camera.alpha!==manualAlpha||camera.radius!==manualRadius)failures.push('standalone: actor follow changed manual orbit/zoom');
  player.position.set(-10,0,6);standalone.onBeforeRenderObservable.notifyObservers(standalone);const exitBeta=camera.beta;
  if(Math.abs(entryTilt-CAMERA_MIN_TILT)>.001||Math.abs(manualBeta-.96)>.001||Math.abs(exitBeta-(Math.PI/2-CAMERA_DEFAULT_TILT*Math.PI/180))>.001)failures.push('standalone: interior camera transition/manual orbit/restore failed');
  console.log(JSON.stringify({mode:'standalone',map:'garden',entryTilt,manualBeta,exitBeta}));
}finally{standalone.dispose();standaloneEngine.dispose();}
for(const failure of failures)console.error(failure);
if(failures.length)process.exitCode=1;

import { it,expect } from 'vitest';
import { NullEngine,Scene,MeshBuilder,Vector3 } from '@babylonjs/core';
import { structureObscuresFocus } from './structure-occlusion.js';

it('detects a mast between the camera and the actor, but not an unobstructed reverse view',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const mast=MeshBuilder.CreateCylinder('mast',{height:4,diameter:.8},scene);mast.position.y=2;mast.computeWorldMatrix(true);
    const feet=new Vector3(2,0,0);
    expect(structureObscuresFocus(mast,feet,new Vector3(-1,0,0))).toBe(true);
    expect(structureObscuresFocus(mast,feet,new Vector3(1,0,0))).toBe(false);
    expect(structureObscuresFocus(mast,new Vector3(2,5,0),new Vector3(-1,0,0))).toBe(false);
    expect(mast.checkCollisions).toBe(false);
  }finally{scene.dispose();engine.dispose();}
});

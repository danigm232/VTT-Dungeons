import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { campClothSurface, campFoamTexture, campMaterialRelief, wornCampTrail } from '../../campaigns/camp-rests/public/camp-detail-kit.js';
import { buildTerrain3D } from './terrain3d.js';
import { bridgeFixture } from '../shared/terrain-fixture.js';

describe('detalle nativo de los campamentos',()=>{
  it('comparte el relieve por tipo y conserva el atlas ilustrado',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const a=new StandardMaterial('a',scene),b=new StandardMaterial('b',scene),c=new StandardMaterial('c',scene);
      campMaterialRelief(scene,a,'rock');campMaterialRelief(scene,b,'rock');campMaterialRelief(scene,c,'cloth');
      expect(a.bumpTexture).toBe(b.bumpTexture);expect(c.bumpTexture).not.toBe(a.bumpTexture);
      expect(a.diffuseTexture).toBeNull();expect(a.bumpTexture!.getSize()).toEqual({width:128,height:128});
    }finally{scene.dispose();engine.dispose();}
  });
  it('reutiliza una máscara de espuma transparente sin añadir observadores',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const before=scene.onBeforeRenderObservable.observers.length;
      expect(campFoamTexture(scene)).toBe(campFoamTexture(scene));expect(campFoamTexture(scene).hasAlpha).toBe(true);
      expect(scene.onBeforeRenderObservable.observers.length).toBe(before);
    }finally{scene.dispose();engine.dispose();}
  });
  it('mantiene las mantas en coordenadas locales para sus animaciones',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const mesh=campClothSurface(scene,'blanket',1.1,2.1,.075),p=mesh.getVerticesData('position')!;
      expect(Math.max(...p.filter((_,i)=>i%3===0))).toBeCloseTo(.55);
      expect(Math.min(...p.filter((_,i)=>i%3===2))).toBeCloseTo(-1.05);
      expect(mesh.position.length()).toBe(0);expect(p.every(Number.isFinite)).toBe(true);
      expect(Math.max(...p.filter((_,i)=>i%3===1))).toBeGreaterThan(.06);
    }finally{scene.dispose();engine.dispose();}
  });
  it('suaviza el borde visual del sendero sin modificar sus casillas',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const cells=[{col:2,row:3},{col:2,row:4}],before=JSON.stringify(cells),mat=new StandardMaterial('path',scene);
      const mesh=wornCampTrail(scene,cells,mat),colors=mesh.getVerticesData('color')!,normals=mesh.getVerticesData('normal')!;
      expect(JSON.stringify(cells)).toBe(before);expect(mesh.hasVertexAlpha).toBe(true);
      expect(colors.some((v,i)=>i%4===3&&v===0)).toBe(true);expect(colors.some((v,i)=>i%4===3&&v>.9)).toBe(true);
      expect(colors.some((v,i)=>i%4===3&&v>.4&&v<.6)).toBe(true);
      expect(normals.filter((_,i)=>i%3===1).every(y=>y>.99)).toBe(true);
    }finally{scene.dispose();engine.dispose();}
  });
  it('permite una cuadrícula tenue con transparencia real sin cambiar su geometría ni el estilo por defecto',()=>{
    const engine=new NullEngine(),plainScene=new Scene(engine),campScene=new Scene(engine);
    try{const plain=buildTerrain3D(plainScene,bridgeFixture),camp=buildTerrain3D(campScene,bridgeFixture,{gridStyle:{color:'#bbc6ac',alpha:.16}});
      expect(plain.grid.alpha).toBe(1);expect(plain.grid.material!.needAlphaBlending()).toBe(false);
      expect(camp.grid.alpha).toBe(.16);expect(camp.grid.material!.needAlphaBlending()).toBe(true);
      expect(camp.grid.getVerticesData('position')).toEqual(plain.grid.getVerticesData('position'));
      expect(camp.tiles.size).toBe(plain.tiles.size);expect(camp.grid.isPickable).toBe(false);
    }finally{plainScene.dispose();campScene.dispose();engine.dispose();}
  });
});

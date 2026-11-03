import type {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';

/**
 * Presentation membership for the existing scene, three foreground rocks and four
 * distant silhouettes. Layers 3, 4, 6 and 7 are reserved, not new scenery systems.
 * 
 * Capa 1: FOREGROUND (primer plano decorativo con atenuación por proximidad)
 * Capa 2: PLAYABLE WORLD (zona jugable existente, máxima nitidez y legibilidad)
 * Capa 3: VERTICAL DEPTH (reserved — native coastal-backdrop.ts handles the bay)
 * Capa 4: MIDGROUND (reserved — engine terrain provides island context)
 * Capa 5: DISTANT SCENERY (siluetas de los picos volcánicos de la Isla de las Tempestades)
 * Capa 6: SKY & HORIZON (reserved — engine weather system manages the sky)
 * Capa 7: ATMOSPHERIC DEPTH (reserved — per-material tinting replaces global fog)
 */
export interface ScenicDepthController {
  readonly root: TransformNode;
  readonly layers: Map<number, TransformNode>;
  setLayerVisible(layer: number, visible: boolean): void;
  isLayerVisible(layer: number): boolean;
  update(time: number, camera: ArcRotateCamera | null, characterPos?: Vector3 | null): void;
  readonly stats: {
    totalMeshes: number;
    existingSceneMeshes: number;
    layerCounts: Record<number, number>;
    submergedRocks: number;
    foregroundElements: number;
    midgroundHeadlands: number;
    distantPeaks: number;
  };
  dispose(): void;
}

export function installRetreatScenicDepth(scene: Scene): ScenicDepthController {
  const root = new TransformNode('Retreat_Scenic_Depth_Root', scene);
  const layers = new Map<number, TransformNode>();
  const layerCounts: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0};
  const existingMeshes:Mesh[]=[];
  const previousEnabled=new Map<Mesh,boolean>();

  for (let i = 1; i <= 7; i++) {
    const layerNode = new TransformNode(`Scenic_Layer_${i}`, scene);
    layerNode.parent = root;
    layers.set(i, layerNode);
  }

  // Material silueta distante (atmósfera / perspectiva aérea)
  const distantMat = new StandardMaterial('scenic:distant-cliffs', scene);
  distantMat.diffuseColor = new Color3(0.42, 0.49, 0.54);
  distantMat.emissiveColor = new Color3(0.22, 0.27, 0.31);
  distantMat.specularColor = Color3.Black();

  let foregroundMat: StandardMaterial | null = null;

  // -------------------------------------------------------------------------
  // CAPA 1 — FOREGROUND (Primer plano de encuadre en bordes de cámara)
  // Elementos colocados en los márgenes exteriores para dar sensación de profundidad
  // -------------------------------------------------------------------------
  const l1 = layers.get(1)!;
  const foregroundMeshes: Mesh[] = [];
  const importedForeground=['SW','Harbor','East'].map(key=>scene.getMeshByName('Stone_Foreground_'+key)).filter((m):m is Mesh=>m instanceof Mesh);
  if(importedForeground.length===3){
    // Keep the authored GLB parent and its axis conversion. Layer membership is
    // independent of transform ownership, as it is for the existing playable area.
    for(const rock of importedForeground){rock.isPickable=false;rock.checkCollisions=false;rock.receiveShadows=true;rock.metadata={...rock.metadata,tokenOccluder:true,scenicLayer:1,content:'VTT_AMBIENCE'};foregroundMeshes.push(rock);}
  }else{
  foregroundMat = new StandardMaterial('scenic:foreground-framing', scene);
  foregroundMat.diffuseColor = new Color3(0.15, 0.18, 0.16);
  foregroundMat.specularColor = new Color3(0.04, 0.04, 0.04);
  foregroundMat.alpha = 0.88;

  // Corona rocosa y ramas en el flanco suroeste (entrada del camino de la playa)
  const fgRock1 = MeshBuilder.CreateBox('FG_Rock_SW_Overhang', {width: 4.5, height: 6.0, depth: 3.5}, scene);
  fgRock1.position.set(12, 4.0, 126);
  fgRock1.rotation.set(0.15, 0.4, -0.1);
  fgRock1.material = foregroundMat;
  fgRock1.parent = l1;
  fgRock1.isPickable = false;
  fgRock1.receiveShadows = true;
  fgRock1.metadata = {tokenOccluder: true, scenicLayer: 1,content:'VTT_AMBIENCE'};
  foregroundMeshes.push(fgRock1);

  // Rocas salientes en el borde inferior cerca de la cámara del puerto
  const fgRock2 = MeshBuilder.CreateBox('FG_Rock_Harbor_Flank', {width: 5.0, height: 3.2, depth: 4.0}, scene);
  fgRock2.position.set(32, 1.2, 128);
  fgRock2.rotation.set(-0.1, -0.3, 0.05);
  fgRock2.material = foregroundMat;
  fgRock2.parent = l1;
  fgRock2.isPickable = false;
  fgRock2.metadata = {tokenOccluder: true, scenicLayer: 1,content:'VTT_AMBIENCE'};
  foregroundMeshes.push(fgRock2);

  // Saliente rocoso alto en el flanco este frente a la cámara
  const fgRock3 = MeshBuilder.CreateBox('FG_Rock_East_Overhang', {width: 4.0, height: 8.0, depth: 4.0}, scene);
  fgRock3.position.set(168, 12.0, 92);
  fgRock3.rotation.set(0.05, 0.8, -0.15);
  fgRock3.material = foregroundMat;
  fgRock3.parent = l1;
  fgRock3.isPickable = false;
  fgRock3.metadata = {tokenOccluder: true, scenicLayer: 1,content:'VTT_AMBIENCE'};
  foregroundMeshes.push(fgRock3);
  }
  layerCounts[1] = foregroundMeshes.length;

  // -------------------------------------------------------------------------
  // CAPA 2 — PLAYABLE WORLD (Zona jugable)
  // Las mallas existentes se etiquetan para que conserven máxima nitidez
  // -------------------------------------------------------------------------
  for (const m of scene.meshes) {
    if (m.metadata?.retreatZone || m.metadata?.retreatFloor || m.name.startsWith('a1:') || m.name.startsWith('P1_') || m.name.startsWith('P2_')) {
      existingMeshes.push(m as Mesh);
      layerCounts[2] = (layerCounts[2] ?? 0) + 1;
    }
  }

  // -------------------------------------------------------------------------
  // CAPA 3 — VERTICAL DEPTH (reserved)
  // The native coastal-backdrop.ts provides trochoidal wave math, dynamic
  // vertex colors and foam surf.  Crude procedural bounding boxes that were
  // placed here previously (seaBaseFront, seaBaseWinch, seaBaseTemple and
  // submerged reef boxes) occluded the animated ocean and have been removed.
  // -------------------------------------------------------------------------
  layerCounts[3] = 0;

  // -------------------------------------------------------------------------
  // CAPA 4 — MIDGROUND (reserved)
  // Large procedural headland boxes (eastHeadland, westHeadland, sea stacks)
  // that blocked the camera frustum and covered the animated water surface
  // have been removed.  The existing terrain GLBs provide island context.
  // -------------------------------------------------------------------------
  layerCounts[4] = 0;

  // -------------------------------------------------------------------------
  // CAPA 5 — DISTANT SCENERY (Paisaje lejano: siluetas de la Isla de las Tempestades)
  // Montañas volcánicas distantes que generan escala monumental
  // -------------------------------------------------------------------------
  const l5 = layers.get(5)!;
  let distantCount = 0;

  // Picos volcánicos lejanos al norte y noroeste (300-500 m)
  const distantPeaksData = [
    {name: 'Scenic_L5_Distant_Peak_North', pos: [110, 48, -260], radius: 95, height: 110},
    {name: 'Scenic_L5_Distant_Peak_Northwest', pos: [-140, 56, -220], radius: 115, height: 130},
    {name: 'Scenic_L5_Distant_Ridge_Northeast', pos: [310, 38, -190], radius: 85, height: 85},
    {name: 'Scenic_L5_Distant_Cape_East', pos: [420, 22, 60], radius: 75, height: 55}
  ];

  for (const p of distantPeaksData) {
    const peak = MeshBuilder.CreateCylinder(p.name, {
      diameterTop: 0,
      diameterBottom: p.radius * 2,
      height: p.height,
      tessellation: 9
    }, scene);
    peak.position.set(p.pos[0]!, p.pos[1]!, p.pos[2]!);
    peak.material = distantMat;
    peak.parent = l5;
    peak.isPickable = false;
    peak.receiveShadows = false;
    peak.metadata = {tokenOccluder: false, scenicLayer: 5,content:'VTT_AMBIENCE'};
    distantCount++;
  }
  layerCounts[5] = distantCount;

  // -------------------------------------------------------------------------
  // CAPA 6 — SKY & HORIZON (reserved)
  // The horizonRing cylinder that sat at Y=0 and masked the animated sea has
  // been removed.  The engine's weather system manages the sky dome.
  // -------------------------------------------------------------------------
  layerCounts[6] = 0;

  // -------------------------------------------------------------------------
  // CAPA 7 — ATMOSPHERIC DEPTH (reserved)
  // Global scene.fogMode = EXP2 with fogDensity = 0.0016 washed out the entire
  // foreground with a milky gray haze in orthographic mode.  Removed.  The
  // engine weather/climate system manages fog when actual weather fog is active.
  // Distant peaks use their own material emissive tinting for atmospheric
  // perspective, keeping the playable area crisp and readable.
  // -------------------------------------------------------------------------
  layerCounts[7] = 0;

  // -------------------------------------------------------------------------
  // CONTROLADOR DINÁMICO
  // -------------------------------------------------------------------------

  function update(time: number, camera: ArcRotateCamera | null, characterPos?: Vector3 | null) {
    if (!camera) return;

    // Atenuación inteligente de elementos de primer plano (Capa 1)
    // Cuando el personaje o la cámara están orientados hacia ellos
    for (const fg of foregroundMeshes) {
      if (characterPos) {
        const dist = Vector3.Distance(characterPos, fg.getAbsolutePosition());
        if (dist < 14) {
          fg.visibility = Math.max(0.15, (dist - 5) / 9);
        } else {
          fg.visibility = 0.88;
        }
      }
    }

    // Perspectiva aérea sutil: modular color emissive de los picos lejanos con la luz ambiental
    const dayFactor = Math.max(0.2, Math.min(1.0, (scene.clearColor.r - 0.03) / 0.18));
    distantMat.emissiveColor.set(0.22 * dayFactor, 0.27 * dayFactor, 0.31 * dayFactor);
  }

  function setLayerVisible(layer: number, visible: boolean) {
    // Do not reparent authored meshes: their transforms and door owners are authoritative.
    if(layer===2){for(const mesh of existingMeshes){if(!visible){if(!previousEnabled.has(mesh))previousEnabled.set(mesh,mesh.isEnabled(false));mesh.setEnabled(false);}else if(previousEnabled.has(mesh)){mesh.setEnabled(previousEnabled.get(mesh)!);previousEnabled.delete(mesh);}}}
    if(layer===1){for(const mesh of foregroundMeshes){if(mesh.parent===l1)continue;if(!visible){if(!previousEnabled.has(mesh))previousEnabled.set(mesh,mesh.isEnabled(false));mesh.setEnabled(false);}else if(previousEnabled.has(mesh)){mesh.setEnabled(previousEnabled.get(mesh)!);previousEnabled.delete(mesh);}}}
    const node = layers.get(layer);
    if (node) {
      node.setEnabled(visible);
      for (const m of node.getChildMeshes()) {
        m.isVisible = visible;
      }
    }
  }

  function isLayerVisible(layer: number): boolean {
    return layers.get(layer)?.isEnabled() ?? true;
  }

  const totalMeshes = foregroundMeshes.length+distantCount;

  return {
    root,
    layers,
    setLayerVisible,
    isLayerVisible,
    update,
    stats: {
      totalMeshes,
      existingSceneMeshes:existingMeshes.length,
      layerCounts,
      submergedRocks: 0,
      foregroundElements: foregroundMeshes.length,
      midgroundHeadlands: 0,
      distantPeaks: distantCount
    },
    dispose() {
      root.dispose();
      distantMat.dispose();
      foregroundMat?.dispose();
    }
  };
}

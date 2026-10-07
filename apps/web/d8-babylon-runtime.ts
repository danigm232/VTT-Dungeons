import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { SpotLight } from '@babylonjs/core/Lights/spotLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js';
import { Scene } from '@babylonjs/core/scene.js';

// Loaded only when the private D8 campaign opens. Other campaigns retain their
// smaller, existing Babylon import graph. The standalone Playground supplies
// GUI itself; the embedded VTT intentionally has its own DM/player interface.
export const d8BabylonRuntime = {
  ArcRotateCamera, Color3, Color4, DefaultRenderingPipeline, DirectionalLight,
  DynamicTexture, GlowLayer, HemisphericLight, ImageProcessingConfiguration,
  KeyboardEventTypes, Material, Mesh, MeshBuilder, PointLight, Ray, Scene,
  ShadowGenerator, SpotLight, SSAO2RenderingPipeline, StandardMaterial, Texture,
  TransformNode, Vector3, VertexData
};

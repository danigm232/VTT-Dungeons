import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { weatheredBoneMaterial } from './engine/client/wreck-bone-material.js';

const engine = new NullEngine();
const scene = new Scene(engine);
const mat = weatheredBoneMaterial(scene, 'test-mat');
console.log('Texture diffuse width:', mat.diffuseTexture?.getSize().width);
console.log('Texture bump name:', mat.bumpTexture?.name);
console.log('Test completed successfully.');

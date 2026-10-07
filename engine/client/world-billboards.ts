import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import type { Scene } from '@babylonjs/core/scene.js';

export type BillboardFrame = {
  url: string; sourceWidth: number; sourceHeight: number;
  /** Pixi already rasterizes SVGs at their authored dimensions, with alpha. */
  sourceCanvas?: CanvasImageSource;
  x: number; y: number; width: number; height: number;
  worldWidth: number; worldHeight: number; anchorX: number; anchorY: number;
  offsetX: number; offsetY: number; flipX: boolean; alpha: number; tint: number;
};
type Layer = { mesh: Mesh; material: StandardMaterial; key: string };
type Actor = { body: Layer; ghost: Layer; shadow: Mesh; ring: Mesh };

/** UVs use the atlas' actual pixel dimensions and stay inside its frame.
 * The half-pixel inset prevents neighbouring poses leaking into an edge. */
export function billboardUVs(frame: BillboardFrame) {
  let left = (frame.x + .5) / frame.sourceWidth, right = (frame.x + frame.width - .5) / frame.sourceWidth;
  const bottom = 1 - (frame.y + frame.height - .5) / frame.sourceHeight, top = 1 - (frame.y + .5) / frame.sourceHeight;
  if (frame.flipX) [left, right] = [right, left];
  return [left, bottom, right, bottom, right, top, left, top];
}

export function billboardCenter(ground: Vector3, right: Vector3, up: Vector3, frame: BillboardFrame) {
  return ground.add(right.scale(frame.offsetX + (.5 - frame.anchorX) * frame.worldWidth))
    .add(up.scale(frame.offsetY + (frame.anchorY - .5) * frame.worldHeight));
}

const contactShadow = 'actor:contact-shadow';
function paintedTexture(url: string, scene: Scene, frame?: BillboardFrame): Texture {
  if (frame?.sourceCanvas) {
    const canvas = scene.getEngine().createCanvas(frame.sourceWidth, frame.sourceHeight);
    const context = canvas.getContext('2d')!;
    context.drawImage(frame.sourceCanvas, 0, 0, frame.sourceWidth, frame.sourceHeight);
    const pixels = context.getImageData(0, 0, frame.sourceWidth, frame.sourceHeight).data;
    return RawTexture.CreateRGBATexture(pixels, frame.sourceWidth, frame.sourceHeight, scene, false, true, Texture.NEAREST_SAMPLINGMODE);
  }
  if (url !== contactShadow) return new Texture(url, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
  const texture = new DynamicTexture(contactShadow, { width: 64, height: 64 }, scene, false, Texture.BILINEAR_SAMPLINGMODE);
  const context = texture.getContext(), gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(0,0,0,.55)'); gradient.addColorStop(.55, 'rgba(0,0,0,.22)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); texture.update();
  return texture;
}

/** Animated painted cards share the scenery's depth buffer. Textures are
 * shared by atlas; changing a pose updates eight UV numbers, not a canvas. */
export class WorldBillboards {
  private actors = new Map<string, Actor>();
  private textures = new Map<string, Texture>();
  constructor(private scene: Scene, private textureFactory = (url: string, frame?: BillboardFrame) => paintedTexture(url, scene, frame)) {}
  get count() { return this.actors.size; }
  private texture(url: string, frame?: BillboardFrame) {
    let texture = this.textures.get(url);
    if (!texture) {
      texture = this.textureFactory(url, frame); texture.hasAlpha = true;
      texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
      this.textures.set(url, texture);
    }
    return texture;
  }
  private layer(id: string, ghost: boolean): Layer {
    const mesh = MeshBuilder.CreatePlane(`actor:${id}:${ghost ? 'blend' : 'body'}`, { size: 1, updatable: true }, this.scene);
    const material = new StandardMaterial(`${mesh.name}:paint`, this.scene);
    material.disableLighting = true; material.emissiveColor = Color3.White(); material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND; material.alphaCutOff = .03;
    material.useAlphaFromDiffuseTexture = true;
    // Alpha-tested pixels write depth in the color pass. A separate prepass
    // can reuse an unmasked shader and leave black rectangles around SVGs.
    material.forceDepthWrite = !ghost;
    mesh.material = material; mesh.isPickable = !ghost;
    mesh.metadata = { entityId: id, nativeBillboard: true, tokenOccluder: false };
    this.scene.getGlowLayerByName?.('glow')?.addExcludedMesh(mesh);
    return { mesh, material, key: '' };
  }
  private create(id: string): Actor {
    const body = this.layer(id, false), ghost = this.layer(id, true);
    const shadow = MeshBuilder.CreateGround(`actor:${id}:contact`, { width: 1, height: 1 }, this.scene);
    const shadowMaterial = new StandardMaterial(`${shadow.name}:paint`, this.scene);
    shadowMaterial.diffuseTexture = this.texture(contactShadow); shadowMaterial.useAlphaFromDiffuseTexture = true;
    shadowMaterial.disableLighting = true; shadowMaterial.emissiveColor = Color3.Black(); shadowMaterial.alpha = .55;
    shadowMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
    shadow.material = shadowMaterial; shadow.isPickable = false;
    const ring = MeshBuilder.CreateTorus(`actor:${id}:selection`, { diameter: 1.05, thickness: .025, tessellation: 32 }, this.scene);
    const ringMaterial = new StandardMaterial(`${ring.name}:paint`, this.scene);
    ringMaterial.disableLighting = true; ringMaterial.emissiveColor = Color3.FromHexString('#ffd36a'); ringMaterial.alpha = .85;
    ring.material = ringMaterial; ring.isPickable = false;
    for (const mesh of [shadow, ring]) { mesh.metadata = { tokenOccluder: false }; this.scene.getGlowLayerByName?.('glow')?.addExcludedMesh(mesh); }
    const actor = { body, ghost, shadow, ring }; this.actors.set(id, actor); return actor;
  }
  private updateLayer(layer: Layer, frame: BillboardFrame | null, ground: Vector3, camera: Camera, visible: boolean) {
    layer.mesh.setEnabled(Boolean(frame && visible && frame.alpha > .001));
    if (!frame) return;
    const key = [frame.url, frame.x, frame.y, frame.width, frame.height, frame.flipX].join(':');
    if (layer.key !== key) {
      const texture = this.texture(frame.url, frame);
      // The PNG alpha is opacity, not its RGB luminance. An opacity texture
      // here discarded dark clothes/skin and left a speckled white silhouette.
      // A newly requested pose can still be uploading to the GPU. Keep the
      // previous painted pose until it is ready, but continue moving the card
      // below: neither invisible frames nor a frozen-then-teleporting body.
      if(texture.isReady()||!layer.key){
        layer.material.diffuseTexture = texture;
        layer.material.emissiveTexture = texture;
        layer.material.diffuseColor=Color3.Black();
        layer.material.opacityTexture = null;
        layer.mesh.updateVerticesData(VertexBuffer.UVKind, billboardUVs(frame)); layer.key = key;
      }
    }
    layer.material.alpha = frame.alpha;
    layer.material.emissiveColor.copyFrom(Color3.FromInts(frame.tint >> 16 & 255, frame.tint >> 8 & 255, frame.tint & 255));
    layer.mesh.scaling.set(frame.worldWidth, frame.worldHeight, 1);
    layer.mesh.rotationQuaternion ??= Quaternion.Identity();
    // Upright cylindrical billboards: a camera-facing card used to lean its
    // head backwards into tables, roofs and walls when the camera tilted.
    const right = camera.getDirection(Vector3.Right()); right.y = 0; right.normalize();
    const up = Vector3.Up(), forward = Vector3.Cross(right, up);
    layer.mesh.rotationQuaternion.copyFrom(Quaternion.RotationQuaternionFromAxis(right, up, forward));
    layer.mesh.position.copyFrom(billboardCenter(ground, right, up, frame));
  }
  sync(id: string, ground: Vector3, camera: Camera, body: BillboardFrame | null, ghost: BillboardFrame | null, visible: boolean, selected: boolean) {
    const actor = this.actors.get(id) ?? this.create(id);
    this.updateLayer(actor.body, body, ground, camera, visible);
    // A tiny shift toward the camera keeps blend poses coplanar without z-fighting.
    const blendPoint = ground.subtract(camera.getForwardRay().direction.scale(.002));
    this.updateLayer(actor.ghost, ghost, blendPoint, camera, visible);
    actor.shadow.position.copyFrom(ground); actor.shadow.position.y += .008;
    actor.shadow.scaling.set(Math.max(.5, Math.min(1.2, body?.worldWidth ?? .8)), 1, .65);
    actor.shadow.setEnabled(visible && Boolean(body));
    actor.ring.position.copyFrom(ground); actor.ring.position.y += .018; actor.ring.setEnabled(visible && selected);
  }
  pick(ray: Ray) {
    const hit = this.scene.pickWithRay(ray, mesh => mesh.metadata?.nativeBillboard === true && mesh.isPickable && mesh.isEnabled() && (mesh.material?.alpha ?? 0) > .1);
    return hit?.hit ? String(hit.pickedMesh!.metadata.entityId) : undefined;
  }
  remove(id: string) {
    const actor = this.actors.get(id); if (!actor) return;
    for (const mesh of [actor.body.mesh, actor.ghost.mesh, actor.shadow, actor.ring]) { mesh.material?.dispose(false, false); mesh.dispose(); }
    this.actors.delete(id);
  }
  dispose() { for (const id of [...this.actors.keys()]) this.remove(id); for (const texture of this.textures.values()) texture.dispose(); this.textures.clear(); }
}

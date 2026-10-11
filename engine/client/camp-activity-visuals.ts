import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/core/Culling/ray.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { PublicSceneDefinition } from '../shared/campaign.js';
import type { CampRestState } from '../shared/camp-rest.js';
import type { PublicEntity } from '../shared/protocol.js';
import { campActivities, campPointInReach, type CampActivityId } from '../shared/camp-activities.js';
import { animateInteractionPart, interactionContact, interactionParts, interactionTiming, restoreInteractionPart, type InteractionPart } from './interaction-animation.js';
type Effect = { key: string; root: TransformNode; meshes: Mesh[]; materials: StandardMaterial[]; id: CampActivityId; at: number; actor: string; object: Vector3 };
const activityKey = (entry: CampRestState['interactions'][number]) => `${entry.characterId}:${entry.at}:${entry.pointId}:${entry.activityId}`;
const facingVectors = { north: [0, -1], 'north-east': [1, -1], east: [1, 0], 'south-east': [1, 1], south: [0, 1], 'south-west': [-1, 1], west: [-1, 0], 'north-west': [-1, -1] } as const;

/** Code-native props, not flat HUD stickers: scenery occludes every effect. */
export class CampActivityVisuals {
  private effects = new Map<string, Effect>();
  private cancelled = new Set<string>();
  private touched = new Set<InteractionPart>();
  constructor(private scene: Scene, private definition: PublicSceneDefinition) {}
  current(now: number, actor: PublicEntity, interactions: CampRestState['interactions'], combat: boolean) {
    const entry = [...interactions].reverse().find(entry => entry.characterId === actor.id);
    if (!entry?.activityId || !campActivities[entry.activityId]) return null;
    const id = entry.activityId, point = this.definition.camp?.interactionPoints.find(p => p.id === entry.pointId);
    if (!point) return null;
    const key = activityKey(entry);
    if (combat || actor.sceneId !== this.definition.id || actor.moving || actor.step || actor.defeated || actor.conditions?.some(c => ['inconsciente', 'paralizada'].includes(c)) || !campPointInReach(actor, point)) this.cancelled.add(key);
    const timing = interactionTiming(now - entry.at, campActivities[id].durationMs);
    return !this.cancelled.has(key) && timing.active ? { entry, id, timing, contact: interactionContact(this.scene, point.id, id) } : null;
  }
  private create(entry: CampRestState['interactions'][number], id: CampActivityId) {
    const point = this.definition.camp!.interactionPoints.find(p => p.id === entry.pointId)!;
    const bound = interactionParts(this.scene, point.id).length > 0;
    const cell = point.objectCell ?? point.cell, tile = this.definition.terrain?.tileMeters ?? 1.5;
    const root = new TransformNode(`camp-activity:${entry.characterId}`, this.scene);
    const effect: Effect = { key: activityKey(entry), root, meshes: [], materials: [], id, at: entry.at, actor: entry.characterId, object: new Vector3((cell.col + .5) * tile, 0, (cell.row + .5) * tile) };
    const mat = (name: string, hex: string, glow = false) => {
      const material = new StandardMaterial(root.name + ':' + name, this.scene);
      material.diffuseColor = Color3.FromHexString(hex); material.specularColor = Color3.Black();
      if (glow) material.emissiveColor = material.diffuseColor.scale(.7);
      effect.materials.push(material); return material;
    };
    const attach = (mesh: Mesh, material: StandardMaterial) => {
      mesh.parent = root; mesh.material = material; mesh.isPickable = false;
      mesh.metadata = { campActivity: id, tokenOccluder: false }; effect.meshes.push(mesh); return mesh;
    };
    const brass = mat('brass', '#d9ad5b'), paper = mat('paper', '#edddb3'), wood = mat('wood', '#704729');
    if (id === 'study' && !bound) {
      for (const side of [-1, 1]) {
        const page = attach(MeshBuilder.CreateBox(root.name + ':page', { width: .22, height: .012, depth: .3 }, this.scene), paper);
        page.position.x = side * .11; page.rotation.z = side * .22;
      }
      attach(MeshBuilder.CreateBox(root.name + ':cover', { width: .46, height: .024, depth: .33 }, this.scene), wood).position.y = -.025;
    } else if ((id === 'tools' || id === 'inspect') && !bound) {
      for (let i = 0; i < 3; i++) {
        const tool = attach(MeshBuilder.CreateBox(root.name + ':tool', { width: .025, height: .23, depth: .025 }, this.scene), brass);
        tool.position.x = (i - 1) * .085; tool.rotation.z = (i - 1) * .4;
      }
    } else if (id === 'pray' && !bound) {
      attach(MeshBuilder.CreateTorus(root.name + ':symbol', { diameter: .2, thickness: .025, tessellation: 24 }, this.scene), brass).rotation.x = Math.PI / 2;
      attach(MeshBuilder.CreateBox(root.name + ':symbol-stem', { width: .023, height: .27, depth: .023 }, this.scene), brass);
    } else if (id === 'cook') {
      if (!bound) attach(MeshBuilder.CreateCylinder(root.name + ':spoon', { height: .48, diameter: .025, tessellation: 6 }, this.scene), wood).rotation.z = .65;
      const mist = mat('steam', '#d8e6e6', true); mist.alpha = .32;
      for (let i = 0; i < 7; i++) attach(MeshBuilder.CreateSphere(root.name + ':steam', { diameter: .09, segments: 6 }, this.scene), mist);
    } else if (id === 'warm' || id === 'tend-fire') {
      const ember = mat('embers', '#ffc271', true);
      for (let i = 0; i < 9; i++) attach(MeshBuilder.CreateSphere(root.name + ':ember', { diameter: .025, segments: 4 }, this.scene), ember);
      if (id === 'tend-fire' && !bound) attach(MeshBuilder.CreateCylinder(root.name + ':poker', { height: .65, diameter: .028, tessellation: 6 }, this.scene), wood).rotation.z = .8;
    } else if ((id === 'prepare-bed' || id === 'shelter' || id === 'rest') && !bound) {
      const cloth = mat('linen', id === 'shelter' ? '#bba37d' : '#75856b');
      attach(MeshBuilder.CreateBox(root.name + ':blanket', { width: .58, height: .045, depth: 1.1 }, this.scene), cloth);
      if (id === 'rest') attach(MeshBuilder.CreateBox(root.name + ':pillow', { width: .35, height: .1, depth: .2 }, this.scene), paper).position.set(0, .06, -.35);
    } else if (id === 'guard' && !bound) {
      attach(MeshBuilder.CreateCylinder(root.name + ':lantern', { height: .18, diameter: .13, tessellation: 8 }, this.scene), brass);
      const glass = mat('lantern-glass', '#ffd788', true);
      attach(MeshBuilder.CreateSphere(root.name + ':light', { diameter: .095, segments: 8 }, this.scene), glass).position.y = .04;
    }
    this.effects.set(entry.characterId, effect); return effect;
  }
  update(now: number, interactions: CampRestState['interactions'], entities: PublicEntity[], position: (entity: PublicEntity) => Vector3, height: (entity: PublicEntity) => number, combat: boolean) {
    for (const part of this.touched) restoreInteractionPart(part);
    this.touched.clear();
    const latest = new Map<string, CampRestState['interactions'][number]>();
    for (const entry of interactions) latest.set(entry.characterId, entry);
    const keys = new Set([...latest.values()].map(activityKey));
    for (const key of this.cancelled) if (!keys.has(key)) this.cancelled.delete(key);
    for (const [actor, entry] of latest) {
      const entity = entities.find(e => e.id === actor), point = this.definition.camp?.interactionPoints.find(p => p.id === entry.pointId);
      if (combat || !entity || entity.moving || entity.step || entity.defeated || entity.conditions?.some(c => ['inconsciente', 'paralizada'].includes(c)) || (point && !campPointInReach(entity, point))) this.cancelled.add(activityKey(entry));
    }
    for (const [actor, effect] of this.effects) {
      const entry = latest.get(actor), entity = entities.find(e => e.id === actor);
      if (entity?.moving || entity?.step || combat || entity?.defeated || entity?.conditions?.some(c => ['inconsciente', 'paralizada'].includes(c))) this.cancelled.add(effect.key);
      if (!entry || effect.key !== activityKey(entry) || !entity || this.cancelled.has(effect.key) || now - effect.at >= campActivities[effect.id].durationMs) this.remove(actor);
    }
    if (combat) return;
    const handled = new Set<string>();
    // Single deterministic owner per real prop; several actors may still warm
    // their hands around the same fire without cancelling each other's poses.
    const ordered = [...latest].sort((a, b) => b[1].at - a[1].at || a[0].localeCompare(b[0]));
    for (const [actor, entry] of ordered) {
      const id = entry.activityId, entity = entities.find(e => e.id === actor), point = this.definition.camp?.interactionPoints.find(p => p.id === entry.pointId);
      if (this.cancelled.has(activityKey(entry))) continue;
      if (!id || !entity || !point || entity.moving || entity.step || entity.defeated || entity.conditions?.some(c => ['inconsciente', 'paralizada'].includes(c)) || now < entry.at || now - entry.at >= campActivities[id].durationMs) continue;
      // Do not replay at the destination after movement cancelled an activity.
      if (!campPointInReach(entity, point)) continue;
      if (id === 'sit') continue;
      if (id === 'chest-toggle') {
        // The object state is authoritative and persists. Only its transition
        // shares the actor's clock; cancelling a gesture never undoes opening.
        const t=interactionTiming(now-entry.at,campActivities[id].durationMs).t;
        const p=Math.max(0,Math.min(1,(t-.18)/.72)), eased=p*p*(3-2*p);
        for(const part of interactionParts(this.scene,point.id))if(part.role==='chest-lid')part.mesh.rotation.x=-.92*(entry.action==='opened'?eased:1-eased);
        continue;
      }
      if (!handled.has(point.id)) {
        const timing = interactionTiming(now - entry.at, campActivities[id].durationMs);
        const origin=position(entity),contact=interactionContact(this.scene,point.id,id),h=height(entity),tile=this.definition.terrain?.tileMeters??1.5;
        const [fx,fz]=facingVectors[entity.facing],length=Math.hypot(fx,fz),dx=(contact?.x??origin.x)-origin.x,dz=(contact?.z??origin.z)-origin.z,distance=Math.hypot(dx,dz);
        const shift=Math.max(0,Math.min(tile*.35,distance-h*.35))*timing.reach;
        const hand=new Vector3(origin.x+(distance?dx/distance*shift:0)+fx/length*h*.18,origin.y+h*.46,origin.z+(distance?dz/distance*shift:0)+fz/length*h*.18);
        for (const part of interactionParts(this.scene, point.id)) { animateInteractionPart(part, id, timing,hand); this.touched.add(part); }
        handled.add(point.id);
      }
      const effect = this.effects.get(actor) ?? this.create(entry, id), t = (now - entry.at) / 1000;
      const ground = position(entity), h = height(entity), fade = Math.min(1, t * 4, (campActivities[id].durationMs / 1000 - t) * 3);
      effect.root.position.copyFrom(ground);
      if (['cook', 'tend-fire', 'warm'].includes(id)) effect.root.position.set(effect.object.x, ground.y + .55, effect.object.z);
      else if (['prepare-bed', 'shelter', 'rest'].includes(id)) effect.root.position.set(effect.object.x, ground.y + .12, effect.object.z);
      else effect.root.position.y += h * .58;
      const contact = interactionContact(this.scene, point.id, id);
      if (contact && ['cook', 'tend-fire', 'warm'].includes(id)) effect.root.position.copyFrom(contact);
      // Held props belong in front of the actor, not in front of the camera.
      // When looking at their back, the painted body correctly hides the prop.
      if (['study', 'pray', 'tools', 'inspect', 'guard'].includes(id)) {
        const [dx, dz] = facingVectors[entity.facing], length = Math.hypot(dx, dz);
        effect.root.position.x += dx / length * .22;
        effect.root.position.z += dz / length * .22;
        effect.root.rotation.y = Math.atan2(dx, dz);
      }
      const flameParts=interactionParts(this.scene,point.id).filter(part=>part.role==='flame');
      const coldHearth=flameParts.length>0&&!flameParts.some(part=>part.mesh.isVisible&&part.mesh.visibility>.01);
      effect.meshes.forEach((mesh, i) => {
        mesh.visibility = Math.max(0, fade);
        if(mesh.name.endsWith(':ember')&&coldHearth)mesh.visibility=0;
        if (mesh.name.endsWith(':steam') || mesh.name.endsWith(':ember')) {
          const phase = (t * .65 + i * .17) % 1;
          mesh.position.set(Math.sin(i * 2.4 + t) * .22, phase * .85, Math.cos(i * 2.4 + t) * .22);
          mesh.visibility *= (1 - phase); mesh.scaling.setAll(mesh.name.endsWith(':steam') ? .5 + phase : 1);
        } else if (mesh.name.endsWith(':spoon') || mesh.name.endsWith(':poker')) {
          mesh.position.x = Math.sin(t * 5) * .12; mesh.rotation.z = .65 + Math.cos(t * 5) * .18;
        } else if (mesh.name.endsWith(':page')) mesh.rotation.z = (i === 0 ? -1 : 1) * (.2 + Math.sin(t * 3) * .09);
        else if (mesh.name.endsWith(':tool')) mesh.rotation.z = Math.sin(t * 4 + i) * .4;
        else if (mesh.name.endsWith(':symbol')) mesh.scaling.setAll(1 + Math.sin(t * 2) * .08);
        else if (mesh.name.endsWith(':lantern') || mesh.name.endsWith(':light')) mesh.position.x = Math.sin(t * 1.7) * .12;
        else if (mesh.name.endsWith(':blanket')) {
          mesh.scaling.z = id === 'rest' ? 1 : .3 + .7 * Math.min(1, t / 2);
          mesh.scaling.y = id === 'rest' ? 1 + Math.sin(t * 2) * .025 : 1;
        }
      });
    }
    for (const entity of entities) {
      if (!entity.seatId || entity.moving || entity.step || entity.defeated || entity.conditions?.some(c => ['inconsciente', 'paralizada'].includes(c))) continue;
      const point = this.definition.camp?.interactionPoints.find(p => p.kind === 'seat' && this.definition.seats?.some(s => s.id === entity.seatId && s.cell.col === p.cell.col && s.cell.row === p.cell.row));
      if (point) for (const part of interactionParts(this.scene, point.id)) {
        animateInteractionPart(part, 'sit', { t: .5, seconds: now / 1000, reach: 1, work: 1, active: true }); this.touched.add(part);
      }
    }
  }
  private remove(actor: string) {
    const effect = this.effects.get(actor); if (!effect) return;
    effect.root.dispose(false); effect.materials.forEach(mat => mat.dispose()); this.effects.delete(actor);
  }
  dispose() { for (const part of this.touched) restoreInteractionPart(part); this.touched.clear(); for (const actor of [...this.effects.keys()]) this.remove(actor); }
}

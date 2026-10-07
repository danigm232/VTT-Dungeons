import { z } from 'zod';
import { terrainSchema } from './terrain.js';

export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,39}$/);
export const sceneIdSchema = idSchema;
export const cellSchema = z.object({ col: z.number().int().min(0).max(255), row: z.number().int().min(0).max(255) }).strict();
export const rotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
export type Cell = z.infer<typeof cellSchema>;
export type Rotation = z.infer<typeof rotationSchema>;

const gridSchema = z.object({
  cols: z.number().int().min(1).max(256), rows: z.number().int().min(1).max(256),
  tileSize: z.number().int().min(8).max(256), originX: z.number().int().min(-4096).max(4096), originY: z.number().int().min(-4096).max(4096),
  width: z.number().int().positive().max(65536), height: z.number().int().positive().max(65536),
  worldOrigin: z.object({x:z.number().finite(),z:z.number().finite()}).strict().optional()
}).strict();

const commonProp = {
  id: idSchema, label: z.string().min(1).max(80), cell: cellSchema, assetId: idSchema,
  surfaceId: idSchema.optional(),
  renderedByScene: z.boolean().optional(),
  sourceKind: z.enum(['official', 'adaptation', 'addition']).default('addition'), sourceRef: z.string().max(160).optional()
};
const footprintSchema = z.array(cellSchema).min(1).max(16);
const capabilitiesSchema = z.object({ transform: z.boolean(), detach: z.boolean(), structure: z.boolean() }).strict();
export const propDefinitionSchema = z.discriminatedUnion('kind', [
  z.object({ ...commonProp, kind: z.literal('wheel'), baseFootprint: footprintSchema, allowedRotations: z.array(rotationSchema).min(1).max(4), rotation: rotationSchema.default(0), initialState: z.literal('upright').default('upright'), capabilities: capabilitiesSchema, mount: z.object({ cell: cellSchema, footprint: footprintSchema, assetId: idSchema }).strict() }).strict(),
  z.object({ ...commonProp, kind: z.literal('door'), baseFootprint: footprintSchema, allowedRotations: z.array(rotationSchema).min(1).max(4), rotation: rotationSchema.default(0), initialState: z.enum(['open', 'closed']).default('closed'), capabilities: capabilitiesSchema }).strict(),
  z.object({ ...commonProp, kind: z.literal('crate'), baseFootprint: footprintSchema, allowedRotations: z.array(rotationSchema).min(1).max(4), rotation: rotationSchema.default(0), capabilities: capabilitiesSchema }).strict()
]);
export type PropDefinition = z.infer<typeof propDefinitionSchema>;

const pickupSchema = z.object({ id: idSchema, label: z.string().min(1).max(80), cell: cellSchema, surfaceId: idSchema, item: z.string().min(1).max(100), kind: z.enum(['unlit-torch', 'treasure']), unlockObjectId: idSchema.optional() }).strict();
export type PickupDefinition = z.infer<typeof pickupSchema>;

const campPointSchema = z.object({
  id: idSchema, label: z.string().min(1).max(80), kind: z.enum(['bed', 'tent', 'fire', 'seat', 'guard', 'chest', 'personal']),
  cell: cellSchema, objectCell: cellSchema.optional(), surfaceId: idSchema, description: z.string().min(1).max(240),
  ownerCharacterId: idSchema.optional()
}).strict();
const campSceneSchema = z.object({
  visualProfile: z.enum(['rooms', 'forest', 'wreck-beach', 'cliff-observatory', 'coastal-refuge']),
  canonStatus: z.enum(['canon', 'vtt-ambience']),
  safetyNotice: z.string().min(1).max(240),
  interactionPoints: z.array(campPointSchema).min(1).max(40)
}).strict();

export const publicSceneSchema = z.object({
  id: sceneIdSchema, title: z.string().min(1).max(100), surfaceId: idSchema, movementEnabled: z.boolean(), background: z.string().regex(/^\/art\/[\p{L}\p{N}._,/ &-]+$/u),
  grid: gridSchema, walkable: z.array(cellSchema).max(65_536), spawns: z.array(cellSchema).min(1).max(20), props: z.array(propDefinitionSchema).max(100), waves: z.boolean().default(false),
  pickups: z.array(pickupSchema).max(30).optional(),
  readableSigns: z.array(z.object({ id: idSchema, label: z.string().max(80), cell: cellSchema, text: z.string().max(500) }).strict()).max(20).optional(),
  seats: z.array(z.object({id:idSchema,label:z.string().min(1).max(80),cell:cellSchema,surfaceId:idSchema,position:z.object({x:z.number().finite(),z:z.number().finite(),height:z.number().finite().min(0).max(3)}).strict(),facing:z.enum(['north','east','south','west']),reservedActorId:idSchema.optional()}).strict()).max(80).optional(),
  movementHazards: z.array(z.object({ id: idSchema, label: z.string().max(120), cells: z.array(cellSchema).max(65_536), consequence: z.literal('fatal-cold') }).strict()).max(20).optional(),
  /** Physical obstructions are distinct from water, darkness and walkability. */
  effectWalls: z.array(z.object({ minCol: z.number().finite(), maxCol: z.number().finite(), minRow: z.number().finite(), maxRow: z.number().finite() }).strict().refine(box => box.minCol <= box.maxCol && box.minRow <= box.maxRow)).max(200).optional(),
  difficultCells: z.array(cellSchema).max(65_536).optional(),
  renderer: z.enum(['pixi', 'babylon-hd2d', 'babylon-d8']).optional(),
  access: z.enum(['public', 'authorized']).optional(),
  terrain: terrainSchema.optional(),
  /** Optional data for camp/rest scenes; the same system can coexist with an adventure pack. */
  camp: campSceneSchema.optional(),
  visibility: z.object({ darkness: z.number().finite().min(0).max(1).default(0), manualReveal: z.boolean().default(false) }).strict().optional(),
  // Scenic characters are always public and never participate in collision or DM commands.
  stageActors: z.array(z.object({ id: idSchema, label: z.string().min(1).max(80), tokenId: idSchema,
    cell: cellSchema, surfaceId: idSchema.optional(), seatedAt: z.object({x:z.number().finite(),z:z.number().finite()}).strict().optional(), idleAnimation:idSchema.optional() }).strict()).max(30).optional()
}).strict();
export type PublicSceneDefinition = z.infer<typeof publicSceneSchema>;

// Los nombres de arte proceden de la mesa y pueden incluir español, espacios
// o comas; el patrón sigue limitándolos al directorio público de arte.
const artUrlSchema = z.string().regex(/^\/art\/[\p{L}\p{N}._,/ &-]+$/u);
const visualAssetSchema = z.object({
  url: artUrlSchema, logicalWidth: z.number().positive().max(2048), logicalHeight: z.number().positive().max(2048),
  /** Physical upright height used to size 2D tokens over an orthographic 3D map. */
  worldHeightMeters: z.number().positive().max(20).optional(),
  anchorX: z.number().min(0).max(1), anchorY: z.number().min(0).max(1),
  sortOffsetY: z.number().int().min(-2048).max(2048).optional(),
  portraitUrl: artUrlSchema.optional()
}).strict();
const propAssetSchema = z.object({ variants: z.record(z.string(), visualAssetSchema) }).strict();
const tokenAnimationSchema = z.object({
  frames: z.array(z.union([artUrlSchema, z.object({
    url: artUrlSchema, x: z.number().int().min(0), y: z.number().int().min(0),
    width: z.number().int().positive(), height: z.number().int().positive(),
    logicalWidth: z.number().positive().max(2048).optional(), logicalHeight: z.number().positive().max(2048).optional(),
    anchorY: z.number().min(0).max(1).optional(),
    anchorX: z.number().min(0).max(1).optional(),
    alphaSeeds: z.array(z.tuple([z.number().int().min(0),z.number().int().min(0)])).min(1).max(12).optional()
  }).strict()])).min(1).max(32), fps: z.number().positive().max(30).default(6), flipX: z.boolean().optional(),
  motion: z.enum(['jump', 'dodge', 'disengage', 'swim', 'climb']).optional()
}).strict();
const audioUrl = z.string().regex(/^\/audio\/[a-zA-Z0-9._/-]+$/);
const audioCategorySchema = z.enum(['movement', 'combat', 'magic', 'creature', 'object', 'scene']);
const audioLibraryItemSchema = z.object({
  id: idSchema, label: z.string().min(1).max(80), description: z.string().min(1).max(140), url: audioUrl,
  // The compact DM board groups one-shots by intent instead of exposing an
  // unhelpful folder full of source filenames. Optional for older campaigns.
  category: audioCategorySchema.optional(),
  // Only continuous textures belong in a loop control. A sword impact or a
  // scream is deliberately kept as a one-shot, even if the DM can replay it.
  loopable: z.boolean().optional(),
  // Effects driven by token movement or an animation stay available to the
  // runtime without adding a duplicate manual soundboard button. Missing
  // means manually available for backward compatibility.
  manual: z.boolean().optional()
}).strict();
const audioLibrarySchema = z.object({
  music: z.array(audioLibraryItemSchema).min(1).max(30),
  ambience: z.array(audioLibraryItemSchema).min(1).max(40),
  sfx: z.array(audioLibraryItemSchema).min(1).max(80)
}).strict();
const audioTrackProfileSchema = z.object({ id: idSchema, playing: z.boolean(), volume: z.number().finite().min(0).max(1) }).strict();
const audioSceneProfileSchema = z.object({
  music: audioTrackProfileSchema,
  layers: z.object({ ocean: audioTrackProfileSchema, wind: audioTrackProfileSchema, wood: audioTrackProfileSchema, storm: audioTrackProfileSchema }).strict(),
  // The soundboard starts with a short scene-specific set. The full library
  // stays available behind its filter instead of flooding the mobile console.
  recommendedSfx: z.array(idSchema).max(28).optional()
}).strict();

export const publicCampaignSchema = z.object({
  schemaVersion: z.literal(2), campaignId: idSchema, version: z.string().min(1).max(30), title: z.string().min(1).max(100), initialSceneId: sceneIdSchema,
  scenes: z.array(publicSceneSchema).min(1).max(100),
  roster: z.array(z.object({ id: idSchema, label: z.string().min(1).max(80), archetype: z.string().min(1).max(100), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), tokenId: idSchema }).strict()).min(1).max(20),
  tokens: z.record(idSchema, visualAssetSchema),
  // Optional frame sequences for a token.  Existing campaigns can continue to
  // use one still image, while animated characters choose a sequence by state.
  tokenAnimations: z.record(idSchema, z.record(idSchema, tokenAnimationSchema)).default({}),
  props: z.record(idSchema, propAssetSchema),
  audio: z.object({
    music: audioUrl,
    layers: z.object({ ocean: audioUrl, wind: audioUrl, wood: audioUrl, storm: audioUrl }).strict(),
    sfx: z.object({ thunder: audioUrl, creak: audioUrl, impact: audioUrl }).strict(),
    layerLabels: z.object({ ocean: z.string().min(1).max(40), wind: z.string().min(1).max(40), wood: z.string().min(1).max(40), storm: z.string().min(1).max(40) }).strict().optional(),
    library: audioLibrarySchema.optional(),
    sceneProfiles: z.record(sceneIdSchema, audioSceneProfileSchema).optional()
  }).strict()
}).strict().superRefine((campaign, context) => {
  const unique = (values: string[], path: (string | number)[], label: string) => {
    if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', path, message: `${label}: IDs duplicados` });
  };
  unique(campaign.scenes.map(scene => scene.id), ['scenes'], 'Escenas');
  unique(campaign.roster.map(actor => actor.id), ['roster'], 'Personajes');
  const knownSfx = new Set(campaign.audio.library?.sfx.map(effect => effect.id) ?? []);
  for (const [sceneId, profile] of Object.entries(campaign.audio.sceneProfiles ?? {})) {
    if (!campaign.scenes.some(scene => scene.id === sceneId)) context.addIssue({ code: 'custom', path: ['audio', 'sceneProfiles', sceneId], message: 'Perfil de audio para escena inexistente' });
    profile.recommendedSfx?.forEach((effectId, index) => {
      if (!knownSfx.has(effectId)) context.addIssue({ code: 'custom', path: ['audio', 'sceneProfiles', sceneId, 'recommendedSfx', index], message: 'Efecto recomendado inexistente' });
    });
  }
  if (!campaign.scenes.some(scene => scene.id === campaign.initialSceneId)) context.addIssue({ code: 'custom', path: ['initialSceneId'], message: 'La escena inicial no existe' });
  for (const [sceneIndex, scene] of campaign.scenes.entries()) {
    unique(scene.props.map(prop => prop.id), ['scenes', sceneIndex, 'props'], 'Objetos');
    unique((scene.stageActors ?? []).map(actor => actor.id), ['scenes', sceneIndex, 'stageActors'], 'Personajes escénicos');
    unique((scene.pickups ?? []).map(pickup => pickup.id), ['scenes', sceneIndex, 'pickups'], 'Objetos recogibles');
    const inGrid = (cell: Cell) => cell.col < scene.grid.cols && cell.row < scene.grid.rows;
    scene.walkable.forEach((cell, index) => { if (!inGrid(cell)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'walkable', index], message: 'Celda fuera del mapa' }); });
    scene.spawns.forEach((cell, index) => { if (!inGrid(cell)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'spawns', index], message: 'Spawn fuera del mapa' }); });
    if (scene.camp) {
      unique(scene.camp.interactionPoints.map(point => point.id), ['scenes', sceneIndex, 'camp', 'interactionPoints'], 'Puntos de campamento');
      if (!scene.terrain || scene.renderer !== 'babylon-hd2d') context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'camp'], message: 'Campamento requiere terreno 3D' });
      scene.camp.interactionPoints.forEach((point, pointIndex) => {
        const surface = scene.terrain?.surfaces.find(candidate => candidate.id === point.surfaceId);
        const isApproachTile = surface?.tiles.some(tile => tile.cell.col === point.cell.col && tile.cell.row === point.cell.row);
        if (!inGrid(point.cell) || !isApproachTile || !scene.walkable.some(cell => cell.col === point.cell.col && cell.row === point.cell.row))
          context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'camp', 'interactionPoints', pointIndex, 'cell'], message: 'Punto de interacción sin suelo transitable' });
        if (!surface || surface.visualOnly) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'camp', 'interactionPoints', pointIndex, 'surfaceId'], message: 'Superficie transitable inexistente' });
        if (point.objectCell && !inGrid(point.objectCell)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'camp', 'interactionPoints', pointIndex, 'objectCell'], message: 'Objeto de interacción fuera del mapa' });
      });
    }
    scene.stageActors?.forEach((actor, index) => {
      if (!inGrid(actor.cell)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'stageActors', index, 'cell'], message: 'Actor fuera del mapa' });
      if (!campaign.tokens[actor.tokenId]) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'stageActors', index, 'tokenId'], message: 'Token desconocido' });
    });
    unique((scene.readableSigns??[]).map(sign=>sign.id),['scenes',sceneIndex,'readableSigns'],'Letreros');
    unique((scene.movementHazards??[]).map(hazard=>hazard.id),['scenes',sceneIndex,'movementHazards'],'Peligros');
    for(const [index,sign] of (scene.readableSigns??[]).entries())if(!inGrid(sign.cell)||!scene.walkable.some(cell=>cell.col===sign.cell.col&&cell.row===sign.cell.row))context.addIssue({code:'custom',path:['scenes',sceneIndex,'readableSigns',index,'cell'],message:'Letrero sin acceso transitable'});
    for(const [index,hazard] of (scene.movementHazards??[]).entries())for(const cell of hazard.cells)if(!inGrid(cell)||!scene.walkable.some(tile=>tile.col===cell.col&&tile.row===cell.row))context.addIssue({code:'custom',path:['scenes',sceneIndex,'movementHazards',index,'cells'],message:'Peligro fuera del suelo transitable'});
    for (const [propIndex, prop] of scene.props.entries()) {
      if (!inGrid(prop.cell)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'cell'], message: 'Objeto fuera del mapa' });
      if (prop.surfaceId && !scene.terrain?.surfaces.some(surface => surface.id === prop.surfaceId)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'surfaceId'], message: 'Superficie de objeto inexistente' });
      if (!campaign.props[prop.assetId]) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'assetId'], message: 'Asset de objeto desconocido' });
      {
        const keys = prop.baseFootprint.map(cell => `${cell.col},${cell.row}`);
        if (new Set(keys).size !== keys.length || Math.min(...prop.baseFootprint.map(cell => cell.col)) !== 0 || Math.min(...prop.baseFootprint.map(cell => cell.row)) !== 0) {
          context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'baseFootprint'], message: 'Huella duplicada o sin normalizar' });
        }
        if (!prop.allowedRotations.includes(prop.rotation)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'rotation'], message: 'Rotación inicial no permitida' });
        const variants = campaign.props[prop.assetId]?.variants;
        if (variants && prop.kind === 'door') {
          const required = prop.capabilities.structure ? ['intact:open', 'intact:closed', 'damaged:open', 'damaged:closed', 'destroyed'] : ['open', 'closed'];
          for (const key of required) if (!variants[key]) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: `Falta variante ${key}` });
        }
        if (variants && prop.kind === 'crate') {
          const structures = prop.capabilities.structure ? ['intact', 'damaged', 'destroyed'] : [''];
          for (const structure of structures) for (const rotation of prop.allowedRotations) {
            const key = structure ? `${structure}:${rotation}` : String(rotation);
            if (!variants[key]) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: `Falta variante ${key}` });
          }
        }
        if (prop.kind === 'wheel') {
          const mountVariants = campaign.props[prop.mount.assetId]?.variants;
          if (!mountVariants) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'mount', 'assetId'], message: 'Asset de soporte desconocido' });
          else if (!mountVariants.default) context.addIssue({ code: 'custom', path: ['props', prop.mount.assetId], message: 'Falta variante default del soporte' });
          if (!prop.capabilities.transform || !prop.capabilities.detach) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'capabilities'], message: 'El timón debe permitir transform y detach' });
          if (variants && prop.capabilities.structure) {
            for (const structure of ['intact', 'damaged'] as const) {
              if (!variants[`attached:${structure}`]) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: `Falta variante attached:${structure}` });
              for (const rotation of prop.allowedRotations) for (const state of ['caught', 'fallen'] as const) if (!variants[`detached:${state}:${structure}:${rotation}`]) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: `Falta variante detached:${state}:${structure}:${rotation}` });
            }
            for (const rotation of prop.allowedRotations) if (!variants[`debris:${rotation}`]) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: `Falta variante debris:${rotation}` });
          } else {
            for (const rotation of prop.allowedRotations) for (const state of ['caught', 'fallen'] as const) if (variants && !variants[`detached:${state}:${rotation}`]) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: `Falta variante detached:${state}:${rotation}` });
            if (variants && !variants.attached) context.addIssue({ code: 'custom', path: ['props', prop.assetId], message: 'Falta variante attached' });
          }
        }
        if (prop.kind === 'door' && (prop.capabilities.transform || prop.capabilities.detach)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'capabilities'], message: 'Capacidades ilegales para puerta' });
        if (prop.kind === 'crate' && (!prop.capabilities.transform || prop.capabilities.detach)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'props', propIndex, 'capabilities'], message: 'Capacidades ilegales para caja' });
      }
    }
    for (const [pickupIndex, pickup] of (scene.pickups ?? []).entries()) {
      const surface = scene.terrain?.surfaces.find(candidate => candidate.id === pickup.surfaceId);
      if (!inGrid(pickup.cell)) context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'pickups', pickupIndex, 'cell'], message: 'Objeto recogible fuera del mapa' });
      if (!surface || surface.visualOnly || !surface.tiles.some(tile => tile.cell.col === pickup.cell.col && tile.cell.row === pickup.cell.row))
        context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'pickups', pickupIndex, 'surfaceId'], message: 'Objeto recogible sin suelo transitable en esa superficie' });
      if (pickup.unlockObjectId && !scene.props.some(prop => prop.id === pickup.unlockObjectId && prop.kind === 'door'))
        context.addIssue({ code: 'custom', path: ['scenes', sceneIndex, 'pickups', pickupIndex, 'unlockObjectId'], message: 'El acceso del objeto recogible debe ser una puerta existente' });
    }
  }
  campaign.roster.forEach((actor, index) => { if (!campaign.tokens[actor.tokenId]) context.addIssue({ code: 'custom', path: ['roster', index, 'tokenId'], message: 'Token desconocido' }); });
});
export type PublicCampaignDefinition = z.infer<typeof publicCampaignSchema>;
export type VisualAsset = z.infer<typeof visualAssetSchema>;

export function validatePublicCampaign(value: unknown): PublicCampaignDefinition {
  const result = publicCampaignSchema.safeParse(value);
  if (result.success) return result.data;
  throw new Error(`Campaña pública inválida:\n${z.prettifyError(result.error)}`);
}
